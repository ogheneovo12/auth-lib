import path from "path";
import nodeExternals from "webpack-node-externals";
import { Configuration } from "webpack";
import WebpackShellPluginNext from "webpack-shell-plugin-next";
const getConfig = (
  env: { [key: string]: string },
  argv: { [key: string]: string }
): Configuration => {
  require("dotenv").config({
    path: path.resolve(__dirname, `.env.${env.mode}`),
  });

  const entryOutput: Record<
    string,
    {
      entry: string;
      output: string;
      configFile: string;
    }
  > = {
    package: {
      entry: "./src/index.ts",
      output: "dist",
      configFile: "tsconfig-package.json",
    },
    default: {
      entry: "./src/server.ts",
      output: "build",
      configFile: "tsconfig.json",
    },
  };

  return {
    entry: entryOutput[env["type"] || "default"].entry,
    target: "node",
    mode: argv.mode === "production" ? "production" : "development",
    externals: [nodeExternals()],
    plugins: [
      new WebpackShellPluginNext({
        onBuildStart: {
          scripts: ["npm run clean:dev && npm run clean:package"],
          blocking: true,
          parallel: false,
        },
        // onBuildEnd: {
        //   scripts: ["npm start"],
        //   blocking: false,
        //   parallel: true,
        // },
      }),
    ],
    module: {
      rules: [
        {
          test: /\.(ts|js)$/,
          loader: "ts-loader",
          options: {
            configFile: entryOutput[env["type"] || "default"].configFile,
            compilerOptions: {
              declaration: true,
              declarationDir: path.resolve(__dirname, "types"),
            },
          },
          exclude: "/node_modules/",
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".js"],
      alias: {
        src: path.resolve(__dirname, "src"),
      },
    },
    output: {
      path: path.join(__dirname, entryOutput[env["type"] || "default"].output),
      filename: "index.js",
    },
    optimization: {
      moduleIds: "deterministic",
      splitChunks: {
        chunks: "all",
      },
    },
  };
};

export default getConfig;
