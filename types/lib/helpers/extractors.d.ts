import { Request } from "express";
declare class Extractor {
    static fromHeader(header_name: string): (request: Request) => string | string[] | null | undefined;
    static fromBody(field_name: string): (request: Request) => any;
    static fromUrlQueryParameter(param_name: string): (request: Request) => string | string[] | null | undefined;
    static fromAuthHeaderWithScheme(auth_scheme: string): (request: Request) => string | null;
    static fromAuthHeaderAsBearerToken(): (request: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>) => string | null;
}
export default Extractor;
//# sourceMappingURL=extractors.d.ts.map