import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.2/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.0-beta.2/helper/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v1.0.0-beta.8/variable/mod.ts";
import { Auth } from "./auth.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async echo(text: unknown): Promise<unknown> {
      if (typeof text !== "string") {
        throw new Error(
          `'text' attribute of 'echo' in ${denops.name} must be string`
        );
      }
      // const secretKey = await denops.call("get", "g:", "rtm_secret_key", [
      //   "err",
      // ]);
      const secretKey = await vars.g.get(denops, "rtm_secret_key");
      console.log(denops);

      const a = new Auth();
      // fetch("http://www.google.com").then((result) => {
      //   const hash = createHash("md5");
      //   hash.update("nolifeking");
      //
      //   const a = new Auth();
      // });
      return await Promise.resolve(text);
    },
  };

  await execute(
    denops,
    `command! -nargs=1 HelloWorldEcho echomsg denops#request('${denops.name}', 'echo', [<q-args>])`
  );
}
