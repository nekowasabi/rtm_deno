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
      ensureString(task);
      await Auth.addTask(denops, task);

      await denops.cmd(`redraw`);
      return await Promise.resolve(" add task complete.");
    },

    async addSelectedTask(
      start: unknown,
      end: unknown,
      _args: unknown,
    ): Promise<void> {
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
      ensureString(filter);
      const result = await Auth.getTaskList(denops, filter || "");
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

    async setTaskName(listId: unknown, taskseriesId: unknown, taskId: unknown, name: unknown): Promise<unknown> {
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      ensureString(name);
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

    async setTaskDueDate(listId: unknown, taskseriesId: unknown, taskId: unknown, due: unknown): Promise<unknown> {
      ensureString(listId);
      ensureString(taskseriesId);
      ensureString(taskId);
      ensureString(due);
      await Auth.setTaskDueDate(denops, listId, taskseriesId, taskId, due);
      await denops.cmd(`redraw`);
      return Promise.resolve("Task due date updated.");
    },

    async debug(): Promise<void> {},
  };

  await execute(
    denops,
    `command! -nargs=0 RtmAuth echomsg denops#request('${denops.name}', 'auth', [])`,
  );

  await execute(
    denops,
    `command! -nargs=0 RtmAddTask echomsg denops#request('${denops.name}', 'addTask', [""])`,
  );

  await execute(
    denops,
    `command! -nargs=* -range RtmAddSelectedTask echomsg denops#request('${denops.name}', 'addSelectedTask', [<line1>, <line2>, <f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=? RtmGetTaskList echomsg denops#request('${denops.name}', 'getTaskList', [<q-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=3 RtmDeleteTask echomsg denops#request('${denops.name}', 'deleteTask', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=3 RtmCompleteTask echomsg denops#request('${denops.name}', 'completeTask', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=3 RtmUncompleteTask echomsg denops#request('${denops.name}', 'uncompleteTask', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=+ RtmSetTaskName echomsg denops#request('${denops.name}', 'setTaskName', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=4 RtmSetTaskPriority echomsg denops#request('${denops.name}', 'setTaskPriority', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=+ RtmSetTaskDueDate echomsg denops#request('${denops.name}', 'setTaskDueDate', [<f-args>])`,
  );

  await execute(
    denops,
    `command! -nargs=* -range Debug echomsg denops#request('${denops.name}', 'debug', [])`,
  );
}
