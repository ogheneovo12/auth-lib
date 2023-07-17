import express, { Express } from "express";
import APP_CONFIG from "./_config";
import cors from "cors";
import { AuthLib } from "./lib/auth_lib";
import { loadAllDb, userDb } from "./db";

type User = {
  _id: string;
  email: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  password: string;
};

const app: Express = express();

const AuthStrategy = new AuthLib();

AuthStrategy.init({
  redisUrl: APP_CONFIG.REDIS_URL,
  mapUserToJwtPayload: (user: User) => ({ sub: user._id, email: user?.email }),
  jwtConfig: {
    accessTokenSecret: APP_CONFIG.JWT_ACCESS_TOKEN_SECRET,
    refreshTokenSecret: APP_CONFIG.JWT_REFRESH_TOKEN_SECRET,
    expiresIn: {
      access: "1d",
      refresh: "7d",
    },
    issuer: "api.ayo.xyz",
    audience: ["ayo.xyz"],
  },
});

AuthStrategy.useLoginValidate((loginInfo: LoginPayload, done) => {
  userDb.findOne({ email: loginInfo.email }, (err, existingUser) => {
    if (err) return done(null, err);
    if (!existingUser) return done(null, "Password/Email Mismatch");
    if (existingUser?.password !== loginInfo?.password) {
      return done(null, "Invalid Credentials");
    }
    done(existingUser, null);
  });
});

AuthStrategy.useRegisterValidate((newUser: RegisterPayload, done) => {
  userDb.findOne({ email: newUser?.email }, (err, existingUser) => {
    if (err) {
      return done(null, err);
    }
    if (existingUser) {
      return done(null, "User Already Exists");
    }
    userDb.insert(newUser, (err, doc) => {
      if (err) {
        return done(null, err);
      }
      done(doc, null);
    });
  });
});

AuthStrategy.useJwtValidate(({ sub }: { sub: string; email: string }, done) => {
  userDb.findOne({ _id: sub }, (err, doc) => {
    if (err) {
      return done(null, "Please Login");
    }
    done(doc, null);
  });
});

app.use(express.json());
app.use(cors());


//Register Auth Router 
app.use(AuthStrategy.getAuthRouter());

app.listen(APP_CONFIG.PORT, () => {
  console.log(
    `[⚡️ server]: Server is running at http://localhost:${APP_CONFIG.PORT}`
  );
  console.log("Loading Database...");
  loadAllDb();
});
