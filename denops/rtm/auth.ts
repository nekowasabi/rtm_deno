import { createHash } from "https://deno.land/std@0.100.0/hash/mod.ts";

export class Auth {
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
    params: string[]
  ) {
    const q: string = apiSecretKey + "api_key" + apiKey + params.join("");
    return createHash("md5").update(q).toString();
  }

  /**
   * APIトークンを生成する
   *
   * @param  array 文字列結合するパラメータ
   * @return string
   */
  static generateToken(): string {
    return "ok";
  }
}
