import { createHash } from "https://deno.land/std@0.100.0/hash/mod.ts";
import { existsSync } from "https://deno.land/std@0.101.0/fs/mod.ts";

export class Auth {
  auth_url: string;
  rest_url: string;

  constructor() {
    this.auth_url = "http://www.rememberthemilk.com/services/auth/";
    this.rest_url = "https://api.rememberthemilk.com/services/rest/";
  }

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
    params: string[]
  ): string {
    const q: string = apiSecretKey + "api_key" + apiKey + params.join("");
    return createHash("md5").update(q).toString();
  }

  /**
   * APIトークンを生成する
   *
   * @param string apiKey RTMのAPIキー
   * @param string apiSecretKey RTMRTMのシークレットAPIキー
   * @param string filePath .rtm_tokenのファイルパス
   * @return string
   */
  static async generateToken(
    apiKey: string,
    apiSecretKey: string,
    filePath: string
  ): Promise<string> {
    const token = await this.getTokenFromFile(filePath);
    if (token !== undefined) return token;

    // get frob
    let apiSig = this.generateApiSig(apiKey, apiSecretKey, [
      "rtm.auth.getFrob",
    ]);
    const frob = await this.getFrob(apiSig);

    // auth

    // get token

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
   * @return string
   */
  static getFrob(apiSig: string) {}
}
