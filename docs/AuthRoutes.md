# **AuthLib Authentication Route Documentation**

JwtAuthLib provides built-in authentication routes for login, registration, token refresh, and token revocation. This documentation outlines how to configure and mount these routes in an Express application.

## **Configuration**

Before using the JwtAuthLib authentication routes, you need to configure the library with the necessary settings. Configuration can be done using either the constructor or the **`init`** method of the AuthLib class. The default  route path is `/auth` but can be configured via the jwtAuthLib init configuration via `authRoute` Parameter.

### **Using the Constructor**

```tsx

import  { AuthLib, AuthInitProps } from "jwt-auth-lib";

// Define the configuration options
const authInitProps: AuthInitProps = {
  authRoute:"/auth", //default /auth
  jwtConfig: {
    accessTokenSecret: "your_access_token_secret",
    refreshTokenSecret: "your_refresh_token_secret",
    expiresIn: {
      refresh: "7d", // Refresh token will expire in 7 days
      access: "1h", // Access token will expire in 1 hour
    },
    issuer: "your_issuer",
    audience: "your_audience",
  },
  redisUrl: "redis://localhost:6379", // Replace with your Redis server URL
  // Other configuration options...
};

// Create an instance of AuthLib with the configuration
const authLib = new AuthLib(authInitProps);

```

### **Using the `init` Method**

```tsx

import  { AuthLib, AuthInitProps } from "auth-lib";

// Create an instance of AuthLib
const authLib = new AuthLib();

// Define the configuration options
const authInitProps: AuthInitProps = {
  jwtConfig: {
    accessTokenSecret: "your_access_token_secret",
    refreshTokenSecret: "your_refresh_token_secret",
    expiresIn: {
      refresh: "7d", // Refresh token will expire in 7 days
      access: "1h", // Access token will expire in 1 hour
    },
    issuer: "your_issuer",
    audience: "your_audience",
  },
  redisUrl: "redis://localhost:6379", // Replace with your Redis server URL
  // Other configuration options...
};

// Initialize AuthLib with the configuration
authLib.init(authInitProps);

```

## **Mounting Authentication Routes on Express Application**

After configuring **JwtAuthLib,** you can mount the built-in authentication routes on your Express application. The authentication routes include /login, /register, /user, and /logout, all under a base route (default `/auth` )

```tsx

import express from "express";
import { AuthLib } from "jwt-auth-lib";

const app = express();

// Mount the AuthLib authentication router
app.use(authLib.getAuthRouter());

// Other routes and middleware can be defined after the authentication routes

// Start the Express server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

```

With the **`app.use(authLib.getAuthRouter())`** line of code, the authentication routes will be mounted on the base route **`/auth`**. You can change the base route by updating the **`authRoute`** configuration option when initializing JwtAuthLib.

## **Authentication Handlers**

In addition to the built-in authentication routes, JwtAuthLib provides authentication handlers for protecting routes that require authentication. These handlers validate access tokens and revoke them if necessary.

### **Protecting Routes with `authenticateJwt`**

```tsx
typescriptCopy code
import  { AuthLib, Extractor } from "auth-lib";

const authLib = new AuthLib();

// Example route that requires authentication
app.get("/protected", authLib.authenticateJwt(Extractor.fromAuthHeaderAsBearerToken()), (req, res) => {
  // The authenticated user's information can be accessed using req.user
  res.json({ user: req.user });
});

```

The **`authenticateJwt`** handler is used to protect routes that require an authenticated user. It checks the validity of the access token provided in the request and grants access if the token is valid, while attaching the logged-in user to the request object as `req.user`. Otherwise, it returns an error response.

## **Conclusion**

With **JwtAuthLib's** built-in authentication routes and authentication handlers, you can easily implement user authentication and token management in your Express application. By properly configuring and mounting the authentication routes, you can secure your application's endpoints and provide a seamless authentication experience for your users.
