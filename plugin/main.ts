export * as path from "https://deno.land/std@0.95.0/path/mod.ts";
export * as hash from "https://deno.land/std@0.95.0/hash/mod.ts";
export * as fs from "https://deno.land/std@0.95.0/fs/mod.ts";
export * from "https://deno.land/x/denops_core@v1.0.0-alpha.4/mod.ts";
export * from "https://deno.land/x/unknownutil@v0.1.1/mod.ts";
import { Denops } from "https://deno.land/x/denops_core@v1.0.0-alpha.4/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async echo(text: unknown): Promise<unknown> {
      if (typeof text !== "string") {
        throw new Error(
          `'text' attribute of 'echo' in ${denops.name} must be string`,
        );
      }
      return await Promise.resolve(text);
    },
  };
};
