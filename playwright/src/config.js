const path = require("path");

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 }
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
];

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

function parseList(value, fallback) {
  if (!value) {
    return fallback;
  }

  const items = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
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

function createConfig(argv = process.argv.slice(2)) {
  const headedFlag = argv.includes("--headed");
  const baseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
  const journeyName = process.env.JOURNEY || process.env.JOURNEY_NAME || "festive-suite";
  const credentials = parseCredentials(process.env.USER_CREDENTIALS);
  const fallbackCredential = process.env.LOGIN_IDENTIFIER && process.env.LOGIN_PASSWORD
    ? [{
        identifier: process.env.LOGIN_IDENTIFIER,
        password: process.env.LOGIN_PASSWORD
      }]
    : [];
  const resolvedCredentials = credentials.length > 0 ? credentials : fallbackCredential;
  const resolvedSessionCount = process.env.SESSION_COUNT
    ? parseNumber(process.env.SESSION_COUNT, 1)
    : Math.max(resolvedCredentials.length, 1);

  return {
    baseUrl,
    apiBaseUrl: process.env.API_BASE_URL || baseUrl,
    loginIdentifier: process.env.LOGIN_IDENTIFIER || "",
    loginPassword: process.env.LOGIN_PASSWORD || "",
    credentials: resolvedCredentials,
    journeyName,
    mode: process.env.MODE || "NORMAL",
    headless: headedFlag ? false : parseBoolean(process.env.HEADLESS, true),
    continuous: parseBoolean(process.env.CONTINUOUS, false),
    sessionCount: resolvedSessionCount,
    maxConcurrency: parseNumber(process.env.MAX_CONCURRENCY, 1),
    cycleDelayMs: parseNumber(process.env.CYCLE_DELAY_MS, 5000),
    maxCycles: parseNumber(process.env.MAX_CYCLES, 0),
    blockImages: parseBoolean(process.env.BLOCK_IMAGES, false),
    blockFonts: parseBoolean(process.env.BLOCK_FONTS, true),
    blockMedia: parseBoolean(process.env.BLOCK_MEDIA, true),
    blockStyles: parseBoolean(process.env.BLOCK_STYLES, false),
    enableWriteActions: parseBoolean(process.env.ENABLE_WRITE_ACTIONS, false),
    calendarEventPrefix: process.env.CALENDAR_EVENT_PREFIX || "[PW] Smoke Event",
    actionTimeoutMs: parseNumber(process.env.ACTION_TIMEOUT_MS, 15000),
    navigationTimeoutMs: parseNumber(process.env.NAVIGATION_TIMEOUT_MS, 45000),
    locales: parseList(process.env.LOCALES, ["en-US", "vi-VN", "en-GB"]),
    timezones: parseList(process.env.TIMEZONES, [
      "America/New_York",
      "Europe/London",
      "Asia/Ho_Chi_Minh"
    ]),
    colorSchemes: parseList(process.env.COLOR_SCHEMES, ["light", "dark"]),
    viewports: VIEWPORTS,
    userAgents: USER_AGENTS,
    outputRoot: path.join(__dirname, "..", "output")
  };
}

module.exports = {
  createConfig
};
