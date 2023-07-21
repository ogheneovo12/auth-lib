# Token Extraction Utils

## **Extractor Utils Documentation**

The **`Extractor`** utility provides various methods to extract authentication tokens from different parts of an Express.js **`Request`** object. This utility simplifies the process of extracting tokens from headers, request bodies, and URL query parameters, making it easy to pass token extraction strategy to the jwtAuthLib Handlers.

## **Installation**

To use the **`Extractor`** utility in your Node.js project, you can import it as follows:

```jsx
import { Extractor } from "jwt-auth-lib";

```

## **Methods**

The **`Extractor`** utility provides the following methods for extracting authentication tokens:

### **1. `fromHeader(header_name: string)`**

This method extracts the authentication token from the request headers.

- **Parameters:**
    - **`header_name`**: The name of the header from which to extract the token.
- **Usage:**

```jsx

const headerName = "Authorization";
const tokenExtractor = Extractor.fromHeader(headerName);

// Use the tokenExtractor function to extract the token from the request object
const token = tokenExtractor(request);

```

### **2. `fromBody(field_name: string)`**

This method extracts the authentication token from the request body.

- **Parameters:**
    - **`field_name`**: The name of the field in the request body from which to extract the token.
- **Usage:**

```jsx
const fieldName = "token";
const tokenExtractor = Extractor.fromBody(fieldName);

// Use the tokenExtractor function to extract the token from the request object
const token = tokenExtractor(request);

```

### **3. `fromUrlQueryParameter(param_name: string)`**

This method extracts the authentication token from the URL query parameters.

- **Parameters:**
    - **`param_name`**: The name of the query parameter from which to extract the token.
- **Usage:**

```jsx
const paramName = "access_token";
const tokenExtractor = Extractor.fromUrlQueryParameter(paramName);

// Use the tokenExtractor function to extract the token from the request object
const token = tokenExtractor(request);

```

### **4. `fromAuthHeaderWithScheme(auth_scheme: string)`**

This method extracts the authentication token from the **`Authorization`** header with a specified authentication scheme.

- **Parameters:**
    - **`auth_scheme`**: The authentication scheme (e.g., "Bearer") from which to extract the token.
- **Usage:**

```jsx
const authScheme = "Bearer";
const tokenExtractor = Extractor.fromAuthHeaderWithScheme(authScheme);

// Use the tokenExtractor function to extract the token from the request object
const token = tokenExtractor(request);

```

### **5. `fromAuthHeaderAsBearerToken()`**

This method is a specialized version of **`fromAuthHeaderWithScheme`** and specifically extracts Bearer tokens from the **`Authorization`** header.

- **Usage:**

```jsx

const tokenExtractor = Extractor.fromAuthHeaderAsBearerToken();

// Use the tokenExtractor function to extract the token from the request object
const token = tokenExtractor(request);

```

## **Example**

Here's an example of how you can use the **`Extractor`** utility to extract a Bearer token from the request:

```tsx
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { Extractor, AuthLib, AuthInitProps  } from "jwt-auth-lib";

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

const authHeaderName = "Authorization";
const refreshTokenScheme = "Refresh";
const authHeadertokenExtractor = Extractor.fromHeader(authHeaderName);
const authBearerTokenExtractor = Extractor.fromAuthHeaderAsBearerToken();
const bodyTokenEXtractor = Extractor.fromBody("token"); //extracts from req.body.token
const refreshTokenExtractor = Extractor.fromAuthHeaderWithScheme(refreshTokenScheme); //Exracts from header Authorization: Refresh tokensString

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

const express = require("express");
const app:Express = express();

app.use(express.json());

authLib.useLoginValidate((loginInfo: LoginPayload, done) => {
  userDb.findOne({ email: loginInfo.email }, (err, existingUser) => {
    if (err) return done(null, err);
    if (!existingUser) return done(null, "Password/Email Mismatch");
    if (existingUser?.password !== loginInfo?.password) {
      return done(null, "Invalid Credentials");
    }
    done(existingUser, null);
  });
});

authLib.useRegisterValidate((newUser: RegisterPayload, done) => {
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

authLib.useJwtValidate(({ sub }: { sub: string; email: string }, done) => {
  userDb.findOne({ _id: sub }, (err, doc) => {
    if (err) {
      return done(null, "Please Login");
    }
    done(doc, null);
  });
});

//with jwt-auth-lib handlers

// Handle refresh token route
app.post("/auth/refresh", authLib.handleRefreshToken(refreshTokenExtractor));

// Handle Logout Route
app.post("/auth/logout", authLib.handleRevokeAccessToken(bodyTokenEXtractor));

app.get(
  "/protected",
  authLib.authenticateJwt(authBearerTokenExtractor),
  (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
      user: req.user,
    });
  }
);

//without jwtAuth
app.get("/bare-protected", (req, res) => {
  // Extract the Bearer token from the Authorization header
  const token = authHeadertokenExtractor(req);

  // Use the extracted token for authentication or further processing
  if (token) {
    // Your authentication logic here
    res.json({ message: "Authenticated", token });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});

```

This documentation explains how to use the **`Extractor`** utility to efficiently handle token extraction from different parts of the request, enabling secure token-based authentication in your Node.js applications. Happy coding!
