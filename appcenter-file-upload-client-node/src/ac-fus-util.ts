import fetch from "node-fetch";
import * as ProxyAgent from "proxy-agent";

export function resolveProxySettings(options: any = {}) {
  const instanceOptions = {
    ...options
  };
  const proxyServer = process.env.http_proxy ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    null;
  if (proxyServer && !proxyServer.startsWith("http://") && !proxyServer.startsWith("https://")) {
    console.warn("Proxy address in environment variable does not start with either 'http://' or 'https://'. CLI might not work correct.");
  }
  if (!options.agent && proxyServer) {
    console.log(`Using proxy server: ${proxyServer}`);
    instanceOptions.agent = ProxyAgent(proxyServer);
  }
  return instanceOptions;
}

export function fetchWithOptions(url: string, options: any = {}) {
  return fetch(url, resolveProxySettings(options));
}
