import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.220.1/testing/asserts.ts";

// Helper function to run CLI commands with timeout
async function runCli(args: string[], timeoutMs = 30000): Promise<{ stdout: string; stderr: string; code: number }> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "cli.ts", ...args],
    stdout: "piped",
    stderr: "piped",
  });
  
  const process = cmd.spawn();
  let timeoutId: number | null = null;
  
  try {
    // Add timeout handling
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        try {
          process.kill();
        } catch {
          // Process may already be terminated
        }
        reject(new Error(`CLI command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    const result = await Promise.race([process.output(), timeoutPromise]);
    
    // Clear timeout if command completed successfully
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    return {
      stdout: new TextDecoder().decode(result.stdout),
      stderr: new TextDecoder().decode(result.stderr),
      code: result.code,
    };
  } catch (error) {
    // Clear timeout on error
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    // Try to kill process if it's still running
    try {
      process.kill();
    } catch {
      // Process may already be terminated
    }
    
    throw error;
  }
}

// Check if required environment variables are set for integration tests
function checkEnvironmentVariables(): boolean {
  const apiKey = Deno.env.get("RTM_API_KEY");
  const secretKey = Deno.env.get("RTM_SECRET_KEY");
  const tokenPath = Deno.env.get("RTM_TOKEN_PATH");

  if (!apiKey || !secretKey || !tokenPath) {
    console.log("⚠️ Skipping CLI tests: Required environment variables not set");
    console.log("   Please set RTM_API_KEY, RTM_SECRET_KEY, and RTM_TOKEN_PATH");
    console.log("   To run CLI tests, ensure your RTM credentials are configured");
    console.log("   in your environment variables (same as used for the plugin).");
    return false;
  }
  console.log("✅ RTM environment variables found, running CLI tests");
  return true;
}

Deno.test("CLI Help Command", async () => {
  const result = await runCli(["help"]);
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "RTM CLI - Remember The Milk Command Line Interface");
  assertStringIncludes(result.stdout, "Commands:");
  assertStringIncludes(result.stdout, "auth");
  assertStringIncludes(result.stdout, "add");
  assertStringIncludes(result.stdout, "list");
  assertStringIncludes(result.stdout, "delete");
  assertStringIncludes(result.stdout, "complete");
  assertStringIncludes(result.stdout, "uncomplete");
  assertStringIncludes(result.stdout, "set-name");
  assertStringIncludes(result.stdout, "set-priority");
  assertStringIncludes(result.stdout, "set-due");
});

Deno.test("CLI No Arguments Shows Help", async () => {
  const result = await runCli([]);
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "RTM CLI - Remember The Milk Command Line Interface");
});

Deno.test("CLI --help Flag", async () => {
  const result = await runCli(["--help"]);
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "RTM CLI - Remember The Milk Command Line Interface");
});

Deno.test("CLI Unknown Command", async () => {
  const result = await runCli(["unknown-command"]);
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Unknown command: unknown-command");
  assertStringIncludes(result.stderr, "Run with --help to see available commands.");
});

Deno.test("CLI Add Command Without Task Name", async () => {
  const result = await runCli(["add"]);
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Task name is required");
  assertStringIncludes(result.stderr, "Usage: cli.ts add");
});

Deno.test("CLI Delete Command Without Required Arguments", async () => {
  const result = await runCli(["delete"]);
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "list_id, taskseries_id, and task_id are required");
  assertStringIncludes(result.stderr, "Usage: cli.ts delete");
});

Deno.test("CLI Complete Command Without Required Arguments", async () => {
  const result = await runCli(["complete"]);
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "list_id, taskseries_id, and task_id are required");
  assertStringIncludes(result.stderr, "Usage: cli.ts complete");
});

Deno.test("CLI Set-Priority Command With Invalid Priority", async () => {
  const result = await runCli(["set-priority", "123", "456", "789", "invalid"]);
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Priority must be N, 1, 2, or 3");
});

// Test CLI behavior when environment variables are not set
Deno.test("CLI Without Environment Variables", async () => {
  // Temporarily unset environment variables
  const originalApiKey = Deno.env.get("RTM_API_KEY");
  const originalSecretKey = Deno.env.get("RTM_SECRET_KEY");
  const originalTokenPath = Deno.env.get("RTM_TOKEN_PATH");
  
  try {
    Deno.env.delete("RTM_API_KEY");
    Deno.env.delete("RTM_SECRET_KEY");
    Deno.env.delete("RTM_TOKEN_PATH");
    
    const result = await runCli(["add", "test task"], 5000);
    
    assertEquals(result.code, 1);
    assertStringIncludes(result.stderr, "Error:");
    
  } finally {
    // Restore environment variables
    if (originalApiKey) Deno.env.set("RTM_API_KEY", originalApiKey);
    if (originalSecretKey) Deno.env.set("RTM_SECRET_KEY", originalSecretKey);
    if (originalTokenPath) Deno.env.set("RTM_TOKEN_PATH", originalTokenPath);
  }
});

// Helper function to find task by name in the task list response (same as integration.test.ts)
function findTaskByName(taskListResponse: any, taskName: string): {
  listId: string;
  taskseriesId: string;
  taskId: string;
} | null {
  try {
    const lists = taskListResponse.rsp?.tasks?.list;
    if (!lists) return null;

    // Handle both single list and array of lists
    const listArray = Array.isArray(lists) ? lists : [lists];

    for (const list of listArray) {
      if (list.taskseries) {
        const taskseriesArray = Array.isArray(list.taskseries) ? list.taskseries : [list.taskseries];
        
        for (const taskseries of taskseriesArray) {
          if (taskseries.name === taskName) {
            const task = Array.isArray(taskseries.task) ? taskseries.task[0] : taskseries.task;
            return {
              listId: list.id,
              taskseriesId: taskseries.id,
              taskId: task.id
            };
          }
        }
      }
    }
  } catch (error) {
    console.error("Error parsing task list:", error);
  }
  
  return null;
}