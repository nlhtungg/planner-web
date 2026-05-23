const { test } = require("@playwright/test");
const path = require("path");

test.describe.configure({ mode: "parallel" });

// Routes used by the Planner-Web app. Adjust to match your deployment.
const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  workspaces: "/workspaces",
  workspaceTasks: "/workspaces/:id/tasks",
  calendar: "/calendar",
  chat: "/chat",
  messages: "/messages",
  documents: "/documents",
  chatbot: "/chatbot"
};

// UI selectors to be configured per environment.
const SELECTORS = {
  login: {
    emailInput: "[data-test=login-email]",
    passwordInput: "[data-test=login-password]",
    submitButton: "[data-test=login-submit]",
    errorBanner: "[data-test=login-error]"
  },
  workspace: {
    listItem: "[data-test=workspace-card]",
    link: "[data-test=workspace-link]",
    tasksNav: "[data-test=workspace-tasks-tab]"
  },
  tasks: {
    createButton: "[data-test=task-create]",
    titleInput: "[data-test=task-title]",
    descriptionInput: "[data-test=task-description]",
    statusSelect: "[data-test=task-status]",
    saveButton: "[data-test=task-save]",
    firstTask: "[data-test=task-item]",
    statusToggle: "[data-test=task-status-toggle]"
  },
  calendar: {
    container: "[data-test=calendar-view]"
  },
  chat: {
    input: "[data-test=chat-input]",
    sendButton: "[data-test=chat-send]",
    connectedIndicator: "[data-test=socket-connected]"
  },
  documents: {
    uploadInput: "input[type=file][data-test=doc-upload]",
    syncButton: "[data-test=doc-sync]",
    list: "[data-test=doc-list]"
  },
  chatbot: {
    openButton: "[data-test=chatbot-open]",
    panel: "[data-test=chatbot-panel]",
    questionInput: "[data-test=chatbot-input]",
    sendButton: "[data-test=chatbot-send]"
  }
};

const WORKSPACE_ID_ATTRIBUTE = "data-workspace-id";

const TASK_TITLES = [
  "Plan sprint priorities",
  "Review backlog grooming",
  "Coordinate release notes",
  "Audit QA checklist",
  "Sync with design review",
  "Update sprint report"
];

const TASK_DESCRIPTIONS = [
  "Follow up with stakeholders and summarize actions.",
  "Validate dependencies and update timeline.",
  "Gather approvals from the release committee.",
  "Document risks and mitigation plan.",
  "Prepare handoff notes for execution team."
];

const CHAT_MESSAGES = [
  "Daily check-in: any blockers on the current sprint?",
  "Reminder: please update your task status today.",
  "Can we sync on the deployment timeline?",
  "Heads up: new docs were uploaded for review.",
  "Anyone available for a quick call in 10 mins?"
];

const AI_QUESTIONS = [
  "Summarize the latest project requirements and highlight key risks and dependencies.",
  "Find all documents related to the integration roadmap and provide a concise overview.",
  "List decisions from recent meetings and link them to impacted workspaces.",
  "Explain how the current milestone relates to the release timeline in detail.",
  "Give a long-form summary of open issues and recommended next actions."
];

const MODE = normalizeMode(process.env.MODE);
const BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
const API_BASE_URL = process.env.API_BASE_URL || BASE_URL;
const SESSION_COUNT = parseNumber(process.env.SESSION_COUNT, 3);
const ENABLE_WRITE_ACTIONS = parseBoolean(process.env.ENABLE_WRITE_ACTIONS, true);
const ACTION_TIMEOUT_MS = parseNumber(process.env.ACTION_TIMEOUT_MS, 20000);
const NAVIGATION_TIMEOUT_MS = parseNumber(process.env.NAVIGATION_TIMEOUT_MS, 45000);
const THINK_TIME_MIN_SEC = parseNumber(process.env.THINK_TIME_MIN_SEC, 0.5);
const THINK_TIME_MAX_SEC = parseNumber(process.env.THINK_TIME_MAX_SEC, 1.8);
const CHAT_SPAM_MESSAGES = parseNumber(process.env.CHAT_SPAM_MESSAGES, 25);
const AI_STRESS_LOOPS = parseNumber(process.env.AI_STRESS_LOOPS, 3);
const AI_QUESTIONS_PER_LOOP = parseNumber(process.env.AI_QUESTIONS_PER_LOOP, 3);
const AUTH_STORM_ROUNDS = parseNumber(process.env.AUTH_STORM_ROUNDS, 8);
const INVALID_API_PATH = process.env.INVALID_API_PATH || "/api/v1/invalid-route";
const UPLOAD_FILE_PATH = process.env.UPLOAD_FILE_PATH || path.join(__dirname, "..", "fixtures", "sample-document.txt");

const ZERO_THINK_TIME = ["CHAT_SPAM", "AI_RESOURCE_STRESS", "AUTH_ERROR_STORM"].includes(MODE);
const THINK_RANGE = ZERO_THINK_TIME
  ? { min: 0, max: 0 }
  : { min: THINK_TIME_MIN_SEC, max: THINK_TIME_MAX_SEC };

const CREDENTIALS = resolveCredentials();

for (let index = 0; index < SESSION_COUNT; index += 1) {
  test(`planner-web session ${index + 1} (${MODE})`, async ({ page }) => {
    const credential = CREDENTIALS[index % CREDENTIALS.length];
    const thinkTime = createThinkTime(page);
    const sessionLabel = `S${index + 1}-${Date.now().toString(36)}`;

    page.setDefaultTimeout(ACTION_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

    const persona = resolvePersona(MODE);

    if (persona === "AUTH_ERROR_STORM") {
      await authErrorStormPersona(page, credential, thinkTime, THINK_RANGE);
      return;
    }

    if (persona === "ACTIVE_CHATTER") {
      await activeChatterPersona(page, credential, thinkTime, THINK_RANGE, sessionLabel);
      return;
    }

    if (persona === "AI_KNOWLEDGE_MANAGER") {
      await aiKnowledgeManagerPersona(page, credential, thinkTime, THINK_RANGE, sessionLabel);
      return;
    }

    await taskManagerPersona(page, credential, thinkTime, THINK_RANGE, sessionLabel);
  });
}

function normalizeMode(value) {
  return String(value || "NORMAL").trim().toUpperCase();
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveCredentials() {
  const parsed = parseCredentials(process.env.USER_CREDENTIALS);
  if (parsed.length > 0) {
    return parsed;
  }

  if (process.env.LOGIN_IDENTIFIER && process.env.LOGIN_PASSWORD) {
    return [{
      identifier: process.env.LOGIN_IDENTIFIER,
      password: process.env.LOGIN_PASSWORD
    }];
  }

  console.warn("No credentials provided. Set USER_CREDENTIALS or LOGIN_IDENTIFIER/LOGIN_PASSWORD.");
  return [{ identifier: "demo@example.com", password: "Password1" }];
}

function parseCredentials(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [identifier, ...passwordParts] = item.split("|");
      return {
        identifier: identifier?.trim() || "",
        password: passwordParts.join("|").trim()
      };
    })
    .filter((credential) => credential.identifier && credential.password);
}

function randomInt(min, max) {
  const minValue = Math.min(min, max);
  const maxValue = Math.max(min, max);
  return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
}

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
}

function resolvePersona(mode) {
  if (mode === "CHAT_SPAM") {
    return "ACTIVE_CHATTER";
  }
  if (mode === "AI_RESOURCE_STRESS") {
    return "AI_KNOWLEDGE_MANAGER";
  }
  if (mode === "AUTH_ERROR_STORM") {
    return "AUTH_ERROR_STORM";
  }

  return weightedPick([
    { value: "TASK_MANAGER", weight: 60 },
    { value: "ACTIVE_CHATTER", weight: 30 },
    { value: "AI_KNOWLEDGE_MANAGER", weight: 10 }
  ]);
}

function createThinkTime(page) {
  return async function thinkTime(min, max) {
    const minMs = Math.max(0, Math.round(min * 1000));
    const maxMs = Math.max(0, Math.round(max * 1000));
    const timeout = minMs === maxMs ? minMs : randomInt(minMs, maxMs);
    await page.waitForTimeout(timeout);
  };
}

function buildWorkspacePath(template, workspaceId) {
  if (!template || !workspaceId) {
    return null;
  }

  return template.replace(":id", workspaceId);
}

function extractWorkspaceId(href) {
  if (!href) {
    return null;
  }

  const match = href.match(/workspaces?\/([^/]+)/i);
  return match ? match[1] : null;
}

async function safeAction(label, action) {
  try {
    return await action();
  } catch (error) {
    console.error(`[${label}]`, error);
    return null;
  }
}

async function gotoWithThink(page, route, thinkTime, range, label) {
  return safeAction(`goto:${label}`, async () => {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);
  });
}

async function clickWithThink(locator, thinkTime, range, label) {
  return safeAction(`click:${label}`, async () => {
    await locator.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    await locator.click();
    await thinkTime(range.min, range.max);
  });
}

async function typeWithThink(locator, text, thinkTime, range, label) {
  return safeAction(`type:${label}`, async () => {
    await locator.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    await locator.click();
    await thinkTime(range.min, range.max);
    await locator.fill("");
    await thinkTime(range.min, range.max);
    await locator.type(text, { delay: randomInt(40, 120) });
    await thinkTime(range.min, range.max);
  });
}

async function selectOptionWithThink(locator, value, thinkTime, range, label) {
  return safeAction(`select:${label}`, async () => {
    await locator.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    await locator.selectOption(value);
    await thinkTime(range.min, range.max);
  });
}

async function pressEnterWithThink(locator, thinkTime, range, label) {
  return safeAction(`press:${label}`, async () => {
    await locator.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    await locator.press("Enter");
    await thinkTime(range.min, range.max);
  });
}

async function login(page, credential, thinkTime, range, passwordOverride = null) {
  return safeAction("login", async () => {
    await gotoWithThink(page, ROUTES.login, thinkTime, range, "login");
    await typeWithThink(page.locator(SELECTORS.login.emailInput), credential.identifier, thinkTime, range, "login-email");
    await typeWithThink(
      page.locator(SELECTORS.login.passwordInput),
      passwordOverride || credential.password,
      thinkTime,
      range,
      "login-password"
    );
    await clickWithThink(page.locator(SELECTORS.login.submitButton), thinkTime, range, "login-submit");
  });
}

async function openWorkspaces(page, thinkTime, range) {
  return safeAction("open-workspaces", async () => {
    await gotoWithThink(page, ROUTES.workspaces, thinkTime, range, "workspaces");
    await page.locator(SELECTORS.workspace.listItem).first().waitFor({
      state: "visible",
      timeout: ACTION_TIMEOUT_MS
    });
  });
}

async function openWorkspaceTasks(page, thinkTime, range) {
  return safeAction("open-workspace-tasks", async () => {
    await openWorkspaces(page, thinkTime, range);
    const cards = page.locator(SELECTORS.workspace.listItem);
    const count = await cards.count();
    const index = randomInt(0, Math.max(0, count - 1));
    const card = cards.nth(index);

    let workspaceId = await card.getAttribute(WORKSPACE_ID_ATTRIBUTE);
    if (!workspaceId) {
      const href = await card.locator(SELECTORS.workspace.link).first().getAttribute("href");
      workspaceId = extractWorkspaceId(href);
    }

    const workspaceTasksPath = buildWorkspacePath(ROUTES.workspaceTasks, workspaceId);
    if (workspaceTasksPath) {
      await gotoWithThink(page, workspaceTasksPath, thinkTime, range, "workspace-tasks");
      return workspaceId;
    }

    await clickWithThink(card, thinkTime, range, "workspace-card");
    await clickWithThink(page.locator(SELECTORS.workspace.tasksNav), thinkTime, range, "workspace-tasks-tab");
    return workspaceId;
  });
}

async function createTask(page, thinkTime, range, sessionLabel) {
  return safeAction("create-task", async () => {
    if (!ENABLE_WRITE_ACTIONS) {
      return;
    }

    const title = `${pickRandom(TASK_TITLES)} ${sessionLabel}`;
    const description = `${pickRandom(TASK_DESCRIPTIONS)} (${randomInt(100, 999)})`;

    await clickWithThink(page.locator(SELECTORS.tasks.createButton), thinkTime, range, "task-create");
    await typeWithThink(page.locator(SELECTORS.tasks.titleInput), title, thinkTime, range, "task-title");
    await typeWithThink(
      page.locator(SELECTORS.tasks.descriptionInput),
      description,
      thinkTime,
      range,
      "task-description"
    );
    await selectOptionWithThink(
      page.locator(SELECTORS.tasks.statusSelect),
      pickRandom(["todo", "in-progress", "done"]),
      thinkTime,
      range,
      "task-status"
    );
    await clickWithThink(page.locator(SELECTORS.tasks.saveButton), thinkTime, range, "task-save");
  });
}

async function updateTaskStatus(page, thinkTime, range) {
  return safeAction("update-task-status", async () => {
    if (!ENABLE_WRITE_ACTIONS) {
      return;
    }

    const taskItem = page.locator(SELECTORS.tasks.firstTask).first();
    await taskItem.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });

    const toggle = taskItem.locator(SELECTORS.tasks.statusToggle);
    if (await toggle.count()) {
      await clickWithThink(toggle, thinkTime, range, "task-status-toggle");
      return;
    }

    const select = taskItem.locator(SELECTORS.tasks.statusSelect);
    if (await select.count()) {
      await selectOptionWithThink(
        select,
        pickRandom(["todo", "in-progress", "done"]),
        thinkTime,
        range,
        "task-status-select"
      );
    }
  });
}

async function openCalendar(page, thinkTime, range) {
  return safeAction("open-calendar", async () => {
    await gotoWithThink(page, ROUTES.calendar, thinkTime, range, "calendar");
    if (SELECTORS.calendar.container) {
      await page.locator(SELECTORS.calendar.container).first().waitFor({
        state: "visible",
        timeout: ACTION_TIMEOUT_MS
      });
    }
  });
}

async function openChat(page, thinkTime, range) {
  return safeAction("open-chat", async () => {
    const routes = [ROUTES.chat, ROUTES.messages].filter(Boolean);

    for (const route of routes) {
      await gotoWithThink(page, route, thinkTime, range, `chat:${route}`);
      const input = page.locator(SELECTORS.chat.input);
      try {
        await input.waitFor({ state: "visible", timeout: 5000 });
        break;
      } catch (error) {
        console.error(`[open-chat] chat input not found on ${route}`);
      }
    }

    const indicator = page.locator(SELECTORS.chat.connectedIndicator);
    if (await indicator.count()) {
      await indicator.first().waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    }
  });
}

async function sendChatMessages(page, thinkTime, range, messageCount, sessionLabel) {
  return safeAction("send-chat-messages", async () => {
    const input = page.locator(SELECTORS.chat.input);
    const sendButton = page.locator(SELECTORS.chat.sendButton);

    for (let index = 0; index < messageCount; index += 1) {
      const message = `${pickRandom(CHAT_MESSAGES)} (${sessionLabel}-${index + 1})`;
      await typeWithThink(input, message, thinkTime, range, "chat-input");

      if (await sendButton.count()) {
        await clickWithThink(sendButton, thinkTime, range, "chat-send");
      } else {
        await pressEnterWithThink(input, thinkTime, range, "chat-enter");
      }
    }
  });
}

async function openDocuments(page, thinkTime, range) {
  return safeAction("open-documents", async () => {
    await gotoWithThink(page, ROUTES.documents, thinkTime, range, "documents");
    const list = page.locator(SELECTORS.documents.list);
    if (await list.count()) {
      await list.first().waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    }
  });
}

async function uploadDocument(page, thinkTime, range) {
  return safeAction("upload-document", async () => {
    if (!ENABLE_WRITE_ACTIONS) {
      return;
    }

    const input = page.locator(SELECTORS.documents.uploadInput);
    await input.waitFor({ state: "attached", timeout: ACTION_TIMEOUT_MS });
    await input.setInputFiles(UPLOAD_FILE_PATH);
    await thinkTime(range.min, range.max);
  });
}

async function syncDocuments(page, thinkTime, range) {
  return safeAction("sync-documents", async () => {
    if (!ENABLE_WRITE_ACTIONS) {
      return;
    }

    await clickWithThink(page.locator(SELECTORS.documents.syncButton), thinkTime, range, "doc-sync");
  });
}

async function openChatbot(page, thinkTime, range) {
  return safeAction("open-chatbot", async () => {
    await gotoWithThink(page, ROUTES.chatbot, thinkTime, range, "chatbot");

    const panel = page.locator(SELECTORS.chatbot.panel);
    if (await panel.count()) {
      await panel.first().waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
      return;
    }

    const openButton = page.locator(SELECTORS.chatbot.openButton);
    if (await openButton.count()) {
      await clickWithThink(openButton, thinkTime, range, "chatbot-open");
    }
  });
}

async function sendAiQuestions(page, thinkTime, range, questionCount, sessionLabel) {
  return safeAction("send-ai-questions", async () => {
    const input = page.locator(SELECTORS.chatbot.questionInput);
    const sendButton = page.locator(SELECTORS.chatbot.sendButton);

    for (let index = 0; index < questionCount; index += 1) {
      const question = `${pickRandom(AI_QUESTIONS)} (${sessionLabel}-${index + 1})`;
      await typeWithThink(input, question, thinkTime, range, "chatbot-input");
      if (await sendButton.count()) {
        await clickWithThink(sendButton, thinkTime, range, "chatbot-send");
      } else {
        await pressEnterWithThink(input, thinkTime, range, "chatbot-enter");
      }
    }
  });
}

async function taskManagerPersona(page, credential, thinkTime, range, sessionLabel) {
  return safeAction("persona-task-manager", async () => {
    // Nginx + Backend: auth flow and page navigation.
    await login(page, credential, thinkTime, range);

    await openWorkspaceTasks(page, thinkTime, range);

    // Backend + MongoDB: create and update tasks (write-heavy).
    const taskCount = randomInt(1, 2);
    for (let index = 0; index < taskCount; index += 1) {
      await createTask(page, thinkTime, range, sessionLabel);
    }
    await updateTaskStatus(page, thinkTime, range);

    await openCalendar(page, thinkTime, range);
  });
}

async function activeChatterPersona(page, credential, thinkTime, range, sessionLabel) {
  return safeAction("persona-active-chatter", async () => {
    // Nginx + Socket.io + MongoDB: realtime chat events and message writes.
    await login(page, credential, thinkTime, range);

    await openChat(page, thinkTime, range);
    const messageCount = MODE === "CHAT_SPAM" ? CHAT_SPAM_MESSAGES : randomInt(3, 5);
    await sendChatMessages(page, thinkTime, range, messageCount, sessionLabel);
  });
}

async function aiKnowledgeManagerPersona(page, credential, thinkTime, range, sessionLabel) {
  return safeAction("persona-ai-knowledge-manager", async () => {
    // Nginx + Backend: auth, page routing.
    await login(page, credential, thinkTime, range);

    const loops = MODE === "AI_RESOURCE_STRESS" ? AI_STRESS_LOOPS : 1;

    for (let index = 0; index < loops; index += 1) {
      // MinIO + Backend: upload and sync documents.
      await openDocuments(page, thinkTime, range);
      await uploadDocument(page, thinkTime, range);
      await syncDocuments(page, thinkTime, range);

      // Qdrant + Backend: vector search queries via chatbot.
      await openChatbot(page, thinkTime, range);
      const questionCount = MODE === "AI_RESOURCE_STRESS" ? AI_QUESTIONS_PER_LOOP : randomInt(2, 3);
      await sendAiQuestions(page, thinkTime, range, questionCount, `${sessionLabel}-${index + 1}`);
    }
  });
}

async function authErrorStormPersona(page, credential, thinkTime, range) {
  return safeAction("persona-auth-error-storm", async () => {
    // Nginx + Backend: spike auth failures and invalid API requests.
    const badPassword = process.env.AUTH_ERROR_PASSWORD || `${credential.password}-wrong`;

    for (let index = 0; index < AUTH_STORM_ROUNDS; index += 1) {
      await login(page, credential, thinkTime, range, badPassword);

      await safeAction("invalid-api-request", async () => {
        await page.request.get(`${API_BASE_URL}${INVALID_API_PATH}?ts=${Date.now()}`);
      });
    }
  });
}
