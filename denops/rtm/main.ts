import { Denops } from "https://deno.land/x/denops_std@v2.4.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v2.4.0/helper/mod.ts";
import { Auth } from "./auth.ts";
import {
  ensureArray,
  ensureString,
} from "https://deno.land/x/unknownutil@v1.1.4/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async auth(): Promise<unknown> {
      const { apiKey, apiSecretKey, tokenPath } = await Auth.getSettings(
        denops,
      );

      const token: string = await Auth.generateToken(
        apiKey,
        apiSecretKey,
        tokenPath,
        denops,
      );

      try {
        Auth.saveTokenFromFile(tokenPath, token);
      } catch (e) {
        console.error(e);
      }

      return await Promise.resolve("Authorized complete.");
    },

    async addTask(task: unknown): Promise<unknown> {
      const taskName = task ? String(task) : "";
      await Auth.addTask(denops, taskName);

      await denops.cmd(`redraw`);
      return await Promise.resolve(" add task complete.");
    },

    async addSelectedTask(...args: unknown[]): Promise<void> {
      if (args.length < 2) {
        throw new Error("addSelectedTask requires at least 2 arguments: start, end");
      }
      const [start, end] = args;
      const words = await denops.call("getline", start, end);
      ensureArray(words);

      for (const word of words) {
        ensureString(word);
        if (word !== "") {
          await Auth.addTask(denops, word);
          await denops.cmd(`redraw`);
        }
      }
    },

    async getTaskList(filter: unknown): Promise<unknown> {
      const filterStr = filter ? String(filter) : "";
      const result = await Auth.getTaskList(denops, filterStr);
      console.log(JSON.stringify(result, null, 2));
      return Promise.resolve("Task list retrieved.");
    },

    async deleteTask(listId: unknown, taskseriesId: unknown, taskId: unknown): Promise<unknown> {
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      await Auth.deleteTask(denops, listId, taskseriesId, taskId);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task deleted.");
    },

    async completeTask(listId: unknown, taskseriesId: unknown, taskId: unknown): Promise<unknown> {
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      await Auth.completeTask(denops, listId, taskseriesId, taskId);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task completed.");
    },

    async uncompleteTask(listId: unknown, taskseriesId: unknown, taskId: unknown): Promise<unknown> {
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      await Auth.uncompleteTask(denops, listId, taskseriesId, taskId);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task uncompleted.");
    },

    async setTaskName(...args: unknown[]): Promise<unknown> {
      if (args.length < 4) {
        throw new Error("setTaskName requires 4 arguments: listId, taskseriesId, taskId, name");
      }
      const [listId, taskseriesId, taskId, ...nameParts] = args;
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      
      // Join remaining arguments as task name (in case the name contains spaces)
      const name = nameParts.map(part => {
        ensureString(part);
        return part;
      }).join(" ");
      
      await Auth.setTaskName(denops, listId, taskseriesId, taskId, name);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task name updated.");
    },

    async setTaskPriority(listId: unknown, taskseriesId: unknown, taskId: unknown, priority: unknown): Promise<unknown> {
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      ensureString(priority);
      await Auth.setTaskPriority(denops, listId, taskseriesId, taskId, priority);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task priority updated.");
    },

    async setTaskDueDate(...args: unknown[]): Promise<unknown> {
      if (args.length < 4) {
        throw new Error("setTaskDueDate requires 4 arguments: listId, taskseriesId, taskId, due");
      }
      const [listId, taskseriesId, taskId, ...dueParts] = args;
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      
      // Join remaining arguments as due date (in case it contains spaces like "next week")
      const due = dueParts.map(part => {
        ensureString(part);
        return part;
      }).join(" ");
      
      await Auth.setTaskDueDate(denops, listId, taskseriesId, taskId, due);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task due date updated.");
    },

    async debug(): Promise<void> {},
  };

  await execute(
    denops,
    `command! -nargs=0 RtmAuth call denops#notify('${denops.name}', 'auth', [])`,
  );

  await execute(
    denops,
    `command! -nargs=? RtmAddTask call denops#notify('${denops.name}', 'addTask', [<q-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=* -range RtmAddSelectedTask call denops#notify('${denops.name}', 'addSelectedTask', [<line1>, <line2>] + [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=? RtmGetTaskList call denops#notify('${denops.name}', 'getTaskList', [<q-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=3 RtmDeleteTask call denops#notify('${denops.name}', 'deleteTask', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=3 RtmCompleteTask call denops#notify('${denops.name}', 'completeTask', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=3 RtmUncompleteTask call denops#notify('${denops.name}', 'uncompleteTask', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=+ RtmSetTaskName call denops#notify('${denops.name}', 'setTaskName', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=4 RtmSetTaskPriority call denops#notify('${denops.name}', 'setTaskPriority', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=+ RtmSetTaskDueDate call denops#notify('${denops.name}', 'setTaskDueDate', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=* -range Debug call denops#notify('${denops.name}', 'debug', [])`,
  );
}
