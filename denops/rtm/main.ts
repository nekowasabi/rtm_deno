import { Denops } from "https://deno.land/x/denops_std@v1.0.1/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.1/helper/mod.ts";
// import { Auth } from "./auth.ts";
// import { existsSync } from "https://deno.land/std@0.101.0/fs/mod.ts";
// import * as fn from "https://deno.land/x/denops_std@v1.0.1/function/mod.ts";
import * as fn from "https://deno.land/x/denops_std/function/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async echo(): Promise<unknown> {
      const name = await fn.input(denops, " aaa ");
      console.log(name);

      const len = await fn.len(denops, "abcdefg");
      console.log(len);

      // const { apiKey, apiSecretKey, tokenPath } = await Auth.getSettings(
      //   denops
      // );
      //
      // const token: string = await Auth.generateToken(
      //   apiKey,
      //   apiSecretKey,
      //   tokenPath,
      //   denops
      // );
      // if (!existsSync(tokenPath)) Auth.saveTokenFromFile(tokenPath, token);
      //
      return await Promise.resolve(name);
    },
    //
    // async addTask(): Promise<unknown> {
    //   let name = await fn.input(denops, "Input task name: ");
    //   console.log(name);
    //
    //   await denops.cmd(`redraw`);
    //   return await Promise.resolve(name + " add task complete.");
    // },
  };

  await execute(
    denops,
    `command! -nargs=0 HelloWorldEcho echomsg denops#request('${denops.name}', 'echo', [])`
  );

  // await execute(
  //   denops,
  //   `command! -nargs=0 RtmAddTask echomsg denops#request('${denops.name}', 'addTask', [])`
  // );
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
