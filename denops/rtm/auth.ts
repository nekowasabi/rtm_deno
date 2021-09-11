import { Denops } from "https://deno.land/x/denops_std@v1.9.1/mod.ts";
import { createHash } from "https://deno.land/std@0.106.0/hash/mod.ts";
import { existsSync } from "https://deno.land/std@0.106.0/fs/mod.ts";
import { ensureString } from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v1.9.1/variable/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v1.9.1/function/mod.ts";

type ApiSetting = {
  apiKey: string;
  apiSecretKey: string;
  tokenPath: string;
};

export class Auth {
  static readonly AUTH_URL: string =
    "http://www.rememberthemilk.com/services/auth/";
  static readonly REST_URL: string =
    "https://api.rememberthemilk.com/services/rest/";

  constructor() {}

  /**
   * Add single task
   *
   * @param Denops denops
   * @param string task task name
   * @return boolean
   */
  static async addTask(denops: Denops, task: string): Promise<boolean> {
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token
    );

    const name =
      task == "" ? await fn.input(denops, "Input task name: ") : task.trim();

    ensureString(name);
    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.add",
      name: name.trim(),
      parse: "1",
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

    const url =
      this.REST_URL +
      "?method=rtm.tasks.add" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&name=" +
      encodeURIComponent(name) +
      "&parse=1" +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    await fetch(url, { method: "POST" });
    return true;
  }

  static async getSettings(denops: Denops): Promise<ApiSetting> {
    let tmp = await vars.g.get(denops, "rtm_api_key");
    ensureString(tmp);
    const apiKey: string = tmp;

    tmp = await vars.g.get(denops, "rtm_secret_key");
    ensureString(tmp);
    const apiSecretKey: string = tmp;

    tmp = await vars.g.get(denops, "setting_path");
    ensureString(tmp);
    const tokenPath: string = tmp;

    return await Promise.resolve({ apiKey, apiSecretKey, tokenPath });
  }

  /**
   * Generate Api signiture
   *
   * @param string apiKey RTM API key
   * @param string apiSecretKey RTM Secret API key
   * @param string[] params
   * @return string
   */
  static generateApiSig(
    apiKey: string,
    apiSecretKey: string,
    params: { [index: string]: string }
  ): string {
    let p = "";
    for (const [attr, value] of Object.entries(params)) {
      p += attr + value;
    }

    const q: string = apiSecretKey + "api_key" + apiKey + p;
    return createHash("md5").update(q).toString();
  }

  /**
   * Generate API token
   *
   * @param string apiKey RTMのAPIキー
   * @param string apiKey RTM API key
   * @param string apiSecretKey RTM Secret API key
   * @param string filePath file path for .rtm_token
   * @param Denops denops
   * @return string
   */
  static async generateToken(
    apiKey: string,
    apiSecretKey: string,
    filePath: string,
    denops: Denops
  ): Promise<string> {
    const tokenFromFile = await this.getTokenFromFile(filePath);
    if (tokenFromFile !== undefined)
      return Promise.resolve(tokenFromFile.replace(/(\r?\n)$/, ""));

    // get frob
    let params: { [index: string]: string } = {
      format: "json",
      method: "rtm.auth.getFrob",
    };
    let apiSig = this.generateApiSig(apiKey, apiSecretKey, params);
    const frob: string = await this.getFrob(apiSig, apiKey);

    // auth
    params = { frob: frob, perms: "delete" };
    apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

    await this.authorize(apiSig, apiKey, frob, denops);

    // get token
    params = { format: "json", frob: frob, method: "rtm.auth.getToken" };
    apiSig = this.generateApiSig(apiKey, apiSecretKey, params);
    return Promise.resolve(await this.getTokenFromApi(apiSig, apiKey, frob));
  }

  /**
   * Get token from file
   *
   * @param string filePath file path for .rtm_token
   * @return string | undefined
   */
  static async getTokenFromFile(filePath: string) {
    if (!existsSync(filePath)) return undefined;

    return await Deno.readTextFile(filePath);
  }

  /**
   * Save token to file.
   *
   * @param string filePath file path for .rtm_token
   * @return string | undefined
   */
  static saveTokenFromFile(filePath: string, text: string): void {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    Deno.writeFile(filePath, data);
  }

  /**
   * Generate frob
   *
   * @param string apiSig API signiture for frob
   * @param string apiKey RTM API key
   * @return string
   */
  static async getFrob(apiSig: string, apiKey: string): Promise<string> {
    const url =
      this.REST_URL +
      "?method=rtm.auth.getFrob&api_key=" +
      apiKey +
      "&format=json" +
      "&api_sig=" +
      apiSig;

    const res = await fetch(url).then((response) => {
      return response.body?.getReader();
    });
    if (!res) return "no";

    const str: string = await res.read().then(({ value }) => {
      const d = new TextDecoder();
      return d.decode(value).toString();
    });
    const j = JSON.parse(str);
    return j.rsp.frob;
  }

  /**
   * Authorize
   *
   * @param string apiSig API signiture for frob
   * @param string apiKey RTM API key
   * @param string frob frob for RTM
   * @param Denops denops
   * @return void
   */
  static async authorize(
    apiSig: string,
    apiKey: string,
    frob: string,
    denops: Denops
  ): Promise<void> {
    const url: string =
      this.AUTH_URL +
      "?api_key=" +
      apiKey +
      "&frob=" +
      frob +
      "&perms=delete" +
      "&api_sig=" +
      apiSig;

    await denops.call("OpenBrowser", url);

    await denops.call(
      "input",
      "If authorization in browser, enter return key : "
    );
  }

  /**
   * Get token from API
   *
   * @param string apiSig API signiture for frob
   * @param string apiKey RTM API key
   * @param string frob
   * @return void
   */
  static async getTokenFromApi(
    apiSig: string,
    apiKey: string,
    frob: string
  ): Promise<string> {
    const url =
      this.REST_URL +
      "?method=rtm.auth.getToken&api_key=" +
      apiKey +
      "&format=json" +
      "&frob=" +
      frob +
      "&api_sig=" +
      apiSig;

    const res = await fetch(url).then((response) => {
      return response.body?.getReader();
    });
    if (!res) return "no";

    const str: string = await res.read().then(({ value }) => {
      const d = new TextDecoder();
      return d.decode(value).toString();
    });
    const j = JSON.parse(str);
    return j.rsp.auth.token;
  }

  /**
   * Generate timeline token
   *
   * @param string apiKey RTM API key
   * @param string apiSecretKey RTM Secret API key
   * @param string token token for RTM
   * @return string
   */
  static async getTimelineFromApi(
    apiKey: string,
    apiSecretKey: string,
    token: string
  ) {
    const params: { [index: string]: string } = {
      auth_token: token.toString(),
      format: "json",
      method: "rtm.timelines.create",
    };

    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

    const url: string =
      this.REST_URL +
      "?method=rtm.timelines.create&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json&api_sig=" +
      apiSig;

    const res = await fetch(url).then((response) => {
      return response.body?.getReader();
    });
    if (!res) return "no";

    const str: string = await res.read().then(({ value }) => {
      const d = new TextDecoder();
      return d.decode(value).toString();
    });

    if (!str) return "no";
    const j = JSON.parse(str);
    return j.rsp.timeline;
  }
}
