import { createHash } from "https://deno.land/std@0.100.0/hash/mod.ts";

export class Auth {
  constructor() {}

  /**
   * Apiシグニチャを生成する
   *
   * @return string
   */
  generateApiSig() {}

  /**
   * APIトークンを生成する
   *
   * @param  array 文字列結合するパラメータ
   * @return string
   */
  generateToken(params: []): string {
    const hash = createHash("md5");

    // for param in sort(keys(a:000[0]))
    //   let q .= param . l:query_params[param]
    // endfor
    // return s:CalcMd5(g:rtm_secret_key.'api_key'.g:rtm_api_key.q)

    return "ok";
  }
}
