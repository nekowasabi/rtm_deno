import { Denops } from "https://deno.land/x/denops_std@v1.0.0-alpha.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.0-alpha.0/helper/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async echo(text: unknown): Promise<unknown> {
      if (typeof text !== "string") {
        throw new Error(
          `'text' attribute of 'echo' in ${denops.name} must be string`,
        );
      }
      fetch('http://www.google.com').then((result) => {
        console.log('nolifeking')
      });
      return await Promise.resolve(text);
    },
  };

  await execute(
    denops,
    `command! -nargs=1 HelloWorldEcho echomsg denops#request('${denops.name}', 'echo', [<q-args>])`,
  );
}
