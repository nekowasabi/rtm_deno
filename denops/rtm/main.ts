import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import { Auth } from "./auth.ts";
import { RtmClient } from "../../src/rtm-client.ts";

const command = (
  denops: Denops,
  command: string,
  opts?: {
    nargs?: string;
    range?: boolean;
  },
) => {
  return {
    command,
    definition: () => {
      const nargs = opts?.nargs ? `-nargs=${opts.nargs}` : "";
      const range = opts?.range ? `-range` : "";
      const cmdOptions = [nargs, range].filter(Boolean).join(" ");
      
      let args = "";
      if (opts?.range && opts?.nargs) {
        // Both range and nargs: combine line numbers with arguments
        args = "[<line1>, <line2>] + [<f-args>]";
      } else if (opts?.range) {
        // Only range: just line numbers
        args = "[<line1>, <line2>]";
      } else if (opts?.nargs === "*") {
        // Multiple arguments
        args = "[<f-args>]";
      } else if (opts?.nargs === "?") {
        // Optional single argument
        args = "[<q-args>]";
      } else if (opts?.nargs === "+") {
        // One or more arguments
        args = "[<f-args>]";
      } else if (opts?.nargs) {
        // Specific number of arguments
        args = "[<f-args>]";
      } else {
        // No arguments
        args = "[]";
      }
      
      return `command! ${cmdOptions} ${command} call denops#notify('${denops.name}', '${command}', ${args})`;
    },
  };
};

export async function main(denops: Denops): Promise<void> {
  console.log("[RTM DEBUG] Starting main function");
  
  // Start with the simplest possible commands
  try {
    console.log("[RTM DEBUG] Registering RtmAuth...");
    await denops.cmd(`command! RtmAuth call denops#notify('${denops.name}', 'RtmAuth', [])`);
    console.log("[RTM DEBUG] RtmAuth registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmAddTask...");
    await denops.cmd(`command! -nargs=* RtmAddTask call denops#notify('${denops.name}', 'RtmAddTask', [<f-args>])`);
    console.log("[RTM DEBUG] RtmAddTask registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmGetTaskList...");
    await denops.cmd(`command! -nargs=* RtmGetTaskList call denops#notify('${denops.name}', 'RtmGetTaskList', [<f-args>])`);
    console.log("[RTM DEBUG] RtmGetTaskList registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmAddSelectedTask...");
    await denops.cmd(`command! -nargs=* -range RtmAddSelectedTask call denops#notify('${denops.name}', 'RtmAddSelectedTask', [<line1>, <line2>] + [<f-args>])`);
    console.log("[RTM DEBUG] RtmAddSelectedTask registered successfully");
    
    // Test RtmDeleteTask with -nargs=* instead of -nargs=3
    console.log("[RTM DEBUG] Registering RtmDeleteTask...");
    await denops.cmd(`command! -nargs=* RtmDeleteTask call denops#notify('${denops.name}', 'RtmDeleteTask', [<f-args>])`);
    console.log("[RTM DEBUG] RtmDeleteTask registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmCompleteTask...");
    await denops.cmd(`command! -nargs=* RtmCompleteTask call denops#notify('${denops.name}', 'RtmCompleteTask', [<f-args>])`);
    console.log("[RTM DEBUG] RtmCompleteTask registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmUncompleteTask...");
    await denops.cmd(`command! -nargs=* RtmUncompleteTask call denops#notify('${denops.name}', 'RtmUncompleteTask', [<f-args>])`);
    console.log("[RTM DEBUG] RtmUncompleteTask registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmSetTaskName...");
    await denops.cmd(`command! -nargs=* RtmSetTaskName call denops#notify('${denops.name}', 'RtmSetTaskName', [<f-args>])`);
    console.log("[RTM DEBUG] RtmSetTaskName registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmSetTaskPriority...");
    await denops.cmd(`command! -nargs=* RtmSetTaskPriority call denops#notify('${denops.name}', 'RtmSetTaskPriority', [<f-args>])`);
    console.log("[RTM DEBUG] RtmSetTaskPriority registered successfully");
    
    console.log("[RTM DEBUG] Registering RtmSetTaskDueDate...");
    await denops.cmd(`command! -nargs=* RtmSetTaskDueDate call denops#notify('${denops.name}', 'RtmSetTaskDueDate', [<f-args>])`);
    console.log("[RTM DEBUG] RtmSetTaskDueDate registered successfully");
    
  } catch (error) {
    console.error("[RTM DEBUG] Command registration failed:", error);
    throw error;
  }

  denops.dispatcher = {
    async RtmAuth(): Promise<unknown> {
      return await auth(denops);
    },
    
    async RtmAddTask(...args: unknown[]): Promise<unknown> {
      return await addTask(denops, ...args);
    },
    
    async RtmGetTaskList(...args: unknown[]): Promise<unknown> {
      return await getTaskList(denops, ...args);
    },
    
    async RtmAddSelectedTask(...args: unknown[]): Promise<unknown> {
      return await addSelectedTask(denops, ...args);
    },
    
    async RtmDeleteTask(...args: unknown[]): Promise<unknown> {
      return await deleteTask(denops, ...args);
    },
    
    async RtmCompleteTask(...args: unknown[]): Promise<unknown> {
      return await completeTask(denops, ...args);
    },
    
    async RtmUncompleteTask(...args: unknown[]): Promise<unknown> {
      return await uncompleteTask(denops, ...args);
    },
    
    async RtmSetTaskName(...args: unknown[]): Promise<unknown> {
      return await setTaskName(denops, ...args);
    },
    
    async RtmSetTaskPriority(...args: unknown[]): Promise<unknown> {
      return await setTaskPriority(denops, ...args);
    },
    
    async RtmSetTaskDueDate(...args: unknown[]): Promise<unknown> {
      return await setTaskDueDate(denops, ...args);
    },
  };
  
  console.log("[RTM DEBUG] Plugin initialized successfully");
}

async function auth(denops: Denops): Promise<unknown> {
  const { tokenPath } = await Auth.getSettings(denops);
  const token = await Auth.generateToken(denops);

  try {
    Auth.saveTokenFromFile(tokenPath, token);
  } catch (e) {
    console.error(e);
  }

  return await Promise.resolve("Authorized complete.");
}

async function addTask(denops: Denops, ...args: unknown[]): Promise<unknown> {
  const startTime = Date.now();
  console.log("[RTM DEBUG] addTask called with args:", args, "at", new Date().toISOString());
  console.log("[RTM DEBUG] args length:", args.length);
  
  // Join all arguments into a single task name
  const taskName = args.length > 0 ? args.map(arg => String(arg)).join(" ").trim() : "";
  console.log("[RTM DEBUG] taskName after conversion:", taskName);
  console.log("[RTM DEBUG] taskName length:", taskName.length);
  
  if (!taskName || taskName === "") {
    console.log("[RTM DEBUG] Empty task name, skipping add");
    return Promise.resolve("Empty task name provided.");
  }
  
  console.log("[RTM DEBUG] Calling Auth.addTask with:", taskName);
  try {
    const result = await Auth.addTask(denops, taskName);
    console.log("[RTM DEBUG] Auth.addTask result:", result);
  } catch (error) {
    console.error("[RTM DEBUG] Auth.addTask error:", error);
    throw error;
  }

  await denops.cmd(`redraw`);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log("[RTM DEBUG] addTask completed at", new Date().toISOString(), "duration:", duration + "ms");
  return await Promise.resolve(" add task complete.");
}

async function addSelectedTask(denops: Denops, ...args: unknown[]): Promise<unknown> {
  const startTime = Date.now();
  console.log("[RTM DEBUG] addSelectedTask called with args:", args, "at", new Date().toISOString());
  
  // Args format: [line1, line2, ...additional_args]
  if (args.length < 2) {
    throw new Error("addSelectedTask requires at least 2 arguments: start, end");
  }
  
  const start = Number(args[0]);
  const end = Number(args[1]);
  
  console.log("[RTM DEBUG] Processing lines", start, "to", end, "at", new Date().toISOString());
  
  if (isNaN(start) || isNaN(end)) {
    console.error("[RTM DEBUG] Invalid line numbers:", start, end);
    return Promise.resolve("Invalid line numbers provided.");
  }
  
  try {
    const words = await denops.call("getline", start, end);
    ensure(words, is.Array);
    const wordArray = words as string[];

    console.log("[RTM DEBUG] Processing", wordArray.length, "lines for batch task addition");

    // Filter out empty lines
    const taskNames = wordArray
      .map(word => (word as string).trim())
      .filter(taskName => taskName !== "");
    
    if (taskNames.length === 0) {
      console.log("[RTM DEBUG] No valid task names found");
      return Promise.resolve("No valid task names found in selected text.");
    }

    console.log("[RTM DEBUG] Found", taskNames.length, "valid task names:", taskNames);

    // Get settings and timeline once for all tasks (more efficient)
    console.log("[RTM DEBUG] Getting RTM settings and timeline...");
    const client = RtmClient.fromEnv();
    
    let addedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < taskNames.length; i++) {
      const taskName = taskNames[i];
      console.log("[RTM DEBUG] Adding task", (i + 1) + "/" + taskNames.length + ":", taskName, "at", new Date().toISOString());
      
      try {
        const taskStartTime = Date.now();
        // Use the optimized addTaskWithTimeline method to reuse timeline
        const result = await Auth.addTaskWithClient(
          denops,
          taskName,
          client,
        );
        const taskEndTime = Date.now();
        const taskDuration = taskEndTime - taskStartTime;
        
        if (result) {
          addedCount++;
          console.log("[RTM DEBUG] ✅ Successfully added task:", taskName, "in", taskDuration + "ms");
        } else {
          failedCount++;
          console.error("[RTM DEBUG] ❌ Failed to add task:", taskName, "after", taskDuration + "ms");
        }
        
        // Redraw after each task
        await denops.cmd(`redraw`);
        
      } catch (error) {
        failedCount++;
        console.error("[RTM DEBUG] ❌ Exception adding task:", taskName, error);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("[RTM DEBUG] Batch task addition completed:");
    console.log("[RTM DEBUG] - Total tasks processed:", taskNames.length);
    console.log("[RTM DEBUG] - Successfully added:", addedCount);
    console.log("[RTM DEBUG] - Failed:", failedCount);
    console.log("[RTM DEBUG] - Duration:", duration + "ms");
    
    const message = `Added ${addedCount}/${taskNames.length} tasks from selected text.` + 
                   (failedCount > 0 ? ` ${failedCount} tasks failed.` : "");
    
    return Promise.resolve(message);
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error("[RTM DEBUG] addSelectedTask error:", error, "at", new Date().toISOString(), "duration:", duration + "ms");
    throw error;
  }
}

async function getTaskList(denops: Denops, ...args: unknown[]): Promise<unknown> {
  let filterStr = "";
  
  if (args.length === 0) {
    // No arguments - get all tasks
    filterStr = "";
  } else if (args.length === 1) {
    const arg = String(args[0]);
    // If argument contains ":", treat it as a filter
    // Otherwise, treat it as a list name
    if (arg.includes(":")) {
      filterStr = arg;
    } else {
      filterStr = `list:${arg}`;
    }
  } else {
    // Multiple arguments - join them as a single filter
    filterStr = args.map(arg => String(arg)).join(" ");
  }
  
  const result = await Auth.getTaskList(denops, filterStr);
  console.log(JSON.stringify(result, null, 2));
  return Promise.resolve("Task list retrieved.");
}

async function deleteTask(denops: Denops, ...args: unknown[]): Promise<unknown> {
  console.log("[RTM DEBUG] deleteTask called with args:", args);
  
  if (args.length !== 3) {
    throw new Error("deleteTask requires 3 arguments: listId, taskseriesId, taskId");
  }
  
  const [listId, taskseriesId, taskId] = args;
  ensure(listId, is.String);
  ensure(taskseriesId, is.String);
  ensure(taskId, is.String);
  
  try {
    await Auth.deleteTask(denops, listId as string, taskseriesId as string, taskId as string);
    await denops.cmd(`redraw`);
    return Promise.resolve("Task deleted.");
  } catch (error) {
    console.error("[RTM DEBUG] deleteTask error:", error);
    throw error;
  }
}

async function completeTask(denops: Denops, ...args: unknown[]): Promise<unknown> {
  console.log("[RTM DEBUG] completeTask called with args:", args);
  
  if (args.length !== 3) {
    throw new Error("completeTask requires 3 arguments: listId, taskseriesId, taskId");
  }
  
  const [listId, taskseriesId, taskId] = args;
  ensure(listId, is.String);
  ensure(taskseriesId, is.String);
  ensure(taskId, is.String);
  
  try {
    await Auth.completeTask(denops, listId as string, taskseriesId as string, taskId as string);
    await denops.cmd(`redraw`);
    return Promise.resolve("Task completed.");
  } catch (error) {
    console.error("[RTM DEBUG] completeTask error:", error);
    throw error;
  }
}

async function uncompleteTask(denops: Denops, ...args: unknown[]): Promise<unknown> {
  console.log("[RTM DEBUG] uncompleteTask called with args:", args);
  
  if (args.length !== 3) {
    throw new Error("uncompleteTask requires 3 arguments: listId, taskseriesId, taskId");
  }
  
  const [listId, taskseriesId, taskId] = args;
  ensure(listId, is.String);
  ensure(taskseriesId, is.String);
  ensure(taskId, is.String);
  
  try {
    await Auth.uncompleteTask(denops, listId as string, taskseriesId as string, taskId as string);
    await denops.cmd(`redraw`);
    return Promise.resolve("Task uncompleted.");
  } catch (error) {
    console.error("[RTM DEBUG] uncompleteTask error:", error);
    throw error;
  }
}

async function setTaskName(denops: Denops, ...args: unknown[]): Promise<unknown> {
  console.log("[RTM DEBUG] setTaskName called with args:", args);
  
  if (args.length < 4) {
    throw new Error("setTaskName requires 4+ arguments: listId, taskseriesId, taskId, name...");
  }
  
  const [listId, taskseriesId, taskId, ...nameParts] = args;
  ensure(listId, is.String);
  ensure(taskseriesId, is.String);
  ensure(taskId, is.String);
  
  // Join remaining arguments as task name (in case the name contains spaces)
  const name = nameParts.map(part => {
    ensure(part, is.String);
    return part;
  }).join(" ");
  
  try {
    await Auth.setTaskName(denops, listId as string, taskseriesId as string, taskId as string, name);
    await denops.cmd(`redraw`);
    return Promise.resolve("Task name updated.");
  } catch (error) {
    console.error("[RTM DEBUG] setTaskName error:", error);
    throw error;
  }
}

async function setTaskPriority(denops: Denops, ...args: unknown[]): Promise<unknown> {
  console.log("[RTM DEBUG] setTaskPriority called with args:", args);
  
  if (args.length !== 4) {
    throw new Error("setTaskPriority requires 4 arguments: listId, taskseriesId, taskId, priority");
  }
  
  const [listId, taskseriesId, taskId, priority] = args;
  ensure(listId, is.String);
  ensure(taskseriesId, is.String);
  ensure(taskId, is.String);
  ensure(priority, is.String);
  
  try {
    await Auth.setTaskPriority(denops, listId as string, taskseriesId as string, taskId as string, priority as string);
    await denops.cmd(`redraw`);
    return Promise.resolve("Task priority updated.");
  } catch (error) {
    console.error("[RTM DEBUG] setTaskPriority error:", error);
    throw error;
  }
}

async function setTaskDueDate(denops: Denops, ...args: unknown[]): Promise<unknown> {
  console.log("[RTM DEBUG] setTaskDueDate called with args:", args);
  
  if (args.length < 4) {
    throw new Error("setTaskDueDate requires 4+ arguments: listId, taskseriesId, taskId, due...");
  }
  
  const [listId, taskseriesId, taskId, ...dueParts] = args;
  ensure(listId, is.String);
  ensure(taskseriesId, is.String);
  ensure(taskId, is.String);
  
  // Join remaining arguments as due date (in case it contains spaces like "next week")
  const due = dueParts.map(part => {
    ensure(part, is.String);
    return part;
  }).join(" ");
  
  try {
    await Auth.setTaskDueDate(denops, listId as string, taskseriesId as string, taskId as string, due);
    await denops.cmd(`redraw`);
    return Promise.resolve("Task due date updated.");
  } catch (error) {
    console.error("[RTM DEBUG] setTaskDueDate error:", error);
    throw error;
  }
}