import type { Handler } from "@netlify/functions";
import { TodoistApi } from "@doist/todoist-api-typescript";

const token = process.env.TODOIST_API_TOKEN;
const appAccessKey = process.env.APP_ACCESS_KEY;

function json(statusCode: number, payload: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function getApiPath(rawPath: string) {
  return rawPath.replace(/^\/\.netlify\/functions\/api/, "") || "/";
}

async function getInboxProjectId(api: TodoistApi) {
  const user = await api.getUser();
  return user.inboxProjectId;
}

export const handler: Handler = async (event) => {
  if (!token) {
    return json(500, { error: "Missing TODOIST_API_TOKEN environment variable" });
  }
  if (!appAccessKey) {
    return json(500, { error: "Missing APP_ACCESS_KEY environment variable" });
  }
  const providedKey = event.headers["x-app-access-key"] || event.headers["X-App-Access-Key"];
  if (!providedKey || providedKey !== appAccessKey) {
    return json(401, { error: "Unauthorized" });
  }

  const api = new TodoistApi(token);
  const path = getApiPath(event.path);
  const method = event.httpMethod.toUpperCase();

  try {
    if (method === "GET" && path === "/health") {
      await api.getProjects();
      return json(200, { ok: true });
    }

    if (method === "GET" && path === "/inbox") {
      const inboxProjectId = await getInboxProjectId(api);
      const project = await api.getProject(inboxProjectId);
      return json(200, project);
    }

    if (method === "GET" && path === "/inbox/tasks") {
      const inboxProjectId = await getInboxProjectId(api);
      const tasksResponse = await api.getTasks({ projectId: inboxProjectId });
      return json(200, tasksResponse.results);
    }

    if (method === "POST" && path === "/inbox/tasks") {
      const parsed = event.body ? JSON.parse(event.body) : {};
      const content = parsed?.content;
      if (!content || typeof content !== "string" || !content.trim()) {
        return json(400, { error: "Missing task content" });
      }
      const inboxProjectId = await getInboxProjectId(api);
      const task = await api.addTask({ content: content.trim(), projectId: inboxProjectId });
      return json(201, task);
    }

    if (method === "GET" && path === "/tasks/due") {
      const tasksResponse = await api.getTasks();
      const dueTasks = tasksResponse.results.filter((task) => Boolean(task.due?.date));
      return json(200, dueTasks);
    }

    if (method === "POST" && path.startsWith("/tasks/") && path.endsWith("/close")) {
      const taskId = path.slice("/tasks/".length, -"/close".length);
      if (!taskId) {
        return json(400, { error: "Missing task id" });
      }
      const ok = await api.closeTask(taskId);
      return json(200, { ok });
    }

    return json(404, { error: "Not found" });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
};
