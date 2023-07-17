# auth-lib
An Express authentication library that implements jwt rotation with redis

# usage 
Import AuthLib and Create an Instance

```
import express, { Express } from "express";
import { AuthLib } from "./lib/auth_lib";

const AuthStrategy = new AuthLib({
  redisUrl: APP_CONFIG.REDIS_URL,
  authRoute:"/auth", //default
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

```
You can also call the init function to initialize this configs

```
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

```
property ***sub*** is a required property in the **mapUserToJwtDownload**, it should be a unique identifier in which your user refresh token can be associated with it's storage in redis.

Auth Lib Provides some validation strategy that allows developer verify the sub of the jwt token against their schema
- **useJwtValidate** - to validateJwt 
- **useLoginValidate** - to validate login payload from req.body
- **useRegisterValidate** - to validate register payload from req.body 

each of the validation strategy has a callback - **done(user, err)**, that takes the *user* info and *error*. the *user* info is attached to req.user
and also passed to **mapUserToJwtPayload** to generate jwtTokens.

see usage below

```
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

```

Once the above validation has been registered, we need to pass the AuthStrategy Router to express, using the **getAuthRouter()** method,
the route path used can be configured through the **authRoute** param passed to **AuthLibInstance.init** or during the auth lib intantiation

```

app.use(express.json());
app.use(cors());

app.use(AuthStrategy.getAuthRouter());

```
the **getAuthRouter()** exposes the below paths

```
enum ALLOWED_ROUTES {
  LOGIN = "login",
  REGISTER = "register",
  LOGOUT = "logout",
  USER = "user",
  REFRESH = "refresh",
}

```

- POST {authRoute}/login - to login user, payload is extracted from req.body and passed to **useLoginValidate**
- POST {authRoute}/register - to signup user, payload is extracted from req.body and passed to **useRegisterValidate**
- POST {authRoute}/refresh -  to generate new access token, extracts token from Authorization Header using Bearer Schema by default
- POST {authRoute}/user - takes in access token from Authorization Header using Bearer Schema by default and returns logged in user info returned from **useJwtValidate**
- POST {authRoute}/logout - 

The AuthLib also expose two methods (express middleware) that can be used for validating access and refresh token, it also allows the developer pass in their custom token extractor 
from the request

### authenticateJwt
validates accessToken and pass logged in user to req.user

```
authenticateJwt(
    jwtExtractor: (
      request: Request
    ) => string | null = Extractor.fromAuthHeaderAsBearerToken()
  ){};

```
**usage**

```
app.get("protected", AuthStrategy.authenticateJwt( MyCustomExtractor ), (req, res, next)=>{
   return res.status(200).json(req.user);
})

```

### handleRefreshToken
validates refreshToken and generates new refresh and accessToken revoking the previous refresh Token (to avoid token replay)

```
handleRefreshToken(
    jwtExtractor: (
      request: Request
    ) => string | null = Extractor.fromAuthHeaderAsBearerToken()
  ){}

```

**usage**

```
app.get("my-refresh", AuthStrategy.handleRefreshToken(  MyCustomExtractor })

```

AuthLib exposes an Extractor Classs with Prebuilt Extractors (Thanks to Passport-jwt)

```
import { Extractor } from "./lib"

Extractor.fromHeader(header_name: string)
Extractor.fromBody(field_name: string)
Extractor.fromUrlQueryParameter(param_name: string)
Extractor.fromAuthHeaderWithScheme(auth_scheme: string)
Extractor.fromAuthHeaderAsBearerToken()
```

## Contribution 
There are still some extra configurations that could be added.


