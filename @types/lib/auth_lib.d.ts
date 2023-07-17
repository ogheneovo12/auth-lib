import { Router, Request, Response, NextFunction } from "express";
declare enum TokenType {
    REFRESH = "refresh",
    ACCESS = "access"
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
export type AuthInitProps = {
    jwtConfig: JWT_CONFIG;
    redisUrl: string;
    authRoute?: string;
    mapUserToJwtPayload: (user: any) => {
        sub: string;
    } & {
        [index: string]: any;
    };
};
type ValidateFn = (body: any, done: (user: any, err: any) => void) => void;
export declare class AuthLib {
    private jwtConfig;
    private redis;
    private authRoute?;
    router: Router;
    private validateFns;
    mapUserToJwtPayload: (user: any) => {
        sub: string;
    } & {
        [index: string]: any;
    };
    private tokenRepository;
    constructor(props?: AuthInitProps);
    init({ jwtConfig, redisUrl, authRoute, mapUserToJwtPayload }: AuthInitProps): void;
    registerRedisEvents(): void;
    useJwtValidate(validateFn: (jwtPayload: any, done: (user: any, err: any) => void) => void): void;
    useLoginValidate(validateFn: ValidateFn): void;
    useRegisterValidate(validateFn: ValidateFn): void;
    handleLogin: (req: Request, res: Response, next: NextFunction) => void;
    getAuthRouter(): Router;
    handleRegister: (req: Request, res: Response, next: NextFunction) => void;
    handleGetUser: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    authenticateJwt(jwtExtractor?: (request: Request) => string | null): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    handleRefreshToken(jwtExtractor?: (request: Request) => string | null): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    getTokens(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    registerRoutes(): void;
}
export {};
//# sourceMappingURL=auth_lib.d.ts.map