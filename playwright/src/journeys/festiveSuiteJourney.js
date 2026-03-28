const path = require("path");

const {
  hoverAndClick,
  randomDelay,
  randomInt,
  randomMouseDrift,
  smoothScroll,
  typeLikeHuman
} = require("../utils/human");

async function safeStep(logger, stepName, action, options = {}) {
  const rethrow = options.rethrow ?? false;

  try {
    await logger.log(`START ${stepName}`);
    const result = await action();
    await logger.log(`DONE ${stepName}`);
    return result;
  } catch (error) {
    await logger.log(`ERROR ${stepName}`, {
      message: error.message
    });

    if (rethrow) {
      throw error;
    }

    return null;
  }
}

async function loginToFestiveSuite(page, config, logger, fingerprint, credential) {
  await logger.log("Opening login page", {
    baseUrl: config.baseUrl,
    identifier: credential.identifier,
    locale: fingerprint.locale,
    timezoneId: fingerprint.timezoneId,
    viewport: fingerprint.viewport
  });

  await page.goto(`${config.baseUrl}/login`, {
    waitUntil: "domcontentloaded"
  });

  await page.getByRole("heading", { name: "Welcome Back" }).waitFor();
  await randomDelay(500, 1200);

  const identifierInput = page.getByPlaceholder("Enter your email or username");
  const passwordInput = page.getByPlaceholder("Enter your password");
  const submitButton = page.getByRole("button", { name: "Sign in" });

  await typeLikeHuman(identifierInput, credential.identifier);
  await randomDelay(250, 700);
  await typeLikeHuman(passwordInput, credential.password, {
    minDelay: 70,
    maxDelay: 160
  });
  await randomDelay(300, 900);
  await hoverAndClick(page, submitButton);

  const loginOutcome = await Promise.race([
    page
      .waitForURL(/\/home$/, {
        timeout: config.navigationTimeoutMs
      })
      .then(() => "home")
      .catch(() => ({
        type: "navigation-timeout",
        message: "Login did not reach /home before timeout."
      })),
    page
      .getByText("Verification")
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => "totp")
      .catch(() => null),
    page
      .locator("form")
      .getByText(/failed|invalid|required|error/i)
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .then(async () => ({
        type: "error",
        message: await page
          .locator("form")
          .getByText(/failed|invalid|required|error/i)
          .first()
          .textContent()
      }))
      .catch(() => null)
  ]);

  if (loginOutcome === "totp") {
    throw new Error("Journey stopped because this account requires TOTP.");
  }

  if (loginOutcome && loginOutcome.type === "error") {
    throw new Error(loginOutcome.message || "Login failed.");
  }

  if (loginOutcome && loginOutcome.type === "navigation-timeout") {
    throw new Error(loginOutcome.message);
  }

  await randomDelay(900, 1800);
}

async function browseHome(page) {
  await page.getByRole("button", { name: "User profile" }).waitFor();
  await randomDelay(400, 900);
  await smoothScroll(page, { passes: randomInt(2, 4) });
  await page.mouse.wheel(0, -randomInt(180, 360));
  await randomDelay(300, 700);
}

async function openWorkspaceArea(page, logger) {
  const workspacesButton = page.getByRole("button", { name: "Workspaces" }).first();
  await hoverAndClick(page, workspacesButton);
  await page.getByRole("heading", { name: "Workspaces" }).waitFor();
  await randomDelay(500, 1200);
  await smoothScroll(page, { passes: randomInt(2, 3) });

  await safeStep(logger, "workspace discover tab", async () => {
    await hoverAndClick(page, page.getByRole("button", { name: "Discover" }));
    await randomDelay(400, 900);
    await hoverAndClick(page, page.getByRole("button", { name: "My Workspaces" }));
    await randomDelay(400, 900);
  });
}

function pickFirstWorkspaceId(workspacesPayload) {
  if (!workspacesPayload) {
    return null;
  }

  const items = Array.isArray(workspacesPayload.data) ? workspacesPayload.data : [];
  if (items.length === 0) {
    return null;
  }

  const candidate = items.find((workspace) => workspace?._id || workspace?.id);
  return candidate?._id || candidate?.id || null;
}

async function browseWorkspaceDetail(page, tracker, config, logger) {
  const workspacesPayload = tracker.getLatestJson("/api/workspaces");
  const workspaceId = pickFirstWorkspaceId(workspacesPayload);

  if (!workspaceId) {
    await logger.log("No workspace available to open from /api/workspaces");
    return;
  }

  await logger.log("Opening workspace detail", { workspaceId });
  await page.goto(`${config.baseUrl}/workspace/${workspaceId}`, {
    waitUntil: "domcontentloaded"
  });

  await randomDelay(700, 1400);
  await page.getByRole("button", { name: "Overview" }).waitFor();
  await smoothScroll(page, { passes: randomInt(2, 4) });

  for (const tabName of ["Posts", "Tasks", "Documents", "Members", "Overview"]) {
    await safeStep(logger, `workspace tab ${tabName}`, async () => {
      await hoverAndClick(page, page.getByRole("button", { name: tabName }));
      await randomDelay(700, 1400);
      await randomMouseDrift(page, page.viewportSize());
    });
  }
}

function buildCalendarEventTitle(config, sessionName) {
  return `${config.calendarEventPrefix} ${sessionName} ${new Date().toISOString().slice(0, 16)}`;
}

function buildFutureDateValue() {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  return target.toISOString().slice(0, 10);
}

async function maybeCreateCalendarEvent(page, config, logger, sessionName) {
  if (!config.enableWriteActions) {
    await logger.log("Skipping calendar write actions", {
      reason: "ENABLE_WRITE_ACTIONS is false"
    });
    return;
  }

  const title = buildCalendarEventTitle(config, sessionName);
  const dueDate = buildFutureDateValue();

  await safeStep(
    logger,
    "create personal calendar event",
    async () => {
      await hoverAndClick(page, page.getByRole("button", { name: "Add Event" }));
      const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
      await page.getByRole("heading", { name: "Create New Task" }).waitFor();
      await randomDelay(300, 700);
      await typeLikeHuman(page.getByPlaceholder("Enter task title"), title);
      await randomDelay(250, 650);
      await typeLikeHuman(
        page.getByPlaceholder("Enter task description"),
        "Created by the authorized Playwright smoke journey."
      );
      await randomDelay(250, 650);
      await modal.locator('input[type="date"]').fill(dueDate);
      await randomDelay(250, 650);
      await modal.locator("select").nth(0).selectOption("medium");
      await modal.locator("select").nth(1).selectOption("todo");
      await randomDelay(300, 700);
      await hoverAndClick(page, page.getByRole("button", { name: "Create Task" }));
      await randomDelay(1200, 2200);
    },
    { rethrow: false }
  );
}

async function browseCalendar(page, config, logger, sessionName) {
  await hoverAndClick(page, page.getByRole("button", { name: "Calendar" }).first());
  await page.getByRole("heading", { name: "Calendar" }).waitFor();
  await randomDelay(700, 1400);
  await smoothScroll(page, { passes: randomInt(1, 2), stepMin: 120, stepMax: 260 });
  await maybeCreateCalendarEvent(page, config, logger, sessionName);
}

async function captureFailureArtifacts(page, logger) {
  const screenshotPath = path.join(logger.sessionDir, "failure.png");
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  await logger.log("Saved failure screenshot", { screenshotPath });
}

async function simulateUserJourney(context, config, logger, sessionName, fingerprint, credential, attachApiLogging) {
  const page = await context.newPage();
  const tracker = attachApiLogging(page, logger);
  page.setDefaultTimeout(config.actionTimeoutMs);
  page.setDefaultNavigationTimeout(config.navigationTimeoutMs);

  try {
    await safeStep(logger, "login", async () => {
      await loginToFestiveSuite(page, config, logger, fingerprint, credential);
    }, { rethrow: true });

    await safeStep(logger, "home browsing", async () => {
      await browseHome(page);
    });

    await safeStep(logger, "workspaces browsing", async () => {
      await openWorkspaceArea(page, logger);
      await browseWorkspaceDetail(page, tracker, config, logger);
    });

    await safeStep(logger, "calendar browsing", async () => {
      await browseCalendar(page, config, logger, sessionName);
    });

    return {
      sessionName,
      identifier: credential.identifier,
      success: true
    };
  } catch (error) {
    await logger.log("Journey failed", {
      message: error.message
    });
    await captureFailureArtifacts(page, logger).catch(() => null);
    return {
      sessionName,
      identifier: credential.identifier,
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
