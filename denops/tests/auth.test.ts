import { assertEquals } from "https://deno.land/x/denops_std@v2.2.0/deps_test.ts";
import { test } from "https://deno.land/x/denops_std@v2.2.0/deps_test.ts";
import { Auth } from "../rtm/auth.ts";

test({
  mode: "all",
  name: "Auth for RTM",
  fn: () => {
    assertEquals(
      Auth.generateApiSig("testApiKey", "testSecretKey", ["aaa", "bbb", "ccc"]),
      "84462db18aac892d8f7adc8d9a7acd61",
      undefined
    );
  },
});
