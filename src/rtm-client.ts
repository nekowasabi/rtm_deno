import { createHash } from "https://deno.land/std@0.120.0/hash/mod.ts";
import { existsSync } from "https://deno.land/std@0.120.0/fs/mod.ts";

export type RtmConfig = {
  apiKey: string;
  apiSecretKey: string;
  tokenPath?: string;
  token?: string;
};

export type TaskFilter = string;

export class RtmClient {
  private readonly AUTH_URL = "http://www.rememberthemilk.com/services/auth/";
  private readonly REST_URL = "https://api.rememberthemilk.com/services/rest/";
  
  private config: RtmConfig;

  constructor(config: RtmConfig) {
    this.config = config;
  }

  /**
   * Create RTM client from environment variables
   */
  static fromEnv(): RtmClient {
    const apiKey = Deno.env.get("RTM_API_KEY");
    const apiSecretKey = Deno.env.get("RTM_SECRET_KEY");
    const tokenPath = Deno.env.get("RTM_TOKEN_PATH");
    const token = Deno.env.get("RTM_TOKEN");

    if (!apiKey || !apiSecretKey) {
      throw new Error("RTM_API_KEY and RTM_SECRET_KEY environment variables are required");
    }

    return new RtmClient({
      apiKey,
      apiSecretKey,
      tokenPath,
      token,
    });
  }

  /**
   * Add single task
   */
  async addTask(taskName: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.add",
      name: taskName.trim(),
      parse: "1",
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.add" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&name=" + encodeURIComponent(taskName) +
      "&parse=1" +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Get task list
   */
  async getTaskList(filter?: TaskFilter): Promise<any> {
    const token = await this.getToken();

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.getList",
    };

    if (filter) {
      params.filter = filter;
    }

    const apiSig = this.generateApiSig(params);

    let url = this.REST_URL +
      "?method=rtm.tasks.getList" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&api_sig=" + apiSig;

    if (filter) {
      url += "&filter=" + encodeURIComponent(filter);
    }

    const response = await fetch(url);
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Delete task
   */
  async deleteTask(listId: string, taskseriesId: string, taskId: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.delete",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.delete" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&list_id=" + listId +
      "&taskseries_id=" + taskseriesId +
      "&task_id=" + taskId +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Complete task
   */
  async completeTask(listId: string, taskseriesId: string, taskId: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.complete",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.complete" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&list_id=" + listId +
      "&taskseries_id=" + taskseriesId +
      "&task_id=" + taskId +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Uncomplete task
   */
  async uncompleteTask(listId: string, taskseriesId: string, taskId: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.uncomplete",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.uncomplete" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&list_id=" + listId +
      "&taskseries_id=" + taskseriesId +
      "&task_id=" + taskId +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Set task name
   */
  async setTaskName(listId: string, taskseriesId: string, taskId: string, name: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.setName",
      name: name,
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.setName" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&list_id=" + listId +
      "&taskseries_id=" + taskseriesId +
      "&task_id=" + taskId +
      "&name=" + encodeURIComponent(name) +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Set task priority
   */
  async setTaskPriority(listId: string, taskseriesId: string, taskId: string, priority: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.setPriority",
      priority: priority,
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.setPriority" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&list_id=" + listId +
      "&taskseries_id=" + taskseriesId +
      "&task_id=" + taskId +
      "&priority=" + priority +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Set task due date
   */
  async setTaskDueDate(listId: string, taskseriesId: string, taskId: string, due: string): Promise<any> {
    const token = await this.getToken();
    const timeline = await this.getTimeline(token);

    const params: { [key: string]: string } = {
      auth_token: token,
      due: due,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.setDueDate",
      parse: "1",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.setDueDate" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&list_id=" + listId +
      "&taskseries_id=" + taskseriesId +
      "&task_id=" + taskId +
      "&due=" + encodeURIComponent(due) +
      "&parse=1" +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Generate API signature
   */
  private generateApiSig(params: { [key: string]: string }): string {
    let p = "";
    for (const [attr, value] of Object.entries(params)) {
      p += attr + value;
    }

    const q = this.config.apiSecretKey + "api_key" + this.config.apiKey + p;
    return createHash("md5").update(q).toString();
  }

  /**
   * Get token (from config, file, or API)
   */
  private async getToken(): Promise<string> {
    // Try config token first
    if (this.config.token) {
      return this.config.token;
    }

    // Try token file
    if (this.config.tokenPath && existsSync(this.config.tokenPath)) {
      const tokenFromFile = await Deno.readTextFile(this.config.tokenPath);
      return tokenFromFile.replace(/(\r?\n)$/, "");
    }

    throw new Error("No RTM token found. Please set RTM_TOKEN environment variable or authenticate first.");
  }

  /**
   * Get timeline from API
   */
  private async getTimeline(token: string): Promise<string> {
    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.timelines.create",
    };

    const apiSig = this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.timelines.create&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json&api_sig=" + apiSig;

    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text);
    return json.rsp.timeline;
  }

  /**
   * Authenticate and get token (for CLI use)
   */
  async authenticate(): Promise<string> {
    // Get frob
    let params: { [key: string]: string } = {
      format: "json",
      method: "rtm.auth.getFrob",
    };
    let apiSig = this.generateApiSig(params);
    const frob = await this.getFrob(apiSig);

    // Generate auth URL
    params = { frob: frob, perms: "delete" };
    apiSig = this.generateApiSig(params);

    const authUrl = this.AUTH_URL +
      "?api_key=" + this.config.apiKey +
      "&frob=" + frob +
      "&perms=delete" +
      "&api_sig=" + apiSig;

    console.log("Please visit this URL to authorize the application:");
    console.log(authUrl);
    console.log("");
    console.log("Press Enter after authorization...");

    // Wait for user input
    await this.waitForEnter();

    // Get token
    params = { format: "json", frob: frob, method: "rtm.auth.getToken" };
    apiSig = this.generateApiSig(params);
    const token = await this.getTokenFromApi(apiSig, frob);

    // Save token to file if path is specified
    if (this.config.tokenPath) {
      await Deno.writeTextFile(this.config.tokenPath, token);
      console.log(`Token saved to ${this.config.tokenPath}`);
    }

    return token;
  }

  private async getFrob(apiSig: string): Promise<string> {
    const url = this.REST_URL +
      "?method=rtm.auth.getFrob&api_key=" + this.config.apiKey +
      "&format=json&api_sig=" + apiSig;

    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text);
    return json.rsp.frob;
  }

  private async getTokenFromApi(apiSig: string, frob: string): Promise<string> {
    const url = this.REST_URL +
      "?method=rtm.auth.getToken&api_key=" + this.config.apiKey +
      "&format=json&frob=" + frob +
      "&api_sig=" + apiSig;

    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text);
    return json.rsp.auth.token;
  }

  private async waitForEnter(): Promise<void> {
    const buf = new Uint8Array(1024);
    await Deno.stdin.read(buf);
  }
}