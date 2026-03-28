function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomDelay(minMs, maxMs) {
  const timeout = randomInt(minMs, maxMs);
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

async function typeLikeHuman(locator, text, options = {}) {
  const minDelay = options.minDelay ?? 50;
  const maxDelay = options.maxDelay ?? 140;

  await locator.click();
  await locator.fill("");

  for (const character of text) {
    await locator.pressSequentially(character, {
      delay: randomInt(minDelay, maxDelay)
    });
  }
}

async function moveMouseToLocator(page, locator) {
  const box = await locator.boundingBox();
  if (!box) {
    return;
  }

  const startX = randomInt(20, Math.max(40, Math.floor(box.x)));
  const startY = randomInt(20, Math.max(40, Math.floor(box.y)));
  const endX = Math.floor(box.x + box.width / 2 + randomInt(-6, 6));
  const endY = Math.floor(box.y + box.height / 2 + randomInt(-4, 4));

  await page.mouse.move(startX, startY, { steps: randomInt(8, 16) });
  await randomDelay(60, 180);
  await page.mouse.move(endX, endY, { steps: randomInt(12, 28) });
}

async function hoverAndClick(page, locator) {
  await locator.waitFor({ state: "visible" });
  await moveMouseToLocator(page, locator);
  await locator.hover();
  await randomDelay(80, 220);
  await locator.click();
}

async function randomMouseDrift(page, viewport) {
  const width = viewport?.width ?? 1280;
  const height = viewport?.height ?? 720;

  await page.mouse.move(
    randomInt(Math.floor(width * 0.15), Math.floor(width * 0.85)),
    randomInt(Math.floor(height * 0.15), Math.floor(height * 0.6)),
    { steps: randomInt(10, 24) }
  );
}

async function smoothScroll(page, options = {}) {
  const passes = options.passes ?? randomInt(2, 4);
  const stepMin = options.stepMin ?? 180;
  const stepMax = options.stepMax ?? 420;

  for (let index = 0; index < passes; index += 1) {
    await page.mouse.wheel(0, randomInt(stepMin, stepMax));
    await randomDelay(400, 1200);
  }
}

module.exports = {
  hoverAndClick,
  moveMouseToLocator,
  randomDelay,
  randomInt,
  randomMouseDrift,
  smoothScroll,
  typeLikeHuman
};

