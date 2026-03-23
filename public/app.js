const connectionSection = document.getElementById("connectionSection");
const healthState = document.getElementById("healthState");
const testBtn = document.getElementById("testBtn");
const refreshInboxBtn = document.getElementById("refreshInboxBtn");
const refreshDueTasksBtn = document.getElementById("refreshDueTasksBtn");
const addInboxTaskBtn = document.getElementById("addInboxTaskBtn");
const newInboxTaskInput = document.getElementById("newInboxTaskInput");
const inboxTitle = document.getElementById("inboxTitle");
const inboxState = document.getElementById("inboxState");
const dueTasksState = document.getElementById("dueTasksState");
const inboxTasksList = document.getElementById("inboxTasksList");
const dueTasksList = document.getElementById("dueTasksList");
let inboxProject = null;

async function callApi(path, options = {}) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function setInboxState(text) {
  inboxState.textContent = text;
}

function setDueTasksState(text) {
  dueTasksState.textContent = text;
}

function renderTaskContentWithLinks(text) {
  const fragment = document.createDocumentFragment();
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  let lastIndex = 0;
  let match = urlRegex.exec(text);

  while (match) {
    const [url] = match;
    const start = match.index;

    if (start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = url;
    fragment.appendChild(link);

    lastIndex = start + url.length;
    match = urlRegex.exec(text);
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return fragment;
}

function renderTaskList(listElement, stateSetter, tasks, emptyText) {
  listElement.innerHTML = "";
  if (!tasks.length) {
    stateSetter(emptyText);
    return;
  }
  stateSetter(`${tasks.length} task(s)`);

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = "task-item";
    const main = document.createElement("div");
    main.className = "task-main";
    const content = document.createElement("div");
    content.className = "task-content";
    content.appendChild(renderTaskContentWithLinks(task.content || ""));
    main.appendChild(content);

    const button = document.createElement("button");
    button.className = "complete-btn";
    button.textContent = "Complete";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Working...";
      try {
        await callApi(`/api/tasks/${task.id}/close`, { method: "POST" });
        await loadAll();
      } catch (error) {
        stateSetter(error.message);
        button.disabled = false;
        button.textContent = "Complete";
      }
    });
    item.appendChild(main);
    item.appendChild(button);
    listElement.appendChild(item);
  }
}

async function checkHealth() {
  healthState.textContent = "Testing connection...";
  try {
    await callApi("/api/health");
    healthState.textContent = "Connected to Todoist API.";
    connectionSection.classList.add("hidden");
    return true;
  } catch (error) {
    healthState.textContent = `Connection failed: ${error.message}`;
    connectionSection.classList.remove("hidden");
    return false;
  }
}

async function loadInboxProject() {
  try {
    inboxProject = await callApi("/api/inbox");
    inboxTitle.textContent = `Inbox - ${inboxProject.name}`;
  } catch (error) {
    setInboxState(error.message);
  }
}

async function loadInboxTasks() {
  setInboxState("Loading inbox tasks...");
  try {
    const tasks = await callApi("/api/inbox/tasks");
    renderTaskList(inboxTasksList, setInboxState, tasks, "No active inbox tasks.");
  } catch (error) {
    setInboxState(error.message);
  }
}

async function loadDueTasks() {
  setDueTasksState("Loading due tasks...");
  try {
    const tasks = await callApi("/api/tasks/due");
    renderTaskList(dueTasksList, setDueTasksState, tasks, "No due-dated tasks found.");
  } catch (error) {
    setDueTasksState(error.message);
  }
}

async function addInboxTask() {
  const content = newInboxTaskInput.value.trim();
  if (!content) {
    setInboxState("Please type a task first.");
    return;
  }
  addInboxTaskBtn.disabled = true;
  try {
    await callApi("/api/inbox/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    newInboxTaskInput.value = "";
    await loadInboxTasks();
  } catch (error) {
    setInboxState(error.message);
  } finally {
    addInboxTaskBtn.disabled = false;
  }
}

async function loadAll() {
  await loadInboxProject();
  await Promise.all([loadInboxTasks(), loadDueTasks()]);
}

testBtn.addEventListener("click", checkHealth);
refreshInboxBtn.addEventListener("click", loadInboxTasks);
refreshDueTasksBtn.addEventListener("click", loadDueTasks);
addInboxTaskBtn.addEventListener("click", addInboxTask);
newInboxTaskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addInboxTask();
  }
});

checkHealth().then((ok) => {
  if (ok) {
    loadAll();
  }
});
