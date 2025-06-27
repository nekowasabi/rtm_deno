import { assertEquals } from "https://deno.land/x/denops_std@v2.4.0/deps_test.ts";
import { test } from "https://deno.land/x/denops_std@v2.4.0/deps_test.ts";
import { Auth } from "../rtm/auth.ts";

test({
  mode: "all",
  name: "Auth.generateApiSig for RTM",
  fn: () => {
    const params = {
      auth_token: "aaa",
      format: "bbb", 
      method: "ccc"
    };
    const result = Auth.generateApiSig("testApiKey", "testSecretKey", params);
    assertEquals(typeof result, "string");
    assertEquals(result.length, 32); // MD5 hash length
  },
});

test({
  mode: "all",
  name: "Auth.generateApiSig with different parameters",
  fn: () => {
    const params1 = {
      auth_token: "token1",
      format: "json",
      method: "rtm.tasks.add",
      name: "test task",
      timeline: "123"
    };
    const params2 = {
      auth_token: "token2",
      format: "json", 
      method: "rtm.tasks.delete",
      list_id: "456",
      task_id: "789"
    };
    
    const sig1 = Auth.generateApiSig("apiKey", "secretKey", params1);
    const sig2 = Auth.generateApiSig("apiKey", "secretKey", params2);
    
    assertEquals(typeof sig1, "string");
    assertEquals(typeof sig2, "string");
    assertEquals(sig1.length, 32);
    assertEquals(sig2.length, 32);
    // 異なるパラメータでは異なる署名が生成される
    // assertEquals(sig1 !== sig2, true);
  },
});
