import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import { existsSync } from "https://deno.land/std@0.120.0/fs/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v6.5.0/variable/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";
import { RtmClient } from "../../src/rtm-client.ts";

type ApiSetting = {
  apiKey: string;
  apiSecretKey: string;
  tokenPath: string;
};

export class Auth {
  /**
   * Add single task
   *
   * @param Denops denops
   * @param string task task name
   * @return boolean
   */
  static async addTask(denops: Denops, task: string): Promise<boolean> {
    console.log("[RTM DEBUG] Auth.addTask called with task:", task);
    
    const client = RtmClient.fromEnv();
    const name = task == ""
      ? await fn.input(denops, "Input task name: ")
      : task.trim();
    ensure(name, is.String);

    try {
      await client.addTask(name);
      return true;
    } catch (error) {
      console.error("[RTM DEBUG] Auth.addTask client.addTask error:", error);
      return false;
    }
  }

  /**
   * Add task with pre-fetched timeline
   *
   * @param Denops denops
   * @param string task task name
   * @param RtmClient client RTM client instance
   * @return boolean
   */
  static async addTaskWithClient(
    denops: Denops,
    task: string,
    client: RtmClient,
  ): Promise<boolean> {
    console.log("[RTM DEBUG] Auth.addTaskWithClient called with task:", task);

    const name = task.trim();
    if (!name) {
      console.log("[RTM DEBUG] Empty task name, skipping");
      return false;
    }

    try {
      await client.addTask(name);
      return true;
    } catch (error) {
      console.error("[RTM DEBUG] Auth.addTaskWithClient client.addTask error:", error);
      return false;
    }
  }
  
  static async getSettings(denops: Denops): Promise<ApiSetting> {
    // Try environment variables first, then fall back to vim variables
    let apiKey = Deno.env.get("RTM_API_KEY");
    if (!apiKey) {
      let tmp = await vars.g.get(denops, "rtm_api_key");
      ensure(tmp, is.String);
      apiKey = tmp as string;
    }

    let apiSecretKey = Deno.env.get("RTM_SECRET_KEY");
    if (!apiSecretKey) {
      let tmp = await vars.g.get(denops, "rtm_secret_key");
      ensure(tmp, is.String);
      apiSecretKey = tmp as string;
    }

    let tokenPath = Deno.env.get("RTM_TOKEN_PATH");
    if (!tokenPath) {
      let tmp = await vars.g.get(denops, "setting_path");
      ensure(tmp, is.String);
      tokenPath = tmp as string;
    }

    if (!apiKey || !apiSecretKey || !tokenPath) {
      throw new Error("Missing required RTM configuration: apiKey, apiSecretKey, and tokenPath are required");
    }
    return await Promise.resolve({ apiKey, apiSecretKey, tokenPath });
  }

  /**
   * Generate API token
   *
   * @param Denops denops
   * @return string
   */
  static async generateToken(
    denops: Denops,
  ): Promise<string> {
    const client = RtmClient.fromEnv();
    return await client.authenticate();
  }

  /**
   * Get token from file
   *
   * @param string filePath file path for .rtm_token
   * @return string | undefined
   */
  static async getTokenFromFile(filePath: string) {
    if (!existsSync(filePath)) return undefined;

    return await Deno.readTextFile(filePath);
  }

  /**
   * Save token to file.
   *
   * @param string filePath file path for .rtm_token
   * @return string | undefined
   */
  static saveTokenFromFile(filePath: string, text: string): void {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    Deno.writeFile(filePath, data);
  }

  /**
   * Get task list
   *
   * @param Denops denops
   * @param string filter optional filter for tasks
   * @return object
   */
  static async getTaskList(denops: Denops, filter = ""): Promise<any> {
    const client = RtmClient.fromEnv();
    return await client.getTaskList(filter);
  }

  /**
   * Delete task
   *
   * @param Denops denops
   * @param string listId list ID
   * @param string taskseries_id task series ID
   * @param string task_id task ID
   * @return boolean
   */
  static async deleteTask(denops: Denops, listId: string, taskseriesId: string, taskId: string): Promise<boolean> {
    const client = RtmClient.fromEnv();
    await client.deleteTask(listId, taskseriesId, taskId);
    return true;
  }

  /**
   * Complete task
   *
   * @param Denops denops
   * @param string listId list ID
   * @param string taskseries_id task series ID
   * @param string task_id task ID
   * @return boolean
   */
  static async completeTask(denops: Denops, listId: string, taskseriesId: string, taskId: string): Promise<boolean> {
    const client = RtmClient.fromEnv();
    await client.completeTask(listId, taskseriesId, taskId);
    return true;
  }

  /**
   * Uncomplete task
   *
   * @param Denops denops
   * @param string listId list ID
   * @param string taskseries_id task series ID
   * @param string task_id task ID
   * @return boolean
   */
  static async uncompleteTask(denops: Denops, listId: string, taskseriesId: string, taskId: string): Promise<boolean> {
    const client = RtmClient.fromEnv();
    await client.uncompleteTask(listId, taskseriesId, taskId);
    return true;
  }

  /**
   * Update task name
   *
   * @param Denops denops
   * @param string listId list ID
   * @param string taskseries_id task series ID
   * @param string task_id task ID
   * @param string name new task name
   * @return boolean
   */
  static async setTaskName(denops: Denops, listId: string, taskseriesId: string, taskId: string, name: string): Promise<boolean> {
    const client = RtmClient.fromEnv();
    await client.setTaskName(listId, taskseriesId, taskId, name);
    return true;
  }

  /**
   * Set task priority
   *
   * @param Denops denops
   * @param string listId list ID
   * @param string taskseries_id task series ID
   * @param string task_id task ID
   * @param string priority priority (N, 1, 2, 3)
   * @return boolean
   */
  static async setTaskPriority(denops: Denops, listId: string, taskseriesId: string, taskId: string, priority: string): Promise<boolean> {
    const client = RtmClient.fromEnv();
    await client.setTaskPriority(listId, taskseriesId, taskId, priority);
    return true;
  }

  /**
   * Set task due date
   *
   * @param Denops denops
   * @param string listId list ID
   * @param string taskseries_id task series ID
   * @param string task_id task ID
   * @param string due due date (ISO 8601 format or natural language)
   * @return boolean
   */
  static async setTaskDueDate(denops: Denops, listId: string, taskseriesId: string, taskId: string, due: string): Promise<boolean> {
    const client = RtmClient.fromEnv();
    await client.setTaskDueDate(listId, taskseriesId, taskId, due);
    return true;
  }
}
