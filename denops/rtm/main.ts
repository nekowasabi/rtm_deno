import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.0/helper/mod.ts";
import { Auth } from "./auth.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async echo(text: unknown): Promise<unknown> {
      // const key = Auth.generateApiSig("aa", "bbb", ["1", "2", "3"]);
      // console.log(key);

      // const tmp = await Auth.getTokenFromFile("/Users/takets/.rtm_token");
      // console.log(tmp);
      //
      const apiKey = "5b909a70f5054f2fb076a682235c7ee7";
      const apiSecretKey = "48783977375d19f7";
      const tokenPath = "/Users/takets/.rtm_token";

      const token: string = await Auth.generateToken(
        apiKey,
        apiSecretKey,
        tokenPath,
        denops
      );

      const timeline: string = await Auth.getTimelineFromApi(
        apiKey,
        apiSecretKey,
        token
      );

      // let l:save_file = [ l:content['rsp']['auth']['token'] ]
      // call writefile(l:save_file, g:setting_path)

      return await Promise.resolve(text);
    },
  };

  await execute(
    denops,
    `command! -nargs=1 HelloWorldEcho echomsg denops#request('${denops.name}', 'echo', [<q-args>])`
  );
}

// if (typeof text !== "string") {
//   throw new Error(
//     `'text' attribute of 'echo' in ${denops.name} must be string`
//   );
// }

// import * as vars from "https://deno.land/x/denops_std@v1.0.0-beta.8/variable/mod.ts";

// const a = new Auth();
// fetch("http://www.google.com").then((result) => {
//   const hash = createHash("md5");
//   hash.update("nolifeking");
//
//   const a = new Auth();
// });

// const secretKey = await denops.call("get", "g:", "rtm_secret_key", [
//   "err",
// ]);
// const secretKey = await vars.g.get(denops, "rtm_secret_key");
// console.log(secretKey);
