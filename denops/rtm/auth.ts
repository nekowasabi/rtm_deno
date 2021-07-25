import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { createHash } from "https://deno.land/std@0.100.0/hash/mod.ts";
import { existsSync } from "https://deno.land/std@0.101.0/fs/mod.ts";

export class Auth {
  static readonly AUTH_URL: string =
    "http://www.rememberthemilk.com/services/auth/";
  static readonly REST_URL: string =
    "https://api.rememberthemilk.com/services/rest/";

  constructor() {}

  /**
   * Apiシグニチャを生成する
   *
   * @param string apiKey RTMのAPIキー
   * @param string apiSecretKey RTMRTMのシークレットAPIキー
   * @param string[] params APIに投げるパラメータ
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
   * APIトークンを生成する
   *
   * @param string apiKey RTMのAPIキー
   * @param string apiSecretKey RTMRTMのシークレットAPIキー
   * @param string filePath .rtm_tokenのファイルパス
   * @param Denops denops
   * @return string
   */
  static async generateToken(
    apiKey: string,
    apiSecretKey: string,
    filePath: string,
    denops: Denops
  ): Promise<string> {
    // const tokenFromFile = await this.getTokenFromFile(filePath);
    // if (tokenFromFile !== undefined) return tokenFromFile;

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

    // // get token
    params = { format: "json", frob: frob, method: "rtm.auth.getToken" };
    apiSig = this.generateApiSig(apiKey, apiSecretKey, params);
    const token = await this.getTokenFromApi(apiSig, apiKey, frob);

    return "ok";
  }

  /**
   * ファイルに保存されたトークンを取得する
   *
   * @param string filePath .rtm_tokenのファイルパス
   * @return string | undefined
   */
  static async getTokenFromFile(filePath: string) {
    if (!existsSync(filePath)) return undefined;

    return await Deno.readTextFile(filePath);
  }

  /**
   * Frobを生成する
   *
   * @param string apiSig Frob用のAPIシグニチャ
   * @param string apiKey RTMのAPIキー
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
   * 認証処理をする
   *
   * @param string apiSig Frob用のAPIシグニチャ
   * @param string apiKey RTMのAPIキー
   * @param string frob RTMのfrob
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
   * APIからトークンを取得する
   *
   * @param string apiSig Frob用のAPIシグニチャ
   * @param string apiKey RTMのAPIキー
   * @param string frob RTMのfrob
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
}
