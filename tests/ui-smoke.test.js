const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
let server, browser, baseUrl;
const browserAvailable = fs.existsSync(chromium.executablePath());

test.before(async () => {
  if (!browserAvailable) return;
  server = http.createServer((req, res) => {
    const requested = req.url === "/" ? "index.html" : req.url.split("?")[0].slice(1);
    const target = path.resolve(root, requested);
    if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404).end(); return; }
    const type = target.endsWith(".js") ? "text/javascript" : target.endsWith(".css") ? "text/css" : target.endsWith(".json") ? "application/json" : "text/html";
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(target).pipe(res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); });

test("guided flow reaches income result without console errors", async () => {
  if (!browserAvailable) return test.skip("Playwright Chromium executable is not installed in this environment");
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseUrl);
  await page.click('[data-step="welcome"] [data-next]');
  for (let i = 0; i < 3; i += 1) await page.locator("#idealOptions .option").nth(i).click();
  await page.click('[data-step="ideal"] [data-next]');
  await page.click('[data-step="rank"] [data-next]');
  await page.click('#employmentOptions [data-value="not-employed"]');
  await page.click('[data-step="employment"] [data-next]');
  for (const step of ["tradeoff","industry","ava-method","career-tradeoff"]) await page.click(`[data-step="${step}"] [data-next]`);
  await page.click('#pathOptions [data-value="flexible"]');
  await page.click('[data-step="path-choice"] [data-next]');
  await page.click('[data-step="paths"] [data-next]');
  await page.click('[data-step="income-intro"] [data-next]');
  await page.fill("#medInput", "600000");
  await page.click('[data-step="income-input"] [data-next]');
  assert.match(await page.locator("#incomeSummary").innerText(), /模擬總收入/);
  assert.equal(errors.length, 0, errors.join("\n"));
  await page.close();
});

for (const viewport of [{ name: "iPhone", width: 390, height: 844 }, { name: "Foldable", width: 717, height: 768 }, { name: "iPad portrait", width: 768, height: 1024 }, { name: "iPad landscape", width: 1024, height: 768 }, { name: "Desktop", width: 1440, height: 900 }]) {
  test(`no horizontal overflow at ${viewport.name}`, async () => {
    if (!browserAvailable) return test.skip("Playwright Chromium executable is not installed in this environment");
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.client, `${dimensions.scroll} > ${dimensions.client}`);
    await page.close();
  });
}
