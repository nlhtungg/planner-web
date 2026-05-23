const path = require("path");

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

// Update selectors to match Planner-Web UI.
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
const THINK_TIME_MIN_SEC = parseNumber(process.env.THINK_TIME_MIN_SEC, 0.5);
const THINK_TIME_MAX_SEC = parseNumber(process.env.THINK_TIME_MAX_SEC, 1.8);
const CHAT_SPAM_MESSAGES = parseNumber(process.env.CHAT_SPAM_MESSAGES, 25);
const AI_STRESS_LOOPS = parseNumber(process.env.AI_STRESS_LOOPS, 3);
const AI_QUESTIONS_PER_LOOP = parseNumber(process.env.AI_QUESTIONS_PER_LOOP, 3);
const AUTH_STORM_ROUNDS = parseNumber(process.env.AUTH_STORM_ROUNDS, 8);
const INVALID_API_PATH = process.env.INVALID_API_PATH || "/api/v1/invalid-route";
const UPLOAD_FILE_PATH = process.env.UPLOAD_FILE_PATH || path.join(
  __dirname,
  "..",
  "..",
  "fixtures",
  "sample-document.txt"
);

const ZERO_THINK_TIME = ["CHAT_SPAM", "AI_RESOURCE_STRESS", "AUTH_ERROR_STORM"].includes(MODE);

function normalizeMode(value) {
  return String(value || "NORMAL").trim().toUpperCase();
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

async function safeAction(logger, label, action, options = {}) {
  const rethrow = options.rethrow ?? false;

  try {
    await logger.log(`START ${label}`);
    const result = await action();
    await logger.log(`DONE ${label}`);
    return result;
  } catch (error) {
    const message = error?.message || String(error);
    console.error(`[${label}]`, error);
    await logger.log(`ERROR ${label}`, { message });

    if (rethrow) {
      throw error;
    }

    return null;
  }
}

async function clickWithThink(page, logger, locator, thinkTime, range, label) {
  return safeAction(logger, `click:${label}`, async () => {
    await locator.waitFor({ state: "visible" });
    await locator.click();
    await thinkTime(range.min, range.max);
  });
}

async function typeWithThink(page, logger, locator, text, thinkTime, range, label) {
  return safeAction(logger, `type:${label}`, async () => {
    await locator.waitFor({ state: "visible" });
    await locator.click();
    await thinkTime(range.min, range.max);
    await locator.fill("");
    await thinkTime(range.min, range.max);
    await locator.type(text, { delay: randomInt(40, 120) });
    await thinkTime(range.min, range.max);
  });
}

async function selectOptionWithThink(logger, locator, value, thinkTime, range, label) {
  return safeAction(logger, `select:${label}`, async () => {
    await locator.waitFor({ state: "visible" });
    await locator.selectOption(value);
    await thinkTime(range.min, range.max);
  });
}

async function pressEnterWithThink(logger, locator, thinkTime, range, label) {
  return safeAction(logger, `press:${label}`, async () => {
    await locator.waitFor({ state: "visible" });
    await locator.press("Enter");
    await thinkTime(range.min, range.max);
  });
}

async function login(page, config, logger, credential, thinkTime, range, passwordOverride = null) {
  return safeAction(logger, "login", async () => {
    await page.goto(`${config.baseUrl}${ROUTES.login}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);

    await typeWithThink(
      page,
      logger,
      page.locator(SELECTORS.login.emailInput),
      credential.identifier,
      thinkTime,
      range,
      "login-email"
    );

    await typeWithThink(
      page,
      logger,
      page.locator(SELECTORS.login.passwordInput),
      passwordOverride || credential.password,
      thinkTime,
      range,
      "login-password"
    );

    await clickWithThink(page, logger, page.locator(SELECTORS.login.submitButton), thinkTime, range, "login-submit");
  });
}

async function openDashboard(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-dashboard", async () => {
    await page.goto(`${config.baseUrl}${ROUTES.dashboard}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);
  });
}

async function openWorkspaces(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-workspaces", async () => {
    await page.goto(`${config.baseUrl}${ROUTES.workspaces}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);
    await page.locator(SELECTORS.workspace.listItem).first().waitFor({ state: "visible" });
    await thinkTime(range.min, range.max);
  });
}

async function openWorkspaceTasks(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-workspace-tasks", async () => {
    await openWorkspaces(page, config, logger, thinkTime, range);

    const cards = page.locator(SELECTORS.workspace.listItem);
    const count = await cards.count();

    if (count === 0) {
      await logger.log("No workspace cards detected");
      return null;
    }

    const index = randomInt(0, Math.max(0, count - 1));
    const card = cards.nth(index);

    let workspaceId = await card.getAttribute(WORKSPACE_ID_ATTRIBUTE);
    if (!workspaceId) {
      const href = await card.locator(SELECTORS.workspace.link).first().getAttribute("href");
      workspaceId = extractWorkspaceId(href);
    }

    const workspaceTasksPath = buildWorkspacePath(ROUTES.workspaceTasks, workspaceId);
    if (workspaceTasksPath) {
      await page.goto(`${config.baseUrl}${workspaceTasksPath}`, { waitUntil: "domcontentloaded" });
      await thinkTime(range.min, range.max);
      return workspaceId;
    }

    await clickWithThink(page, logger, card, thinkTime, range, "workspace-card");
    await clickWithThink(
      page,
      logger,
      page.locator(SELECTORS.workspace.tasksNav),
      thinkTime,
      range,
      "workspace-tasks-tab"
    );
    return workspaceId;
  });
}

async function createTask(page, config, logger, thinkTime, range, sessionLabel) {
  return safeAction(logger, "create-task", async () => {
    if (!config.enableWriteActions) {
      await logger.log("Skipping task creation", { reason: "ENABLE_WRITE_ACTIONS is false" });
      return;
    }

    const title = `${pickRandom(TASK_TITLES)} ${sessionLabel}`;
    const description = `${pickRandom(TASK_DESCRIPTIONS)} (${randomInt(100, 999)})`;

    await clickWithThink(page, logger, page.locator(SELECTORS.tasks.createButton), thinkTime, range, "task-create");
    await typeWithThink(page, logger, page.locator(SELECTORS.tasks.titleInput), title, thinkTime, range, "task-title");
    await typeWithThink(
      page,
      logger,
      page.locator(SELECTORS.tasks.descriptionInput),
      description,
      thinkTime,
      range,
      "task-description"
    );
    await selectOptionWithThink(
      logger,
      page.locator(SELECTORS.tasks.statusSelect),
      pickRandom(["todo", "in-progress", "done"]),
      thinkTime,
      range,
      "task-status"
    );
    await clickWithThink(page, logger, page.locator(SELECTORS.tasks.saveButton), thinkTime, range, "task-save");
  });
}

async function updateTaskStatus(page, config, logger, thinkTime, range) {
  return safeAction(logger, "update-task-status", async () => {
    if (!config.enableWriteActions) {
      await logger.log("Skipping task status update", { reason: "ENABLE_WRITE_ACTIONS is false" });
      return;
    }

    const taskItem = page.locator(SELECTORS.tasks.firstTask).first();
    await taskItem.waitFor({ state: "visible" });
    await thinkTime(range.min, range.max);

    const toggle = taskItem.locator(SELECTORS.tasks.statusToggle);
    if (await toggle.count()) {
      await clickWithThink(page, logger, toggle, thinkTime, range, "task-status-toggle");
      return;
    }

    const select = taskItem.locator(SELECTORS.tasks.statusSelect);
    if (await select.count()) {
      await selectOptionWithThink(
        logger,
        select,
        pickRandom(["todo", "in-progress", "done"]),
        thinkTime,
        range,
        "task-status-select"
      );
    }
  });
}

async function openCalendar(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-calendar", async () => {
    await page.goto(`${config.baseUrl}${ROUTES.calendar}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);

    if (SELECTORS.calendar.container) {
      const calendarView = page.locator(SELECTORS.calendar.container);
      if (await calendarView.count()) {
        await calendarView.first().waitFor({ state: "visible" });
        await thinkTime(range.min, range.max);
      }
    }
  });
}

async function openChat(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-chat", async () => {
    const routes = [ROUTES.chat, ROUTES.messages].filter(Boolean);

    for (const route of routes) {
      await page.goto(`${config.baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await thinkTime(range.min, range.max);

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
      await indicator.first().waitFor({ state: "visible" });
      await thinkTime(range.min, range.max);
    }
  });
}

async function sendChatMessages(page, logger, thinkTime, range, messageCount, sessionLabel) {
  return safeAction(logger, "send-chat-messages", async () => {
    const input = page.locator(SELECTORS.chat.input);
    const sendButton = page.locator(SELECTORS.chat.sendButton);

    for (let index = 0; index < messageCount; index += 1) {
      const message = `${pickRandom(CHAT_MESSAGES)} (${sessionLabel}-${index + 1})`;
      await typeWithThink(page, logger, input, message, thinkTime, range, "chat-input");

      if (await sendButton.count()) {
        await clickWithThink(page, logger, sendButton, thinkTime, range, "chat-send");
      } else {
        await pressEnterWithThink(logger, input, thinkTime, range, "chat-enter");
      }
    }
  });
}

async function openDocuments(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-documents", async () => {
    await page.goto(`${config.baseUrl}${ROUTES.documents}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);

    const list = page.locator(SELECTORS.documents.list);
    if (await list.count()) {
      await list.first().waitFor({ state: "visible" });
      await thinkTime(range.min, range.max);
    }
  });
}

async function uploadDocument(page, config, logger, thinkTime, range) {
  return safeAction(logger, "upload-document", async () => {
    if (!config.enableWriteActions) {
      await logger.log("Skipping document upload", { reason: "ENABLE_WRITE_ACTIONS is false" });
      return;
    }

    const input = page.locator(SELECTORS.documents.uploadInput);
    await input.waitFor({ state: "attached" });
    await input.setInputFiles(UPLOAD_FILE_PATH);
    await thinkTime(range.min, range.max);
  });
}

async function syncDocuments(page, config, logger, thinkTime, range) {
  return safeAction(logger, "sync-documents", async () => {
    if (!config.enableWriteActions) {
      await logger.log("Skipping document sync", { reason: "ENABLE_WRITE_ACTIONS is false" });
      return;
    }

    await clickWithThink(page, logger, page.locator(SELECTORS.documents.syncButton), thinkTime, range, "doc-sync");
  });
}

async function openChatbot(page, config, logger, thinkTime, range) {
  return safeAction(logger, "open-chatbot", async () => {
    await page.goto(`${config.baseUrl}${ROUTES.chatbot}`, { waitUntil: "domcontentloaded" });
    await thinkTime(range.min, range.max);

    const panel = page.locator(SELECTORS.chatbot.panel);
    if (await panel.count()) {
      await panel.first().waitFor({ state: "visible" });
      await thinkTime(range.min, range.max);
      return;
    }

    const openButton = page.locator(SELECTORS.chatbot.openButton);
    if (await openButton.count()) {
      await clickWithThink(page, logger, openButton, thinkTime, range, "chatbot-open");
    }
  });
}

async function sendAiQuestions(page, logger, thinkTime, range, questionCount, sessionLabel) {
  return safeAction(logger, "send-ai-questions", async () => {
    const input = page.locator(SELECTORS.chatbot.questionInput);
    const sendButton = page.locator(SELECTORS.chatbot.sendButton);

    for (let index = 0; index < questionCount; index += 1) {
      const question = `${pickRandom(AI_QUESTIONS)} (${sessionLabel}-${index + 1})`;
      await typeWithThink(page, logger, input, question, thinkTime, range, "chatbot-input");

      if (await sendButton.count()) {
        await clickWithThink(page, logger, sendButton, thinkTime, range, "chatbot-send");
      } else {
        await pressEnterWithThink(logger, input, thinkTime, range, "chatbot-enter");
      }
    }
  });
}

async function taskManagerPersona(page, config, logger, credential, thinkTime, range, sessionLabel) {
  return safeAction(logger, "persona-task-manager", async () => {
    // Nginx + Backend + MongoDB: auth and task writes.
    await login(page, config, logger, credential, thinkTime, range);

    await openDashboard(page, config, logger, thinkTime, range);
    await openWorkspaceTasks(page, config, logger, thinkTime, range);

    const taskCount = randomInt(1, 2);
    for (let index = 0; index < taskCount; index += 1) {
      await createTask(page, config, logger, thinkTime, range, sessionLabel);
    }
    await updateTaskStatus(page, config, logger, thinkTime, range);

    await openCalendar(page, config, logger, thinkTime, range);
  });
}

async function activeChatterPersona(page, config, logger, credential, thinkTime, range, sessionLabel) {
  return safeAction(logger, "persona-active-chatter", async () => {
    // Nginx + Socket.io + MongoDB: realtime chat traffic and message writes.
    await login(page, config, logger, credential, thinkTime, range);

    await openChat(page, config, logger, thinkTime, range);
    const messageCount = MODE === "CHAT_SPAM" ? CHAT_SPAM_MESSAGES : randomInt(3, 5);
    await sendChatMessages(page, logger, thinkTime, range, messageCount, sessionLabel);
  });
}

async function aiKnowledgeManagerPersona(page, config, logger, credential, thinkTime, range, sessionLabel) {
  return safeAction(logger, "persona-ai-knowledge-manager", async () => {
    // Nginx + Backend: auth and navigation.
    await login(page, config, logger, credential, thinkTime, range);

    const loops = MODE === "AI_RESOURCE_STRESS" ? AI_STRESS_LOOPS : 1;

    for (let index = 0; index < loops; index += 1) {
      // MinIO + Backend: upload and sync documents.
      await openDocuments(page, config, logger, thinkTime, range);
      await uploadDocument(page, config, logger, thinkTime, range);
      await syncDocuments(page, config, logger, thinkTime, range);

      // Qdrant + Backend: vector search via chatbot.
      await openChatbot(page, config, logger, thinkTime, range);
      const questionCount = MODE === "AI_RESOURCE_STRESS" ? AI_QUESTIONS_PER_LOOP : randomInt(2, 3);
      await sendAiQuestions(page, logger, thinkTime, range, questionCount, `${sessionLabel}-${index + 1}`);
    }
  });
}

async function authErrorStormPersona(page, config, logger, credential, thinkTime, range) {
  return safeAction(logger, "persona-auth-error-storm", async () => {
    // Nginx + Backend: invalid auth and 4xx/5xx spikes.
    const badPassword = process.env.AUTH_ERROR_PASSWORD || `${credential.password}-wrong`;
    const apiBaseUrl = config.apiBaseUrl || config.baseUrl;

    for (let index = 0; index < AUTH_STORM_ROUNDS; index += 1) {
      await login(page, config, logger, credential, thinkTime, range, badPassword);

      await safeAction(logger, "invalid-api-request", async () => {
        await page.request.get(`${apiBaseUrl}${INVALID_API_PATH}?ts=${Date.now()}`);
        await thinkTime(range.min, range.max);
      });
    }
  });
}

async function captureFailureArtifacts(page, logger) {
  const screenshotPath = path.join(logger.sessionDir, "planner-web-failure.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await logger.log("Saved failure screenshot", { screenshotPath });
}

async function simulateUserJourney(context, config, logger, sessionName, fingerprint, credential, attachApiLogging) {
  const page = await context.newPage();
  attachApiLogging(page, logger);
  page.setDefaultTimeout(config.actionTimeoutMs);
  page.setDefaultNavigationTimeout(config.navigationTimeoutMs);

  const thinkTime = createThinkTime(page);
  const range = ZERO_THINK_TIME
    ? { min: 0, max: 0 }
    : { min: THINK_TIME_MIN_SEC, max: THINK_TIME_MAX_SEC };

  const persona = resolvePersona(MODE);
  const sessionLabel = `${sessionName}-${Date.now().toString(36)}`;

  try {
    await logger.log("Planner-Web journey start", {
      sessionName,
      identifier: credential.identifier,
      mode: MODE,
      persona,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezoneId,
      viewport: fingerprint.viewport
    });

    if (persona === "AUTH_ERROR_STORM") {
      await authErrorStormPersona(page, config, logger, credential, thinkTime, range);
    } else if (persona === "ACTIVE_CHATTER") {
      await activeChatterPersona(page, config, logger, credential, thinkTime, range, sessionLabel);
    } else if (persona === "AI_KNOWLEDGE_MANAGER") {
      await aiKnowledgeManagerPersona(page, config, logger, credential, thinkTime, range, sessionLabel);
    } else {
      await taskManagerPersona(page, config, logger, credential, thinkTime, range, sessionLabel);
    }

    return {
      sessionName,
      identifier: credential.identifier,
      persona,
      mode: MODE,
      success: true
    };
  } catch (error) {
    await logger.log("Planner-Web journey failed", {
      message: error.message
    });
    await captureFailureArtifacts(page, logger).catch(() => null);
    return {
      sessionName,
      identifier: credential.identifier,
      persona,
      mode: MODE,
      success: false,
      error: error.message
    };
  } finally {
    await page.close().catch(() => null);
  }
}

module.exports = {
  simulateUserJourney
};
