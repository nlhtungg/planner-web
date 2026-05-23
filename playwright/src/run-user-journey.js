require("dotenv").config();

const { chromium } = require("playwright");

const { createConfig } = require("./config");
const { simulateUserJourney: simulateFestiveSuiteJourney } = require("./journeys/festiveSuiteJourney");
const { simulateUserJourney: simulatePlannerWebJourney } = require("./journeys/plannerWebJourney");
const { createFingerprint } = require("./utils/fingerprint");
const { createRunArtifacts, createSessionLogger, writeSummary } = require("./utils/logger");
const { attachApiLogging, configureResourceBlocking } = require("./utils/network");

let shouldStop = false;

function assertConfig(config) {
  if (!Array.isArray(config.credentials) || config.credentials.length === 0) {
    throw new Error("Provide credentials using USER_CREDENTIALS or LOGIN_IDENTIFIER and LOGIN_PASSWORD.");
  }

  if (config.maxConcurrency > config.sessionCount) {
    config.maxConcurrency = config.sessionCount;
  }
}

function resolveJourney(config) {
  const journeyName = String(config.journeyName || "").trim().toLowerCase();

  if (["planner", "planner-web", "plannerweb"].includes(journeyName)) {
    return {
      name: "planner-web",
      simulateUserJourney: simulatePlannerWebJourney
    };
  }

  if (journeyName && !["festive-suite", "festive"].includes(journeyName)) {
    console.warn(`Unknown JOURNEY '${config.journeyName}', defaulting to festive-suite.`);
  }

  return {
    name: "festive-suite",
    simulateUserJourney: simulateFestiveSuiteJourney
  };
}

function registerSignalHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      shouldStop = true;
      console.log(`Received ${signal}. Will stop after the current cycle finishes.`);
    });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printBrowserDependencyHint(error) {
  const message = String(error?.message || "");
  const missingLibPattern = /error while loading shared libraries|libnspr4\.so/i;
  if (!missingLibPattern.test(message)) {
    return;
  }

  console.error("\nPlaywright browser launch failed due to missing Linux shared libraries.");
  console.error("Run one of these commands and retry:");
  console.error("  cd playwright && npm run setup:browsers");
  console.error("or");
  console.error("  sudo apt-get update && sudo apt-get install -y libnspr4 libnss3");
}

async function runSession(browser, config, runDir, sessionIndex, journey) {
  const sessionName = `session-${String(sessionIndex + 1).padStart(2, "0")}`;
  const logger = await createSessionLogger(runDir, sessionName);
  const fingerprint = createFingerprint(config, sessionIndex);
  const credential = config.credentials[sessionIndex % config.credentials.length];

  await logger.log("Preparing browser context", {
    ...fingerprint,
    identifier: credential.identifier
  });

  const context = await browser.newContext({
    colorScheme: fingerprint.colorScheme,
    deviceScaleFactor: fingerprint.deviceScaleFactor,
    extraHTTPHeaders: {
      "Accept-Language": fingerprint.locale
    },
    hasTouch: fingerprint.hasTouch,
    isMobile: fingerprint.isMobile,
    locale: fingerprint.locale,
    timezoneId: fingerprint.timezoneId,
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport
  });

  try {
    await configureResourceBlocking(context, config);
    return await journey.simulateUserJourney(
      context,
      config,
      logger,
      sessionName,
      fingerprint,
      credential,
      attachApiLogging
    );
  } finally {
    await context.close().catch(() => null);
  }
}

async function runWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runner() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => runner()
  );

  await Promise.all(workers);
  return results;
}

async function runCycle(browser, config, cycleIndex, journey) {
  const runDir = await createRunArtifacts(config.outputRoot);
  const sessions = Array.from({ length: config.sessionCount }, (_, index) => index);
  const results = await runWithConcurrency(
    sessions,
    async (_, index) => runSession(browser, config, runDir, index, journey),
    config.maxConcurrency
  );

  const summary = {
    createdAt: new Date().toISOString(),
    cycle: cycleIndex + 1,
    config: {
      journey: journey.name,
      mode: config.mode,
      baseUrl: config.baseUrl,
      headless: config.headless,
      continuous: config.continuous,
      cycleDelayMs: config.cycleDelayMs,
      maxCycles: config.maxCycles,
      sessionCount: config.sessionCount,
      maxConcurrency: config.maxConcurrency,
      credentialCount: config.credentials.length,
      blockImages: config.blockImages,
      blockFonts: config.blockFonts,
      blockMedia: config.blockMedia,
      blockStyles: config.blockStyles,
      enableWriteActions: config.enableWriteActions
    },
    results
  };

  await writeSummary(runDir, summary);

  const failed = results.filter((result) => !result.success);
  if (failed.length > 0) {
    process.exitCode = 1;
  }

  return {
    runDir,
    results
  };
}

async function main() {
  const config = createConfig();
  assertConfig(config);
  registerSignalHandlers();
  const journey = resolveJourney(config);

  let browser;
  try {
    browser = await chromium.launch({
      headless: config.headless
    });
  } catch (error) {
    printBrowserDependencyHint(error);
    throw error;
  }

  try {
    let cycleIndex = 0;

    while (!shouldStop) {
      console.log(`Starting cycle ${cycleIndex + 1}`);
      const { runDir } = await runCycle(browser, config, cycleIndex, journey);
      console.log(`Finished cycle ${cycleIndex + 1}. Output: ${runDir}`);
      cycleIndex += 1;

      const reachedMaxCycles = config.maxCycles > 0 && cycleIndex >= config.maxCycles;
      if (!config.continuous || reachedMaxCycles || shouldStop) {
        break;
      }

      console.log(`Waiting ${config.cycleDelayMs}ms before next cycle.`);
      await sleep(config.cycleDelayMs);
    }
  } finally {
    await browser.close().catch(() => null);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
