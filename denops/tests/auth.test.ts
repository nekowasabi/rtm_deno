import { assertEquals, assertNotEquals } from "https://deno.land/std@0.220.1/testing/asserts.ts";
import { Auth } from "../rtm/auth.ts";

Deno.test("Auth.generateApiSig for RTM", async () => {
  const params = {
    auth_token: "aaa",
    format: "bbb", 
    method: "ccc"
  };
  const result = await Auth.generateApiSig("testApiKey", "testSecretKey", params);
  assertEquals(typeof result, "string");
  assertEquals(result.length, 32); // MD5 hash length
});

Deno.test("Auth.generateApiSig with different parameters", async () => {
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
  
  const sig1 = await Auth.generateApiSig("apiKey", "secretKey", params1);
  const sig2 = await Auth.generateApiSig("apiKey", "secretKey", params2);
  
  assertEquals(typeof sig1, "string");
  assertEquals(typeof sig2, "string");
  assertEquals(sig1.length, 32);
  assertEquals(sig2.length, 32);
  // 異なるパラメータでは異なる署名が生成される
  assertNotEquals(sig1, sig2);
});
