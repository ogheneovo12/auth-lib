import { Request } from "express";
import url from "url";

var re = /(\S+)\s+(\S+)/;

function parseAuthHeader(hdrValue: string) {
  if (typeof hdrValue !== "string") {
    return null;
  }
  var matches = hdrValue.match(re);
  return matches && { scheme: matches[1], value: matches[2] };
}

const AUTH_HEADER = "authorization";
const BEARER_AUTH_SCHEME = "bearer";

export class Extractor {
  static fromHeader(header_name: string) {
    return function (request: Request) {
      var token = null;
      if (request.headers[header_name]) {
        token = request.headers[header_name];
      }
      return token;
    };
  }

  static fromBody(field_name: string) {
    return function (request: Request) {
      var token = null;
      if (
        request.body &&
        Object.prototype.hasOwnProperty.call(request.body, field_name)
      ) {
        token = request.body[field_name];
      }
      return token;
    };
  }

  static fromUrlQueryParameter(param_name: string) {
    return function (request: Request) {
      var token = null,
        parsed_url = url.parse(request.url, true);
      if (
        parsed_url.query &&
        Object.prototype.hasOwnProperty.call(parsed_url.query, param_name)
      ) {
        token = parsed_url.query[param_name];
      }
      return token;
    };
  }

  static fromAuthHeaderWithScheme = function (auth_scheme: string) {
    var auth_scheme_lower = auth_scheme.toLowerCase();
    return function (request: Request) {
      var token = null;
      if (request.headers[AUTH_HEADER]) {
        var auth_params = parseAuthHeader(request.headers[AUTH_HEADER]);
        if (
          auth_params &&
          auth_scheme_lower === auth_params.scheme.toLowerCase()
        ) {
          token = auth_params.value;
        }
      }
      return token;
    };
  };

  static fromAuthHeaderAsBearerToken() {
    return this.fromAuthHeaderWithScheme(BEARER_AUTH_SCHEME);
  }
}
