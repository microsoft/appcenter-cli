import { resolveProxySettings } from "../../src/ac-fus-util";
import * as assert from "assert";
import { ProxyAgent } from 'proxy-agent';
import { after } from "mocha";

describe('fetchWithOptions', () => {
  context("When proxy is not set", () => {
    beforeEach(() => {
      process.env.https_proxy = "";
    });
    it("Agent should be null", () => {
      const options = resolveProxySettings();
      assert(!options.agent);
    });
  });
  context("When proxy is set", () => {
    beforeEach(() => {
      process.env.https_proxy = "http://xx.xx.xx.xx:port";
    });
    it("Agent should not be null", () => {
      const options = resolveProxySettings();
      assert(options.agent);
      assert(options.agent instanceof ProxyAgent);
    });
  });
  after(() => {
    process.env.https_proxy = "";
  });
});

