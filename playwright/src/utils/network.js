function shouldTrackApi(url) {
  return /\/api\//i.test(url);
}

async function configureResourceBlocking(context, config) {
  const blockedTypes = new Set();

  if (config.blockImages) {
    blockedTypes.add("image");
  }
  if (config.blockFonts) {
    blockedTypes.add("font");
  }
  if (config.blockMedia) {
    blockedTypes.add("media");
  }
  if (config.blockStyles) {
    blockedTypes.add("stylesheet");
  }

  if (blockedTypes.size === 0) {
    return;
  }

  await context.route("**/*", async (route) => {
    const request = route.request();
    if (blockedTypes.has(request.resourceType())) {
      await route.abort();
      return;
    }

    await route.continue();
  });
}

function attachApiLogging(page, logger) {
  const requestStartedAt = new Map();
  const latestJsonByPath = new Map();

  page.on("request", (request) => {
    if (!shouldTrackApi(request.url())) {
      return;
    }

    requestStartedAt.set(request, Date.now());
  });

  page.on("requestfailed", async (request) => {
    if (!shouldTrackApi(request.url())) {
      return;
    }

    const startedAt = requestStartedAt.get(request);
    requestStartedAt.delete(request);

    await logger.logApi({
      timestamp: new Date().toISOString(),
      phase: "requestfailed",
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      failure: request.failure(),
      durationMs: startedAt ? Date.now() - startedAt : null
    });
  });

  page.on("response", async (response) => {
    const request = response.request();
    const url = request.url();

    if (!shouldTrackApi(url)) {
      return;
    }

    const startedAt = requestStartedAt.get(request);
    requestStartedAt.delete(request);

    const contentType = response.headers()["content-type"] || "";
    let responseJson = null;

    if (contentType.includes("application/json")) {
      try {
        responseJson = await response.json();
        latestJsonByPath.set(new URL(url).pathname, responseJson);
      } catch (error) {
        responseJson = {
          parseError: error.message
        };
      }
    }

    await logger.logApi({
      timestamp: new Date().toISOString(),
      phase: "response",
      method: request.method(),
      url,
      status: response.status(),
      ok: response.ok(),
      resourceType: request.resourceType(),
      contentType,
      durationMs: startedAt ? Date.now() - startedAt : null,
      json: responseJson
    });
  });

  return {
    getLatestJson(pathname) {
      return latestJsonByPath.get(pathname);
    }
  };
}

module.exports = {
  attachApiLogging,
  configureResourceBlocking,
  shouldTrackApi
};

