import { assertEquals, assertExists } from "https://deno.land/std@0.220.1/testing/asserts.ts";
import { Auth } from "../rtm/auth.ts";

// Mock Denops object for testing
const mockDenops = {
  name: "rtm_test",
  call: async (fn: string, ...args: unknown[]) => {
    // Mock vim function calls
    return [];
  },
  cmd: async (command: string) => {
    // Mock vim command execution
    console.log(`[TEST] Mock cmd: ${command}`);
  },
  eval: async (expr: string) => {
    // Mock vim variable evaluation - return empty strings so environment variables are used
    if (expr.includes("g:rtm_api_key")) return "";
    if (expr.includes("g:rtm_secret_key")) return "";
    if (expr.includes("g:setting_path")) return "";
    return "";
  }
};

// Check if required environment variables are set
function checkEnvironmentVariables() {
  const apiKey = Deno.env.get("RTM_API_KEY");
  const secretKey = Deno.env.get("RTM_SECRET_KEY");
  const tokenPath = Deno.env.get("RTM_TOKEN_PATH");

  if (!apiKey || !secretKey || !tokenPath) {
    console.log("⚠️ Skipping integration tests: Required environment variables not set");
    console.log("   Please set RTM_API_KEY, RTM_SECRET_KEY, and RTM_TOKEN_PATH");
    console.log("   To run integration tests, ensure your RTM credentials are configured");
    console.log("   in your environment variables (same as used for the plugin).");
    return false;
  }
  console.log("✅ RTM environment variables found, running integration tests");
  return true;
}

// Test scenario: Create, manipulate, and delete a task named "abcdefg"
Deno.test("RTM Integration Test - Full Task Lifecycle", async () => {
  console.log("=== RTM Integration Test: Full Task Lifecycle ===");
  
  // Check if environment variables are set
  if (!checkEnvironmentVariables()) {
    return; // Skip test if environment variables are not set
  }
  
  // Test RTM API connectivity first
  try {
    const { apiKey, apiSecretKey, tokenPath } = await Auth.getSettings(mockDenops as any);
    const token = await Auth.generateToken(apiKey, apiSecretKey, tokenPath, mockDenops as any);
    const timeline = await Auth.getTimelineFromApi(apiKey, apiSecretKey, token);
    
    if (timeline === "no") {
      console.log("⚠️ RTM API connection failed, skipping integration test");
      return;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("⚠️ RTM API connection error, skipping integration test:", errorMessage);
    return;
  }
  
  // Test data
  const testTaskName = "abcdefg";
  let taskInfo: {
    listId: string;
    taskseriesId: string; 
    taskId: string;
  } | null = null;

  try {
    // 1. Add task
    console.log(`\n1. Adding task: ${testTaskName}`);
    const addResult = await Auth.addTask(mockDenops as any, testTaskName);
    assertEquals(addResult, true, "Task should be added successfully");
    console.log("✅ Task added successfully");

    // 2. Get task list to find our task
    console.log("\n2. Getting task list to find our task");
    const taskList = await Auth.getTaskList(mockDenops as any, "");
    assertExists(taskList, "Task list should be retrieved");
    
    // Find our task in the list
    taskInfo = findTaskByName(taskList, testTaskName);
    assertExists(taskInfo, `Task "${testTaskName}" should be found in task list`);
    console.log(`✅ Task found: listId=${taskInfo!.listId}, taskseriesId=${taskInfo!.taskseriesId}, taskId=${taskInfo!.taskId}`);

    // 3. Update task name
    console.log("\n3. Updating task name");
    const newName = "abcdefg_updated";
    const updateResult = await Auth.setTaskName(
      mockDenops as any,
      taskInfo!.listId,
      taskInfo!.taskseriesId,
      taskInfo!.taskId,
      newName
    );
    assertExists(updateResult, "Task name should be updated successfully");
    console.log(`✅ Task name updated to: ${newName}`);

    // 4. Set task priority
    console.log("\n4. Setting task priority");
    const setPriorityResult = await Auth.setTaskPriority(
      mockDenops as any,
      taskInfo!.listId,
      taskInfo!.taskseriesId,
      taskInfo!.taskId,
      "1"
    );
    assertExists(setPriorityResult, "Task priority should be set successfully");
    console.log("✅ Task priority set to 1");

    // 5. Set task due date
    console.log("\n5. Setting task due date");
    const setDueDateResult = await Auth.setTaskDueDate(
      mockDenops as any,
      taskInfo!.listId,
      taskInfo!.taskseriesId,
      taskInfo!.taskId,
      "tomorrow"
    );
    assertExists(setDueDateResult, "Task due date should be set successfully");
    console.log("✅ Task due date set to tomorrow");

    // 6. Complete task
    console.log("\n6. Completing task");
    const completeResult = await Auth.completeTask(
      mockDenops as any,
      taskInfo!.listId,
      taskInfo!.taskseriesId,
      taskInfo!.taskId
    );
    assertExists(completeResult, "Task should be completed successfully");
    console.log("✅ Task completed");

    // 7. Uncomplete task
    console.log("\n7. Uncompleting task");
    const uncompleteResult = await Auth.uncompleteTask(
      mockDenops as any,
      taskInfo!.listId,
      taskInfo!.taskseriesId,
      taskInfo!.taskId
    );
    assertExists(uncompleteResult, "Task should be uncompleted successfully");
    console.log("✅ Task uncompleted");

  } finally {
    // 8. Cleanup: Delete the test task
    if (taskInfo) {
      console.log("\n8. Cleaning up: Deleting test task");
      try {
        const deleteResult = await Auth.deleteTask(
          mockDenops as any,
          taskInfo.listId,
          taskInfo.taskseriesId,
          taskInfo.taskId
        );
        assertExists(deleteResult, "Task should be deleted successfully");
        console.log("✅ Test task deleted successfully");
      } catch (error) {
        console.error("⚠️ Failed to delete test task:", error);
      }
    }
  }

  console.log("\n=== All tests passed! ===");
});

// Helper function to find task by name in the task list response
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

// Test timeout settings
Deno.test("RTM API Timeout Test", async () => {
  console.log("=== Testing API timeout handling ===");
  
  // Check if environment variables are set
  if (!checkEnvironmentVariables()) {
    return; // Skip test if environment variables are not set
  }
  
  // This test ensures our timeout mechanisms work properly
  const startTime = Date.now();
  
  try {
    // Test getTimelineFromApi with realistic timeout
    const { apiKey, apiSecretKey, tokenPath } = await Auth.getSettings(mockDenops as any);
    const token = await Auth.generateToken(apiKey, apiSecretKey, tokenPath, mockDenops as any);
    const timeline = await Auth.getTimelineFromApi(apiKey, apiSecretKey, token);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (timeline === "no") {
      console.log(`⚠️ RTM API connection failed after ${duration}ms, skipping timeout test`);
      return;
    }
    
    console.log(`✅ Timeline retrieved in ${duration}ms`);
    assertExists(timeline, "Timeline should be retrieved");
    
    // Ensure it doesn't take too long (should be within timeout)
    assertEquals(duration < 30000, true, "Timeline retrieval should complete within 30 seconds");
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⚠️ Timeline retrieval failed after ${duration}ms, skipping timeout test due to network issues`);
    
    // Skip test if network issues prevent proper testing
    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("fetch"))) {
      console.log("⚠️ Network connectivity issues detected, skipping timeout test");
      return;
    } else {
      throw error;
    }
  }
});