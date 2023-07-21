
# Getting Started with JwtAuthLib

## Purpose

JwtAuthLib is a powerful authentication library for Node.js applications, designed to simplify and secure the authentication process. It provides a straightforward way to handle user authentication and token management, using JSON Web Tokens (JWT) and Redis for efficient token storage.

## Installation

To use JwtAuthLib in your Node.js project, you can install it using npm or yarn:

```bash
npm install jwt-auth-lib --save
```

or

```bash
yarn add jwt-auth-lib
```

## Usage

### Initializing Auth Lib

To begin using AuthLib, you need to initialize the library with the required configuration:

```tsx
import { AuthLib, AuthInitProps } from "jwt-auth-lib";

const jwtConfig = {
  refreshTokenSecret: "your-refresh-token-secret",
  accessTokenSecret: "your-access-token-secret",
  expiresIn: {
    refresh: "1d",
    access: "7d",
  },
  issuer: "your-issuer",
  audience: "your-audience",
};

const redisUrl = "redis://localhost:6379";

const mapUserToJwtPayload = (user) => ({
  sub: user.id,
  email: user.email,
});

const authInitProps: AuthInitProps = {
  jwtConfig,
  redisUrl,
  mapUserToJwtPayload,
};

const authLib = new AuthLib(authInitProps);
```

you can also Update the Configurations by Calling The **`init()`** Method on the AuthLib Instance

```tsx
authLib.init(authInitProps)
```

### **Registering Custom Validation Functions**

JwtAuthLib allows you to define custom validation functions for login and registration routes. Here's how you can register your custom validation functions:

```tsx
authLib.useLoginValidate((body, done) => {
  // Your custom login validation logic here
  // Call done(user, err) to return the result
});

authLib.useRegisterValidate((body, done) => {
  // Your custom registration validation logic here
  // Call done(user, err) to return the result
});

authLib.useJwtValidate(({ sub }: { sub: string; email: string }, done) => {
  // your custom jwt sub validation
  // called everytime authLib.authenticateJwt is executed as a middleware
  // also called when authLib.handleRefreshToken is executed as a middleware
  // it is to ensure that the sub decoded from the jwt is a valid sub at all times
});
```

JwtAuthLib is designed to be a flexible and non-opinionated library. To achieve this, it exposes a validation function, allowing your application to validate user information passed in the request body. Upon successful validation, the user information returned is then utilized to generate the necessary access and refresh tokens.

With JwtAuthlib, you have the freedom to define your own custom validation logic, empowering you to seamlessly integrate the authentication process into your application while maintaining full control over the validation process.

### **Handling Authentication Routes**

JwtAuthLib exposes its own Authentication Router middleware that handles login, registration, logout, and refresh token routes.

```tsx
import express, { Express } from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

//Register Auth Router 
app.use(AuthStrategy.getAuthRouter()); 
// default base route `/auth`
// exposes /auth/login, /auth/register, /auth/refresh, /auth/logout

```

The default base route for the AuthRouter is **`/auth`**; it can be changed from the JwtAuthLib instance configuration below:

```tsx
const authInitProps: AuthInitProps = {
  // ...
  authRoute: "/custom-auth-route",
};

const authLib = new AuthLib(authInitProps);

// Register validation handlers
// ...

// Use authlib prebuilt router
app.use(AuthStrategy.getAuthRouter());
```

Alternatively, JwtAuthLib exposes its authentication handlers for the respective authentication routes. You can use these handlers in your Express application:

```tsx
import express, { Express } from "express";
const app = express();

// Handle login route
app.post("/auth/login", authLib.handleLogin);

// Handle registration route
app.post("/auth/register", authLib.handleRegister);

// Handle refresh token route
app.post("/auth/refresh", authLib.handleRefreshToken());

// Handle Logout Route
app.post("/auth/logout", authLib.handleRevokeAccessToken());

```

**NOTE:** **`authLib.handleRefreshToken()`** and **`authLib.handleRevokeAccessToken()`** are called because they allow developers to pass in a custom token extraction method for extracting refresh and access tokens from the request object. The default method used is from the extractor utility **`Extractor.fromAuthHeaderAsBearerToken()`**, which basically extracts the token from the authorization header using the Bearer Scheme. The Extractor utility exposes other extraction methods you can read in the extractor utility doc **[here](https://github.com/ogheneovo12/auth-lib/blob/main/Extractor.md)**.

### **Authenticating Protected Routes**

To protect routes and ensure only authenticated users can access them, you can use the **`authenticateJwt`** middleware provided by JwtAuthLib:

```tsx
// Protect a route using authenticateJwt middleware
app.get("/protected", authLib.authenticateJwt(), (req, res) => {
  // The authenticated user's information can be accessed using req.user
  res.json({ user: req.user });
});

```

**NOTE:** **`authLib.authenticateJwt()`** can also be passed a custom extractor method, but the default use is **`Extractor.fromAuthHeaderAsBearerToken()`**, which basically extracts the token from the authorization header using the Bearer Scheme.

### **Refreshing Access Tokens**

JwtAuthLib allows users to refresh their access tokens when they expire. To handle token refresh, you can use the **`handleRefreshToken`** route handle

```tsx
app.get("/auth/refresh", authLib.handleRefreshToken());
/*
 returns {
   accessToken: string;
   refreshToken: string;
}
*/
```

### **Revoking Access Tokens**

To revoke access tokens and force users to log out, you can use the **`handleRevokeAccessToken`** route handler:

```tsx
app.post("/auth/logout", authLib.handleRevokeAccessToken());
/*
 returns {
   message: "Session Timed Out"
}
*/
```

## **Help and Discussion**

JwtAuthLib is a feature-rich authentication library for Node.js applications, providing a secure and efficient way to handle user authentication and token management. If you need help or have new features you are interested in adding, you can reach out to the team on GitHub or on Slack.
