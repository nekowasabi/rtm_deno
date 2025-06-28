import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import { existsSync } from "https://deno.land/std@0.120.0/fs/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v6.5.0/variable/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

type ApiSetting = {
  apiKey: string;
  apiSecretKey: string;
  tokenPath: string;
};

export class Auth {
  static readonly AUTH_URL: string =
    "http://www.rememberthemilk.com/services/auth/";
  static readonly REST_URL: string =
    "https://api.rememberthemilk.com/services/rest/";

  constructor() {}

  /**
   * Add single task
   *
   * @param Denops denops
   * @param string task task name
   * @return boolean
   */
  static async addTask(denops: Denops, task: string): Promise<boolean> {
    console.log("[RTM DEBUG] Auth.addTask called with task:", task);
    
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);
    console.log("[RTM DEBUG] Auth.addTask got settings");

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );
    console.log("[RTM DEBUG] Auth.addTask got token");

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );
    console.log("[RTM DEBUG] Auth.addTask got timeline:", timeline);

    const name = task == ""
      ? await fn.input(denops, "Input task name: ")
      : task.trim();
    console.log("[RTM DEBUG] Auth.addTask final name:", name);

    ensure(name, is.String);
    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.add",
      name: name.trim(),
      parse: "1",
      timeline: timeline,
    };
    console.log("[RTM DEBUG] Auth.addTask params:", params);
    
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);
    console.log("[RTM DEBUG] Auth.addTask generated API signature");

    const url = this.REST_URL +
      "?method=rtm.tasks.add" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&name=" +
      encodeURIComponent(name) +
      "&parse=1" +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    console.log("[RTM DEBUG] Auth.addTask final URL:", url);
    
    try {
      console.log("[RTM DEBUG] Auth.addTask starting fetch...");
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("[RTM DEBUG] Auth.addTask timeout reached, aborting...");
        controller.abort();
      }, 30000); // 30 second timeout for task creation
      
      const response = await fetch(url, { 
        method: "POST",
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log("[RTM DEBUG] Auth.addTask response status:", response.status);
      console.log("[RTM DEBUG] Auth.addTask response text:", responseText);
      
      if (!response.ok) {
        console.error("[RTM DEBUG] Auth.addTask failed with status:", response.status);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("[RTM DEBUG] Auth.addTask fetch error:", error);
      return false;
    }
  }

  /**
   * Add task with pre-fetched timeline
   *
   * @param Denops denops
   * @param string task task name
   * @param string apiKey API key
   * @param string apiSecretKey API secret key
   * @param string token auth token
   * @param string timeline timeline
   * @return boolean
   */
  static async addTaskWithTimeline(
    denops: Denops,
    task: string,
    apiKey: string,
    apiSecretKey: string,
    token: string,
    timeline: string
  ): Promise<boolean> {
    console.log("[RTM DEBUG] Auth.addTaskWithTimeline called with task:", task);

    const name = task.trim();
    if (!name) {
      console.log("[RTM DEBUG] Empty task name, skipping");
      return false;
    }

    ensure(name, is.String);
    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.add",
      name: name.trim(),
      parse: "1",
      timeline: timeline,
    };
    console.log("[RTM DEBUG] Auth.addTaskWithTimeline params:", params);
    
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);
    console.log("[RTM DEBUG] Auth.addTaskWithTimeline generated API signature");

    const url = this.REST_URL +
      "?method=rtm.tasks.add" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&name=" +
      encodeURIComponent(name) +
      "&parse=1" +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    console.log("[RTM DEBUG] Auth.addTaskWithTimeline final URL:", url);
    
    try {
      console.log("[RTM DEBUG] Auth.addTaskWithTimeline starting fetch...");
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("[RTM DEBUG] Auth.addTaskWithTimeline timeout reached, aborting...");
        controller.abort();
      }, 15000); // 15 second timeout for task creation
      
      const response = await fetch(url, { 
        method: "POST",
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log("[RTM DEBUG] Auth.addTaskWithTimeline response status:", response.status);
      console.log("[RTM DEBUG] Auth.addTaskWithTimeline response text:", responseText);
      
      if (!response.ok) {
        console.error("[RTM DEBUG] Auth.addTaskWithTimeline failed with status:", response.status);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("[RTM DEBUG] Auth.addTaskWithTimeline fetch error:", error);
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
   * Generate Api signiture
   *
   * @param string apiKey RTM API key
   * @param string apiSecretKey RTM Secret API key
   * @param string[] params
   * @return string
   */
  static async generateApiSig(
    apiKey: string,
    apiSecretKey: string,
    params: { [index: string]: string },
  ): Promise<string> {
    let p = "";
    for (const [attr, value] of Object.entries(params)) {
      p += attr + value;
    }

    const q: string = apiSecretKey + "api_key" + apiKey + p;
    
    // Use crypto.subtle.digest for MD5 implementation
    const encoder = new TextEncoder();
    const data = encoder.encode(q);
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate API token
   *
   * @param string apiKey RTMのAPIキー
   * @param string apiKey RTM API key
   * @param string apiSecretKey RTM Secret API key
   * @param string filePath file path for .rtm_token
   * @param Denops denops
   * @return string
   */
  static async generateToken(
    apiKey: string,
    apiSecretKey: string,
    filePath: string,
    denops: Denops,
  ): Promise<string> {
    // Try environment variable first
    const tokenFromEnv = Deno.env.get("RTM_TOKEN");
    if (tokenFromEnv) {
      return Promise.resolve(tokenFromEnv);
    }

    const tokenFromFile = await this.getTokenFromFile(filePath);
    if (tokenFromFile !== undefined) {
      return Promise.resolve(tokenFromFile.replace(/(\r?\n)$/, ""));
    }

    // get frob
    let params: { [index: string]: string } = {
      format: "json",
      method: "rtm.auth.getFrob",
    };
    let apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);
    const frob: string = await this.getFrob(apiSig, apiKey);

    // auth
    params = { frob: frob, perms: "delete" };
    apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    await this.authorize(apiSig, apiKey, frob, denops);

    // get token
    params = { format: "json", frob: frob, method: "rtm.auth.getToken" };
    apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);
    return Promise.resolve(await this.getTokenFromApi(apiSig, apiKey, frob));
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
   * Generate frob
   *
   * @param string apiSig API signiture for frob
   * @param string apiKey RTM API key
   * @return string
   */
  static async getFrob(apiSig: string, apiKey: string): Promise<string> {
    const url = this.REST_URL +
      "?method=rtm.auth.getFrob&api_key=" +
      apiKey +
      "&format=json" +
      "&api_sig=" +
      apiSig;

    const res = await fetch(url).then((response) => {
      return response.body?.getReader();
    });
    if (!res) return "no";

    const str: string = await res.read().then(({ value }) => {
      const d = new TextDecoder();
      return d.decode(value).toString();
    });
    const j = JSON.parse(str);
    return j.rsp.frob;
  }

  /**
   * Authorize
   *
   * @param string apiSig API signiture for frob
   * @param string apiKey RTM API key
   * @param string frob frob for RTM
   * @param Denops denops
   * @return void
   */
  static async authorize(
    apiSig: string,
    apiKey: string,
    frob: string,
    denops: Denops,
  ): Promise<void> {
    const url: string = this.AUTH_URL +
      "?api_key=" +
      apiKey +
      "&frob=" +
      frob +
      "&perms=delete" +
      "&api_sig=" +
      apiSig;

    await denops.call("OpenBrowser", url);

    await denops.call(
      "input",
      "If authorization in browser, enter return key : ",
    );
  }

  /**
   * Get token from API
   *
   * @param string apiSig API signiture for frob
   * @param string apiKey RTM API key
   * @param string frob
   * @return void
   */
  static async getTokenFromApi(
    apiSig: string,
    apiKey: string,
    frob: string,
  ): Promise<string> {
    const url = this.REST_URL +
      "?method=rtm.auth.getToken&api_key=" +
      apiKey +
      "&format=json" +
      "&frob=" +
      frob +
      "&api_sig=" +
      apiSig;

    const res = await fetch(url).then((response) => {
      return response.body?.getReader();
    });
    if (!res) return "no";

    const str: string = await res.read().then(({ value }) => {
      const d = new TextDecoder();
      return d.decode(value).toString();
    });
    const j = JSON.parse(str);
    return j.rsp.auth.token;
  }

  /**
   * Generate timeline token
   *
   * @param string apiKey RTM API key
   * @param string apiSecretKey RTM Secret API key
   * @param string token token for RTM
   * @return string
   */
  static async getTimelineFromApi(
    apiKey: string,
    apiSecretKey: string,
    token: string,
  ) {
    console.log("[RTM DEBUG] getTimelineFromApi called");
    
    const params: { [index: string]: string } = {
      auth_token: token.toString(),
      format: "json",
      method: "rtm.timelines.create",
    };

    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);
    console.log("[RTM DEBUG] getTimelineFromApi generated API signature");

    const url: string = this.REST_URL +
      "?method=rtm.timelines.create&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json&api_sig=" +
      apiSig;

    console.log("[RTM DEBUG] getTimelineFromApi URL:", url);

    try {
      console.log("[RTM DEBUG] getTimelineFromApi starting fetch...");
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("[RTM DEBUG] getTimelineFromApi timeout reached, aborting...");
        controller.abort();
      }, 30000); // 30 second timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log("[RTM DEBUG] getTimelineFromApi response status:", response.status);
      
      if (!response.ok) {
        console.error("[RTM DEBUG] getTimelineFromApi HTTP error:", response.status, response.statusText);
        return "no";
      }
      
      const str = await response.text();
      console.log("[RTM DEBUG] getTimelineFromApi response text:", str);

      if (!str) {
        console.error("[RTM DEBUG] getTimelineFromApi empty response");
        return "no";
      }
      
      const j = JSON.parse(str);
      console.log("[RTM DEBUG] getTimelineFromApi parsed response:", j);
      
      if (j.rsp && j.rsp.timeline) {
        console.log("[RTM DEBUG] getTimelineFromApi timeline:", j.rsp.timeline);
        return j.rsp.timeline;
      } else {
        console.error("[RTM DEBUG] getTimelineFromApi no timeline in response");
        return "no";
      }
    } catch (error) {
      console.error("[RTM DEBUG] getTimelineFromApi error:", error);
      return "no";
    }
  }

  /**
   * Get task list
   *
   * @param Denops denops
   * @param string filter optional filter for tasks
   * @return object
   */
  static async getTaskList(denops: Denops, filter = ""): Promise<any> {
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.getList",
    };

    if (filter) {
      params.filter = filter;
    }

    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    let url = this.REST_URL +
      "?method=rtm.tasks.getList" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&api_sig=" +
      apiSig;

    if (filter) {
      url += "&filter=" + encodeURIComponent(filter);
    }

    const response = await fetch(url);
    const text = await response.text();
    return JSON.parse(text);
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
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );

    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.delete",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    const url = this.REST_URL +
      "?method=rtm.tasks.delete" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&list_id=" +
      listId +
      "&taskseries_id=" +
      taskseriesId +
      "&task_id=" +
      taskId +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    const response = await fetch(url, { method: "POST" });
    await response.text(); // Consume the response body to prevent leaks
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
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );

    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.complete",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    const url = this.REST_URL +
      "?method=rtm.tasks.complete" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&list_id=" +
      listId +
      "&taskseries_id=" +
      taskseriesId +
      "&task_id=" +
      taskId +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    const response = await fetch(url, { method: "POST" });
    await response.text(); // Consume the response body to prevent leaks
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
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );

    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.uncomplete",
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    const url = this.REST_URL +
      "?method=rtm.tasks.uncomplete" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&list_id=" +
      listId +
      "&taskseries_id=" +
      taskseriesId +
      "&task_id=" +
      taskId +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    const response = await fetch(url, { method: "POST" });
    await response.text(); // Consume the response body to prevent leaks
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
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );

    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.setName",
      name: name,
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    const url = this.REST_URL +
      "?method=rtm.tasks.setName" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&list_id=" +
      listId +
      "&taskseries_id=" +
      taskseriesId +
      "&task_id=" +
      taskId +
      "&name=" +
      encodeURIComponent(name) +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    const response = await fetch(url, { method: "POST" });
    await response.text(); // Consume the response body to prevent leaks
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
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );

    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      list_id: listId,
      method: "rtm.tasks.setPriority",
      priority: priority,
      task_id: taskId,
      taskseries_id: taskseriesId,
      timeline: timeline,
    };
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    const url = this.REST_URL +
      "?method=rtm.tasks.setPriority" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&list_id=" +
      listId +
      "&taskseries_id=" +
      taskseriesId +
      "&task_id=" +
      taskId +
      "&priority=" +
      priority +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    const response = await fetch(url, { method: "POST" });
    await response.text(); // Consume the response body to prevent leaks
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
    const { apiKey, apiSecretKey, tokenPath } = await this.getSettings(denops);

    const token: string = await this.generateToken(
      apiKey,
      apiSecretKey,
      tokenPath,
      denops,
    );

    const timeline: string = await this.getTimelineFromApi(
      apiKey,
      apiSecretKey,
      token,
    );

    const params: { [index: string]: string } = {
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
    const apiSig = await this.generateApiSig(apiKey, apiSecretKey, params);

    const url = this.REST_URL +
      "?method=rtm.tasks.setDueDate" +
      "&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json" +
      "&list_id=" +
      listId +
      "&taskseries_id=" +
      taskseriesId +
      "&task_id=" +
      taskId +
      "&due=" +
      encodeURIComponent(due) +
      "&parse=1" +
      "&timeline=" +
      timeline +
      "&api_sig=" +
      apiSig;

    const response = await fetch(url, { method: "POST" });
    await response.text(); // Consume the response body to prevent leaks
    return true;
  }
}
