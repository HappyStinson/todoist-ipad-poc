import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express from "express";
import { TodoistApi } from "@doist/todoist-api-typescript";

dotenv.config();

const token = process.env.TODOIST_API_TOKEN;
if (!token) {
  throw new Error("Missing TODOIST_API_TOKEN in environment.");
}

const app = express();
const api = new TodoistApi(token);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

app.use(express.json());
app.use(express.static(publicDir));

async function getInboxProjectId(): Promise<string> {
  const user = await api.getUser();
  return user.inboxProjectId;
}

app.get("/api/health", async (_req, res) => {
  try {
    await api.getProjects();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/projects", async (_req, res) => {
  try {
    const projectsResponse = await api.getProjects();
    res.json(projectsResponse.results);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch projects",
    });
  }
});

app.get("/api/inbox", async (_req, res) => {
  try {
    const inboxProjectId = await getInboxProjectId();
    const project = await api.getProject(inboxProjectId);
    res.json(project);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch inbox project",
    });
  }
});

app.get("/api/inbox/tasks", async (_req, res) => {
  try {
    const inboxProjectId = await getInboxProjectId();
    const tasksResponse = await api.getTasks({ projectId: inboxProjectId });
    res.json(tasksResponse.results);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch inbox tasks",
    });
  }
});

app.post("/api/inbox/tasks", async (req, res) => {
  try {
    const { content } = req.body as { content?: string };
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Missing task content" });
    }
    const inboxProjectId = await getInboxProjectId();
    const newTask = await api.addTask({ content: content.trim(), projectId: inboxProjectId });
    return res.status(201).json(newTask);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create inbox task",
    });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const projectId = req.query.projectId;
    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({ error: "Missing projectId query parameter" });
    }

    const tasksResponse = await api.getTasks({ projectId });
    return res.json(tasksResponse.results);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    });
  }
});

app.get("/api/tasks/due", async (_req, res) => {
  try {
    const tasksResponse = await api.getTasks();
    const dueTasks = tasksResponse.results.filter((task) => Boolean(task.due?.date));
    res.json(dueTasks);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch due tasks",
    });
  }
});

app.post("/api/tasks/:id/close", async (req, res) => {
  try {
    const { id } = req.params;
    const closed = await api.closeTask(id);
    res.json({ ok: closed });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to close task",
    });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const port = Number(process.env.PORT || "5173");
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
