// Copied definitions for request, response etc. from node-fetch typings. Typings file
// doesn't export them, but we need them for defining filters around fetch api.
import * as node_fetch from "node-fetch";

export declare class Request extends Body {
  constructor(input: string | Request, init?: RequestInit);
  method: string;
  url: string;
  headers: Headers;
  context: RequestContext;
  referrer: string;
  mode: RequestMode;
  redirect: RequestRedirect;
  credentials: RequestCredentials;
  cache: RequestCache;
}

export function isRequest(x: any): x is Request {
  return (<Request>x).method !== undefined;
}

export interface RequestInit {
  method?: string;
  headers?: Headers | { [index: string]: string };
  body?: BodyInit;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  credentials?: RequestCredentials;
  cache?: RequestCache;
}

export type RequestContext =
  "audio" | "beacon" | "cspreport" | "download" | "embed" |
  "eventsource" | "favicon" | "fetch" | "font" | "form" | "frame" |
  "hyperlink" | "iframe" | "image" | "imageset" | "import" |
  "internal" | "location" | "manifest" | "object" | "ping" | "plugin" |
  "prefetch" | "script" | "serviceworker" | "sharedworker" |
  "subresource" | "style" | "track" | "video" | "worker" |
  "xmlhttprequest" | "xslt";
export type RequestMode = "same-origin" | "no-cors" | "cors";
export type RequestRedirect = "follow" | "error" | "manual";
export type RequestCredentials = "omit" | "same-origin" | "include";
export type RequestCache =
  "default" | "no-store" | "reload" | "no-cache" |
  "force-cache" | "only-if-cached";

export declare class Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string;
  getAll(name: string): Array<string>;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callback: (value: string, name: string) => void): void;
}

export function isHeaders(x: any): x is Headers {
  const mightBe = <Headers>x;
  return typeof mightBe.get === "function" &&
    typeof mightBe.append === "function";
}

export declare class Body {
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  json<T>(): Promise<T>;
  text(): Promise<string>;
}

export declare class Response extends Body {
  constructor(body?: BodyInit, init?: ResponseInit);
  static error(): Response;
  static redirect(url: string, status: number): Response;
  type: ResponseType;
  url: string;
  status: number;
  ok: boolean;
  statusText: string;
  headers: Headers;
  clone(): Response;
}

export type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";

export interface ResponseInit {
  status: number;
  statusText?: string;
  headers?: HeaderInit;
}

export type HeaderInit = Headers | Array<string>;
export type BodyInit = ArrayBuffer | ArrayBufferView | Blob | FormData | string;
export type RequestInfo = Request | string;

export interface FetchFunc {
  (input: string | Request, init?: RequestInit): Promise<Response>;
};

export interface NodeFetchApi extends FetchFunc {
  Headers: typeof Headers;
  Request: typeof Request;
  Response: typeof Response;
}

export const fetch = <NodeFetchApi>node_fetch;
