import fetch from "node-fetch";
import { ProxyAgent } from 'proxy-agent';

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
    console.warn("Proxy address in environment variable does not start with either 'http://' or 'https://'. CLI might not work correctly.");
  }
  if (!options.agent && proxyServer) {
    instanceOptions.agent = new ProxyAgent({ getProxyForUrl: () => proxyServer });
  }
  return instanceOptions;
}

export function fetchWithOptions(url: string, options: any = {}) {
  return fetch(url, resolveProxySettings(options));
}
