import { Denops } from "https://deno.land/x/denops_std@v2.2.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v2.2.0/helper/mod.ts";
import { Auth } from "./auth.ts";
import { existsSync } from "https://deno.land/std@0.115.1/fs/mod.ts";
import {
  ensureArray,
  ensureString,
} from "https://deno.land/x/unknownutil@v1.1.4/mod.ts";

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

    async debug(): Promise<void> {},
  };

  await execute(
    denops,
    `command! -nargs=0 RtmAuth echomsg denops#request('${denops.name}', 'auth', [])`
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
