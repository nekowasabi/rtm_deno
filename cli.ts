#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write

import { parseArgs } from "https://deno.land/std@0.208.0/cli/parse_args.ts";
import { RtmClient } from "./src/rtm-client.ts";

const COMMANDS = {
  auth: "Authenticate with Remember The Milk",
  add: "Add a new task",
  list: "List tasks (optionally filtered)",
  delete: "Delete a task",
  complete: "Mark a task as completed",
  uncomplete: "Mark a completed task as incomplete",
  "set-name": "Update task name",
  "set-priority": "Set task priority (N, 1, 2, 3)",
  "set-due": "Set task due date",
  help: "Show this help message",
} as const;

type Command = keyof typeof COMMANDS;

function printHelp() {
  console.log("RTM CLI - Remember The Milk Command Line Interface");
  console.log("");
  console.log("Usage: deno run --allow-net --allow-env --allow-read --allow-write cli.ts <command> [options]");
  console.log("");
  console.log("Environment Variables:");
  console.log("  RTM_API_KEY      - Your RTM API key");
  console.log("  RTM_SECRET_KEY   - Your RTM secret key");
  console.log("  RTM_TOKEN_PATH   - Path to store/read token file (default: ~/.rtm_token)");
  console.log("  RTM_TOKEN        - Your RTM token (optional, skips auth)");
  console.log("");
  console.log("Commands:");
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  console.log("");
  console.log("Examples:");
  console.log(`  ${Deno.args[0] || "cli.ts"} auth`);
  console.log(`  ${Deno.args[0] || "cli.ts"} add "Buy groceries"`);
  console.log(`  ${Deno.args[0] || "cli.ts"} list`);
  console.log(`  ${Deno.args[0] || "cli.ts"} list Work                    # List tasks from 'Work' list`);
  console.log(`  ${Deno.args[0] || "cli.ts"} list --filter "priority:1"   # Traditional filter format`);
  console.log(`  ${Deno.args[0] || "cli.ts"} list "priority:1 AND list:Work"  # Complex filter`);
  console.log(`  ${Deno.args[0] || "cli.ts"} complete 123456 789012 345678`);
  console.log(`  ${Deno.args[0] || "cli.ts"} set-name 123456 789012 345678 "Updated task name"`);
  console.log(`  ${Deno.args[0] || "cli.ts"} set-priority 123456 789012 345678 1`);
  console.log(`  ${Deno.args[0] || "cli.ts"} set-due 123456 789012 345678 "tomorrow"`);
}

function formatTaskList(data: any): void {
  if (!data.rsp || !data.rsp.tasks) {
    console.log("No tasks found.");
    return;
  }

  const lists = data.rsp.tasks.list;
  if (!lists || (Array.isArray(lists) && lists.length === 0)) {
    console.log("No tasks found.");
    return;
  }

  const listArray = Array.isArray(lists) ? lists : [lists];
  
  for (const list of listArray) {
    if (!list.taskseries) continue;
    
    const taskseriesArray = Array.isArray(list.taskseries) ? list.taskseries : [list.taskseries];
    
    console.log(`\nList: ${list.name || list.id}`);
    console.log("━".repeat(50));
    
    for (const taskseries of taskseriesArray) {
      const task = Array.isArray(taskseries.task) ? taskseries.task[0] : taskseries.task;
      const isCompleted = task.completed !== "";
      const priority = taskseries.priority === "N" ? "" : `[P${taskseries.priority}]`;
      const dueDate = task.due ? ` (due: ${task.due})` : "";
      const status = isCompleted ? " ✓" : "";
      
      console.log(`${priority} ${taskseries.name}${dueDate}${status}`);
      console.log(`  IDs: list=${list.id}, series=${taskseries.id}, task=${task.id}`);
    }
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["filter"],
    boolean: ["help", "json"],
    alias: {
      h: "help",
      f: "filter",
      j: "json",
    },
  });

  if (args.help || args._.length === 0) {
    printHelp();
    Deno.exit(0);
  }

  const command = args._[0] as Command;

  if (!Object.keys(COMMANDS).includes(command)) {
    console.error(`Unknown command: ${command}`);
    console.error("Run with --help to see available commands.");
    Deno.exit(1);
  }

  try {
    // Help command doesn't need client
    if (command === "help") {
      printHelp();
      return;
    }

    const client = RtmClient.fromEnv();

    switch (command) {
      case "auth": {
        const token = await client.authenticate();
        console.log("Authentication successful!");
        console.log(`Token: ${token}`);
        break;
      }

      case "add": {
        const taskName = args._[1] as string;
        if (!taskName) {
          console.error("Task name is required");
          console.error("Usage: cli.ts add \"Task name\"");
          Deno.exit(1);
        }
        
        const result = await client.addTask(taskName);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Task added: ${taskName}`);
        }
        break;
      }

      case "list": {
        let filter = args.filter as string;
        
        // If no --filter option but has positional argument, treat it as list name or filter
        if (!filter && args._[1]) {
          const arg = args._[1] as string;
          // If argument contains ":", treat it as a filter
          // Otherwise, treat it as a list name
          if (arg.includes(":")) {
            filter = arg;
          } else {
            filter = `list:${arg}`;
          }
        }
        
        const result = await client.getTaskList(filter);
        
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          formatTaskList(result);
        }
        break;
      }

      case "delete": {
        const [listId, taskseriesId, taskId] = args._.slice(1) as string[];
        if (!listId || !taskseriesId || !taskId) {
          console.error("list_id, taskseries_id, and task_id are required");
          console.error("Usage: cli.ts delete <list_id> <taskseries_id> <task_id>");
          Deno.exit(1);
        }
        
        const result = await client.deleteTask(listId, taskseriesId, taskId);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("Task deleted successfully");
        }
        break;
      }

      case "complete": {
        const [listId, taskseriesId, taskId] = args._.slice(1) as string[];
        if (!listId || !taskseriesId || !taskId) {
          console.error("list_id, taskseries_id, and task_id are required");
          console.error("Usage: cli.ts complete <list_id> <taskseries_id> <task_id>");
          Deno.exit(1);
        }
        
        const result = await client.completeTask(listId, taskseriesId, taskId);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("Task completed successfully");
        }
        break;
      }

      case "uncomplete": {
        const [listId, taskseriesId, taskId] = args._.slice(1) as string[];
        if (!listId || !taskseriesId || !taskId) {
          console.error("list_id, taskseries_id, and task_id are required");
          console.error("Usage: cli.ts uncomplete <list_id> <taskseries_id> <task_id>");
          Deno.exit(1);
        }
        
        const result = await client.uncompleteTask(listId, taskseriesId, taskId);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("Task marked as incomplete successfully");
        }
        break;
      }

      case "set-name": {
        const [listId, taskseriesId, taskId, newName] = args._.slice(1) as string[];
        if (!listId || !taskseriesId || !taskId || !newName) {
          console.error("list_id, taskseries_id, task_id, and new_name are required");
          console.error("Usage: cli.ts set-name <list_id> <taskseries_id> <task_id> \"New name\"");
          Deno.exit(1);
        }
        
        const result = await client.setTaskName(listId, taskseriesId, taskId, newName);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Task name updated to: ${newName}`);
        }
        break;
      }

      case "set-priority": {
        const [listId, taskseriesId, taskId, priority] = args._.slice(1) as string[];
        if (!listId || !taskseriesId || !taskId || !priority) {
          console.error("list_id, taskseries_id, task_id, and priority are required");
          console.error("Usage: cli.ts set-priority <list_id> <taskseries_id> <task_id> <priority>");
          console.error("Priority: N (none), 1 (high), 2 (medium), 3 (low)");
          Deno.exit(1);
        }
        
        if (!["N", "1", "2", "3"].includes(priority)) {
          console.error("Priority must be N, 1, 2, or 3");
          Deno.exit(1);
        }
        
        const result = await client.setTaskPriority(listId, taskseriesId, taskId, priority);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const priorityText = priority === "N" ? "none" : 
                              priority === "1" ? "high" :
                              priority === "2" ? "medium" : "low";
          console.log(`Task priority set to: ${priorityText}`);
        }
        break;
      }

      case "set-due": {
        const [listId, taskseriesId, taskId, dueDate] = args._.slice(1) as string[];
        if (!listId || !taskseriesId || !taskId || !dueDate) {
          console.error("list_id, taskseries_id, task_id, and due_date are required");
          console.error("Usage: cli.ts set-due <list_id> <taskseries_id> <task_id> \"due_date\"");
          console.error("Due date examples: \"tomorrow\", \"2024-12-31\", \"next week\"");
          Deno.exit(1);
        }
        
        const result = await client.setTaskDueDate(listId, taskseriesId, taskId, dueDate);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Task due date set to: ${dueDate}`);
        }
        break;
      }

      default:
        console.error(`Command ${command} is not implemented yet`);
        Deno.exit(1);
    }

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}