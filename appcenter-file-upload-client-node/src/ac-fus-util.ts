import fetch from "node-fetch";
import * as ProxyAgent from "proxy-agent";

export function fetchWithOptions(url: string, options: any = {}) {
  const instanceOptions = {
    ...options
  };
  const proxyServer = process.env.http_proxy ||
                  process.env.HTTP_PROXY ||
                  process.env.https_proxy ||
                  process.env.HTTPS_PROXY ||
                  null;
  if (!options.agent && proxyServer) {
    instanceOptions.agent = ProxyAgent(proxyServer);
  }
  return fetch(url, instanceOptions);
}
