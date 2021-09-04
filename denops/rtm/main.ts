import { Denops } from "https://deno.land/x/denops_std@v1.8.1/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.8.1/helper/mod.ts";
import { Auth } from "./auth.ts";
import { existsSync } from "https://deno.land/std@0.106.0/fs/mod.ts";

import {
  ensureArray,
  ensureString,
} from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async auth(): Promise<unknown> {
      const { apiKey, apiSecretKey, tokenPath } = await Auth.getSettings(
        denops
      );

      const token: string = await Auth.generateToken(
        apiKey,
        apiSecretKey,
        tokenPath,
        denops
      );
      if (!existsSync(tokenPath)) Auth.saveTokenFromFile(tokenPath, token);

      return await Promise.resolve("Authorized complete.");
    },

    async addTask(task: unknown): Promise<unknown> {
      ensureString(task);
      await Auth.addTask(denops, task);

      await denops.cmd(`redraw`);
      return await Promise.resolve(" add task complete.");
    },

    async addSelectedTask(
      start: unknown,
      end: unknown,
      _args: unknown
    ): Promise<void> {
      const words = await denops.call("getline", start, end);
      ensureArray(words);

      for (const word of words) {
        ensureString(word);
        if (word !== "") {
          await Auth.addTask(denops, word);
          await denops.cmd(`redraw`);
        }
      }
    },

    async debug(): Promise<void> {
      console.log("ok");
    },
  };

  await execute(
    denops,
    `command! -nargs=0 HelloWorldEcho echomsg denops#request('${denops.name}', 'auth', [])`
  );

  await execute(
    denops,
    `command! -nargs=0 RtmAddTask echomsg denops#request('${denops.name}', 'addTask', [""])`
  );

  await execute(
    denops,
    `command! -nargs=* -range RtmAddSelectedTask echomsg denops#request('${denops.name}', 'addSelectedTask', [<line1>, <line2>, <f-args>])`
  );

  await execute(
    denops,
    `command! -nargs=* -range Debug echomsg denops#request('${denops.name}', 'debug', [])`
  );
}

// if (typeof text !== "string") {
//   throw new Error(
//     `'text' attribute of 'echo' in ${denops.name} must be string`
//   );
// }

// import * as vars from "https://deno.land/x/denops_std@v1.8.1/variable/mod.ts";

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
