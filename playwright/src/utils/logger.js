const fs = require("fs/promises");
const path = require("path");

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({ serializationError: error.message });
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function createRunArtifacts(outputRoot) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(outputRoot, stamp);
  await ensureDir(runDir);
  return runDir;
}

async function createSessionLogger(runDir, sessionName) {
  const sessionDir = path.join(runDir, sessionName);
  await ensureDir(sessionDir);

  const eventLogPath = path.join(sessionDir, "events.log");
  const apiLogPath = path.join(sessionDir, "api-traffic.jsonl");

  async function writeLine(filePath, payload) {
    await fs.appendFile(filePath, `${payload}\n`, "utf8");
  }

  return {
    sessionDir,
    eventLogPath,
    apiLogPath,
    async log(message, metadata = {}) {
      const entry = {
        timestamp: new Date().toISOString(),
        message,
        metadata
      };

      console.log(`[${sessionName}] ${message}`);
      await writeLine(eventLogPath, safeStringify(entry));
    },
    async logApi(entry) {
      await writeLine(apiLogPath, safeStringify(entry));
    }
  };
}

async function writeSummary(runDir, summary) {
  const summaryPath = path.join(runDir, "summary.json");
  await fs.writeFile(summaryPath, `${safeStringify(summary)}\n`, "utf8");
}

module.exports = {
  createRunArtifacts,
  createSessionLogger,
  writeSummary
};

