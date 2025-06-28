import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
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
  private readonly API_TIMEOUT = 180000; // 3 minutes - RTM tasks.getList can be extremely slow
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests (RTM API requirement)
  private readonly MAX_RETRIES = 3;
  
  private config: RtmConfig;
  private lastRequestTime = 0;
  private timelineCache: { [token: string]: { timeline: string; timestamp: number } } = {};
  private readonly TIMELINE_CACHE_TTL = 1800000; // 30 minutes (longer cache)

  constructor(config: RtmConfig) {
    this.config = config;
    // Initialize with current time to ensure first request waits the full delay
    this.lastRequestTime = Date.now();
  }

  /**
   * Apply rate limiting (exactly 1 request per second as required by RTM API)
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Always wait at least 1 second between requests (RTM API requirement)
    const waitTime = Math.max(this.RATE_LIMIT_DELAY - timeSinceLastRequest, 0);
    
    if (waitTime > 0) {
      if (Deno.env.get("RTM_DEBUG")) {
        console.log(`Rate limiting: waiting ${waitTime}ms (RTM API: 1 req/sec)...`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make API request with rate limiting, timeout and retry logic
   */
  private async makeApiRequest(url: string, method: "GET" | "POST" = "GET", retryCount = 0): Promise<any> {
    // Apply rate limiting
    await this.applyRateLimit();
    
    if (Deno.env.get("RTM_DEBUG")) {
      console.log(`Making ${method} request to: ${url.substring(0, 100)}...`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

    try {
      const startTime = Date.now();
      
      if (Deno.env.get("RTM_DEBUG")) {
        console.log(`Starting ${method} request at ${new Date().toISOString()}`);
        console.log(`Timeout set to: ${this.API_TIMEOUT}ms`);
      }
      
      const response = await fetch(url, { 
        method, 
        signal: controller.signal,
        headers: {
          'User-Agent': 'rtm_deno/1.0 (Deno RTM Client)',
        }
      });
      const duration = Date.now() - startTime;
      
      if (Deno.env.get("RTM_DEBUG")) {
        console.log(`Response received in ${duration}ms, status: ${response.status}`);
      }
      
      // Handle rate limit exceeded (503)
      if (response.status === 503) {
        if (retryCount < this.MAX_RETRIES) {
          const waitTime = (retryCount + 2) * 1000;
          console.warn(`RTM API rate limit exceeded, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.makeApiRequest(url, method, retryCount + 1);
        } else {
          throw new Error("RTM API rate limit exceeded. Please wait and try again later.");
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const json = JSON.parse(text);
      
      if (json.rsp && json.rsp.stat === "fail") {
        const errorMsg = json.rsp.err?.msg || "Unknown RTM API error";
        const errorCode = json.rsp.err?.code || "unknown";
        throw new Error(`RTM API Error (${errorCode}): ${errorMsg}`);
      }
      
      return json;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`RTM API request timed out after ${this.API_TIMEOUT}ms.\n` +
          `This could be due to:\n` +
          `1. RTM API server issues (try again later)\n` +
          `2. Network connectivity problems\n` +
          `3. Rate limiting (wait a few minutes)\n` +
          `4. Firewall/proxy blocking the request`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
    const apiSig = await this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.tasks.add" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&name=" + encodeURIComponent(taskName) +
      "&parse=1" +
      "&timeline=" + timeline +
      "&api_sig=" + apiSig;

    return await this.makeApiRequest(url, "POST");
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

    const apiSig = await this.generateApiSig(params);

    let url = this.REST_URL +
      "?method=rtm.tasks.getList" +
      "&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json" +
      "&api_sig=" + apiSig;

    if (filter) {
      url += "&filter=" + encodeURIComponent(filter);
    }

    return await this.makeApiRequest(url, "GET");
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
    const apiSig = await this.generateApiSig(params);

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
    const apiSig = await this.generateApiSig(params);

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
    const apiSig = await this.generateApiSig(params);

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
    const apiSig = await this.generateApiSig(params);

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
    const apiSig = await this.generateApiSig(params);

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
    const apiSig = await this.generateApiSig(params);

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
  private async generateApiSig(params: { [key: string]: string }): Promise<string> {
    // Sort parameters alphabetically by key (required by RTM API)
    const sortedKeys = Object.keys(params).sort();
    let p = "";
    for (const key of sortedKeys) {
      p += key + params[key];
    }

    const q = this.config.apiSecretKey + "api_key" + this.config.apiKey + p;
    
    if (Deno.env.get("RTM_DEBUG")) {
      console.log("Signature string:", q.substring(0, 100) + "...");
    }
    
    // Use crypto.subtle.digest for MD5 implementation
    const encoder = new TextEncoder();
    const data = encoder.encode(q);
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
   * Get timeline from API (with caching and shorter timeout)
   */
  private async getTimeline(token: string): Promise<string> {
    const now = Date.now();
    
    // Check cache first
    const cached = this.timelineCache[token];
    if (cached && (now - cached.timestamp) < this.TIMELINE_CACHE_TTL) {
      if (Deno.env.get("RTM_DEBUG")) {
        console.log(`Using cached timeline: ${cached.timeline}`);
      }
      return cached.timeline;
    }

    const params: { [key: string]: string } = {
      auth_token: token,
      format: "json",
      method: "rtm.timelines.create",
    };

    const apiSig = await this.generateApiSig(params);

    const url = this.REST_URL +
      "?method=rtm.timelines.create&api_key=" + this.config.apiKey +
      "&auth_token=" + token +
      "&format=json&api_sig=" + apiSig;

    // Use shorter timeout for timeline creation and retry
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (Deno.env.get("RTM_DEBUG")) {
          console.log(`Creating timeline (attempt ${attempt}/3)...`);
        }
        
        const json = await this.makeTimelineRequest(url);
        const timeline = json.rsp.timeline;
        
        // Cache the timeline
        this.timelineCache[token] = {
          timeline,
          timestamp: now
        };
        
        if (Deno.env.get("RTM_DEBUG")) {
          console.log(`Timeline created successfully: ${timeline}`);
        }
        
        return timeline;
      } catch (error) {
        lastError = error as Error;
        if (attempt < 3) {
          const retryWaitTime = attempt * 1000; // 1s, 2s (in addition to rate limiting)
          console.warn(`Timeline creation attempt ${attempt} failed, retrying in ${retryWaitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryWaitTime));
        }
      }
    }
    
    throw new Error(`Failed to create timeline after 3 attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Make timeline request with shorter timeout
   */
  private async makeTimelineRequest(url: string): Promise<any> {
    await this.applyRateLimit();
    
    const controller = new AbortController();
    const shortTimeout = 10000; // 10 seconds for timeline
    const timeoutId = setTimeout(() => controller.abort(), shortTimeout);

    try {
      const response = await fetch(url, { 
        method: "GET", 
        signal: controller.signal,
        headers: {
          'User-Agent': 'rtm_deno/1.0 (Deno RTM Client)',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const json = JSON.parse(text);
      
      if (json.rsp && json.rsp.stat === "fail") {
        const errorMsg = json.rsp.err?.msg || "Unknown RTM API error";
        const errorCode = json.rsp.err?.code || "unknown";
        throw new Error(`RTM API Error (${errorCode}): ${errorMsg}`);
      }
      
      return json;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`Timeline creation timed out after ${shortTimeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
    let apiSig = await this.generateApiSig(params);
    const frob = await this.getFrob(apiSig);

    // Generate auth URL
    params = { frob: frob, perms: "delete" };
    apiSig = await this.generateApiSig(params);

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
    apiSig = await this.generateApiSig(params);
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