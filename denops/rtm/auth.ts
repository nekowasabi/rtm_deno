import { Denops } from "https://deno.land/x/denops_std@v2.4.0/mod.ts";
import { createHash } from "https://deno.land/std@0.120.0/hash/mod.ts";
import { existsSync } from "https://deno.land/std@0.120.0/fs/mod.ts";
import { ensureString } from "https://deno.land/x/unknownutil@v1.1.4/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v2.4.0/variable/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v2.4.0/function/mod.ts";

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

    const name = task == ""
      ? await fn.input(denops, "Input task name: ")
      : task.trim();

    ensureString(name);
    const params: { [index: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.tasks.add",
      name: name.trim(),
      parse: "1",
      timeline: timeline,
    };
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
    return true;
  }

  static async getSettings(denops: Denops): Promise<ApiSetting> {
    // Try environment variables first, then fall back to vim variables
    let apiKey = Deno.env.get("RTM_API_KEY");
    if (!apiKey) {
      let tmp = await vars.g.get(denops, "rtm_api_key");
      ensureString(tmp);
      apiKey = tmp;
    }

    let apiSecretKey = Deno.env.get("RTM_SECRET_KEY");
    if (!apiSecretKey) {
      let tmp = await vars.g.get(denops, "rtm_secret_key");
      ensureString(tmp);
      apiSecretKey = tmp;
    }

    let tokenPath = Deno.env.get("RTM_TOKEN_PATH");
    if (!tokenPath) {
      let tmp = await vars.g.get(denops, "setting_path");
      ensureString(tmp);
      tokenPath = tmp;
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
  static generateApiSig(
    apiKey: string,
    apiSecretKey: string,
    params: { [index: string]: string },
  ): string {
    let p = "";
    for (const [attr, value] of Object.entries(params)) {
      p += attr + value;
    }

    const q: string = apiSecretKey + "api_key" + apiKey + p;
    return createHash("md5").update(q).toString();
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
    let apiSig = this.generateApiSig(apiKey, apiSecretKey, params);
    const frob: string = await this.getFrob(apiSig, apiKey);

    // auth
    params = { frob: frob, perms: "delete" };
    apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

    await this.authorize(apiSig, apiKey, frob, denops);

    // get token
    params = { format: "json", frob: frob, method: "rtm.auth.getToken" };
    apiSig = this.generateApiSig(apiKey, apiSecretKey, params);
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
    const params: { [index: string]: string } = {
      auth_token: token.toString(),
      format: "json",
      method: "rtm.timelines.create",
    };

    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

    const url: string = this.REST_URL +
      "?method=rtm.timelines.create&api_key=" +
      apiKey +
      "&auth_token=" +
      token +
      "&format=json&api_sig=" +
      apiSig;

    const res = await fetch(url).then((response) => {
      return response.body?.getReader();
    });
    if (!res) return "no";

    const str: string = await res.read().then(({ value }) => {
      const d = new TextDecoder();
      return d.decode(value).toString();
    });

    if (!str) return "no";
    const j = JSON.parse(str);
    return j.rsp.timeline;
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

    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
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
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
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
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
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
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
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
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
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
    const apiSig = this.generateApiSig(apiKey, apiSecretKey, params);

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

    await fetch(url, { method: "POST" });
    return true;
  }
}
