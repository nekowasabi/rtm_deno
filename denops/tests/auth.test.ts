import { assertEquals } from "https://deno.land/x/denops_std@v1.0.0-beta.8/deps_test.ts";
import { test } from "https://deno.land/x/denops_std@v1.0.0-beta.8/deps_test.ts";
import { Auth } from "../rtm/auth.ts";

test({
  mode: "all",
  name: "Auth for RTM",
  fn: () => {
    const auth = new Auth();
    const result = auth.generateApiSig();
    assertEquals(result, "no", undefined);
  },
});
