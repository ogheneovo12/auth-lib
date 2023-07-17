import { Router, Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { Extractor } from "./helpers/extractors";
import { createClient, RedisClientType } from "redis";
import { Schema, Repository, EntityId } from "redis-om";
import { v4 } from "uuid";
import argon2 from "argon2";
import ms from "ms";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

enum TokenType {
  REFRESH = "refresh",
  ACCESS = "access",
}

type JWT_CONFIG = {
  refreshTokenSecret: string;
  accessTokenSecret: string;
  expiresIn: {
    refresh: string;
    access: string;
  };
  issuer: string;
  audience: string | string[];
};

export type TokenSchema = {
  sub: string;
  hashedToken: string;
  type: TokenType;
  expires_in: string;
};
const tokenSchema = new Schema(
  "tokens",
  {
    sub: { type: "string" },
    hashedToken: { type: "string" },
    type: { type: "string" },
    expires_in: { type: "string" },
  },
  {
    dataStructure: "HASH",
  }
);

export type AuthInitProps = {
  jwtConfig: JWT_CONFIG;
  redisUrl: string;
  authRoute?: string;
  mapUserToJwtPayload: (
    user: any
  ) => { sub: string } & { [index: string]: any };
};

enum ALLOWED_ROUTES {
  LOGIN = "login",
  REGISTER = "register",
  LOGOUT = "logout",
  USER = "user",
  REFRESH = "refresh",
}

type ValidateFn = (body: any, done: (user: any, err: any) => void) => void;

const defaultInitProps: AuthInitProps = {
  redisUrl: "",
  authRoute: "/auth",
  mapUserToJwtPayload: () => ({
    sub: "",
  }),
  jwtConfig: {
    accessTokenSecret: "",
    refreshTokenSecret: "",
    expiresIn: {
      refresh: "1d",
      access: "7d",
    },
    issuer: "",
    audience: "",
  },
};

export class AuthLib {
  private jwtConfig: JWT_CONFIG = defaultInitProps.jwtConfig;
  private redis: RedisClientType | undefined;
  private authRoute?: string = defaultInitProps.authRoute;
  public router: Router = Router();
  private validateFns: Record<string, ValidateFn> = {};
  public mapUserToJwtPayload = defaultInitProps.mapUserToJwtPayload;
  private tokenRepository: Repository | undefined;

  constructor(props: AuthInitProps = defaultInitProps) {
    this.init(props);
  }

  init({ jwtConfig, redisUrl, authRoute, mapUserToJwtPayload }: AuthInitProps) {
    this.jwtConfig = jwtConfig;
    this.authRoute = authRoute || this.authRoute;
    this.mapUserToJwtPayload = mapUserToJwtPayload;
    this.router = Router();
    this.redis = createClient({
      url: redisUrl,
    });
    this.tokenRepository = new Repository(tokenSchema, this.redis);
    this.registerRedisEvents();
    this.redis.connect();
  }

  registerRedisEvents() {
    if (this.redis) {
      this.redis?.on("error", (err) =>
        console.log("[Redis Auth Client]:", err)
      );
      this.redis.on("connect", () =>
        console.log("[Redis Auth Client]:connected to redis successfully ")
      );
      this.redis.on("end", () =>
        console.log("[Redis Auth Client]:disconnected from redis ")
      );
      this.redis.on("reconnecting", () =>
        console.log("[Redis Auth Client]:reconnecting to redis ")
      );
    }
  }
  useJwtValidate(
    validateFn: (jwtPayload: any, done: (user: any, err: any) => void) => void
  ) {
    this.validateFns["jwt"] = validateFn;
  }

  useLoginValidate(validateFn: ValidateFn) {
    this.validateFns[ALLOWED_ROUTES.LOGIN] = validateFn;
  }

  useRegisterValidate(validateFn: ValidateFn) {
    this.validateFns[ALLOWED_ROUTES.REGISTER] = validateFn;
  }

  handleLogin = (req: Request, res: Response, next: NextFunction) => {
    this.validateFns[ALLOWED_ROUTES.LOGIN](req.body, async (user, err) => {
      if (err) {
        return res.status(401).json({
          message: "Login Failed",
          err,
        });
      }
      req.user = user;
      const { accessToken, refreshToken } = await this.getTokens(user);
      return res.status(201).json({
        user,
        accessToken,
        refreshToken,
      });
    });
  };

  getAuthRouter() {
    this.registerRoutes();
    return this.router;
  }

  handleRegister = (req: Request, res: Response, next: NextFunction) => {
    this.validateFns[ALLOWED_ROUTES.REGISTER](req.body, async (user, err) => {
      if (err) {
        return res.status(401).json({
          message: "Registeration Failed",
          err,
        });
      }

      req.user = user;

      const { accessToken, refreshToken } = await this.getTokens(user);
      return res.status(201).json({
        user,
        accessToken,
        refreshToken,
      });
    });
  };

  handleGetUser = (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
      user: req.user,
    });
  };

  authenticateJwt(
    jwtExtractor: (
      request: Request
    ) => string | null = Extractor.fromAuthHeaderAsBearerToken()
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let token = jwtExtractor(req);
      if (!token) {
        return res
          .status(200)
          .json({ success: false, message: "Error! Token was not provided." });
      }
      try {
        const decodedPayload = jwt.verify(
          token,
          this.jwtConfig.accessTokenSecret,
          {
            issuer: this.jwtConfig.issuer,
            audience: this.jwtConfig.audience,
          }
        ) as any;

        if (
          decodedPayload?.tokenType !== TokenType.ACCESS ||
          !decodedPayload.jti //backward support for access token previously without jti
        ) {
          return res.status(401).json({
            message: "Invalid Token",
            err: "Invalid Token",
          });
        }

        const tokenExist = await this.redis?.exists(
          `tokens:${decodedPayload.jti}`
        );

        //the assumption here is access token has already expired if it's not available in redis
        if (tokenExist) {
          return res.status(401).json({
            message: "Invalid Token",
            err: "Invalid Token",
          });
        }

        this.validateFns["jwt"](decodedPayload, (user, err) => {
          if (err) {
            return res.status(401).json({
              message: "Unathorized",
              err,
            });
          }
          req.user = user;
          next();
        });
      } catch (err) {
        return res.status(403).json({
          message: (err as any)?.message,
          err,
        });
      }
    };
  }

  handleRefreshToken(
    jwtExtractor: (
      request: Request
    ) => string | null = Extractor.fromAuthHeaderAsBearerToken()
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let refreshToken = jwtExtractor(req);

      if (!refreshToken) {
        return res
          .status(401)
          .json({ success: false, message: "Error! Token was not provided." });
      }
      try {
        const decodedPayload = jwt.verify(
          refreshToken,
          this.jwtConfig.refreshTokenSecret,
          {
            issuer: this.jwtConfig.issuer,
            audience: this.jwtConfig.audience,
          }
        ) as any;

        if (decodedPayload?.tokenType !== TokenType.REFRESH) {
          return res.status(401).json({
            message: "Invalid Token",
            err: "Invalid Token",
          });
        }

        const tokenExist = await this.redis?.exists(
          `tokens:${decodedPayload.jti}`
        );

        if (!tokenExist) {
          return res.status(401).json({
            message: "Invalid Token",
            err: "Invalid Token",
          });
        }

        const token = (await this.tokenRepository?.fetch(
          decodedPayload.jti
        )) as unknown as TokenSchema;

        //verify token hash
        const tokenMatches = await argon2.verify(
          token?.hashedToken || "",
          refreshToken
        );

        if (!tokenMatches) {
          //I am not sure if this scenerio calls for a compromised situation
          //should be able to provided functions that let the developer handle compromised situation
          return res.status(401).json({
            message: "Invalid Token",
            err: "Invalid Token",
          });
        }

        //delete the  token : prevents token replay
        await this.tokenRepository?.remove(decodedPayload.jti);

        //generate new token
        this.validateFns["jwt"](decodedPayload, async (user, err) => {
          if (err) {
            return res.status(401).json({
              message: "Unathorized",
              err,
            });
          }

          const newTokens = await this.getTokens(user);

          return res.status(200).json(newTokens);
        });
      } catch (err) {
        return res.status(403).json({
          message: (err as any)?.message,
          err,
        });
      }
    };
  }

  handleRevokeAccessToken(
    jwtExtractor: (
      request: Request
    ) => string | null = Extractor.fromAuthHeaderAsBearerToken()
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let accessToken = jwtExtractor(req);

      if (!accessToken) {
        return res
          .status(401)
          .json({ success: false, message: "Bad Session Request" });
      }

      try {
        const decodedPayload = jwt.verify(
          accessToken,
          this.jwtConfig.accessTokenSecret,
          {
            issuer: this.jwtConfig.issuer,
            audience: this.jwtConfig.audience,
          }
        ) as any;

        if (
          decodedPayload?.tokenType !== TokenType.ACCESS ||
          !decodedPayload.jti
        ) {
          return res.status(401).json({
            message: "Bad Session Request",
            err: "Bad Session Request",
          });
        }

        const tokenExist = await this.redis?.exists(
          `tokens:${decodedPayload.jti}`
        );

        if (tokenExist) {
          return res.status(200).json({
            message: "Sessioned Timed Out",
          });
        }

        const hashedToken = await argon2.hash(accessToken);

        await this.tokenRepository?.save(decodedPayload.jti, {
          sub: decodedPayload.sub,
          hashedToken,
          type: TokenType.ACCESS,
          expires_at: dayjs()
            .add(
              dayjs.duration(ms(this.jwtConfig.expiresIn.refresh)).asSeconds(),
              "s"
            )
            .toISOString(),
        });

        await this.tokenRepository?.expire(
          decodedPayload.jti,
          dayjs.unix(decodedPayload.exp).diff(dayjs(), "seconds")
        );

        return res.status(200).json({
          message: "Sessioned Timed Out",
        });
      } catch (err) {
        console.log(err);
        if ((err as JsonWebTokenError)?.message == "TokenExpiredError") {
          return res.status(200).json({
            message: "Sessioned Timed Out",
          });
        }
        return res.status(403).json({
          message: "Bad Session Request",
          err,
        });
      }
    };
  }

  async getTokens(user: any) {
    const jwtid = v4();
    const accessJwtId = v4();
    const jwtPayload = this.mapUserToJwtPayload(user);
    if (!jwtPayload.sub) {
      throw new Error("JwtPayload Mapper Must Contain A sub Identifier");
    }
    const accessToken = jwt.sign(
      {
        tokenType: TokenType.ACCESS,
        ...jwtPayload,
      },
      this.jwtConfig?.accessTokenSecret,
      {
        expiresIn: this.jwtConfig?.expiresIn?.access,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
        jwtid: accessJwtId,
      }
    );

    const refreshToken = jwt.sign(
      { tokenType: TokenType.REFRESH, ...jwtPayload },
      this.jwtConfig?.refreshTokenSecret,
      {
        expiresIn: this.jwtConfig.expiresIn.refresh,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
        jwtid,
      }
    );

    const hashedToken = await argon2.hash(refreshToken);
    await this.tokenRepository?.save(jwtid, {
      sub: jwtPayload.sub,
      hashedToken,
      type: TokenType.REFRESH,
      expires_at: dayjs()
        .add(
          dayjs.duration(ms(this.jwtConfig.expiresIn.refresh)).asSeconds(),
          "s"
        )
        .toISOString(),
    });

    await this.tokenRepository?.expire(
      jwtid,
      dayjs.duration(ms(this.jwtConfig.expiresIn.refresh)).asSeconds()
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  registerRoutes() {
    this.router.post(
      `${this.authRoute}/${ALLOWED_ROUTES.LOGIN}`,
      this.handleLogin
    );

    this.router.post(
      `${this.authRoute}/${ALLOWED_ROUTES.REGISTER}`,
      this.handleRegister
    );

    this.router.get(
      `${this.authRoute}/${ALLOWED_ROUTES.USER}`,
      this.authenticateJwt(),
      this.handleGetUser
    );

    this.router.get(
      `${this.authRoute}/${ALLOWED_ROUTES.REFRESH}`,
      this.handleRefreshToken()
    );
    this.router.post(
      `${this.authRoute}/${ALLOWED_ROUTES.LOGOUT}`,
      this.handleRevokeAccessToken()
    );
  }
}
