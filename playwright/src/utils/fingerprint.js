const { randomInt } = require("./human");

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
}

function createFingerprint(config, sessionIndex) {
  const viewport = pickRandom(config.viewports);
  const locale = pickRandom(config.locales);
  const timezoneId = pickRandom(config.timezones);
  const userAgent = pickRandom(config.userAgents);
  const colorScheme = pickRandom(config.colorSchemes);

  return {
    sessionIndex,
    locale,
    timezoneId,
    userAgent,
    colorScheme,
    viewport,
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false
  };
}

module.exports = {
  createFingerprint
};

