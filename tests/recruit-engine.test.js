const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../recruit-engine.js");

const sevenYears = row => Array.from({ length: 7 }, () => ({ ...row }));

test("preserves FYC product weighting and YEB thresholds", () => {
  const result = engine.calculate({ packageId: "FP12", mbAmount: 10000, years: [{ med: 100000, ci: 200000, sav: 300000 }] });
  assert.equal(result.yearly[1].fyc, 200000);
  assert.equal(result.yearly[1].yeb, 33400);
});

test("preserves FP12 and PA18 proportional MB caps", () => {
  const years = [{ med: 600000, ci: 0, sav: 0 }, { med: 600000, ci: 0, sav: 0 }];
  assert.equal(engine.calculate({ packageId: "FP12", mbAmount: 10000, years }).yearly[1].mb, 120000);
  const pa = engine.calculate({ packageId: "PA18", mbAmount: 20000, years });
  assert.equal(pa.yearly[1].mb, 100000);
  assert.equal(pa.yearly[2].mb, 100000);
});

test("preserves TTFS three-year MB treatment", () => {
  const result = engine.calculate({ packageId: "TTFS", mbAmount: 25000, years: sevenYears({ med: 0, ci: 0, sav: 0 }) });
  assert.deepEqual(result.yearly.slice(1, 5).map(row => row.mb), [300000, 300000, 300000, 0]);
});

test("preserves MDRT, continuous and excellent-agent bonuses", () => {
  const result = engine.calculate({ packageId: "FP12", mbAmount: 10000, years: [{ med: 1564000, ci: 0, sav: 0 }], continuousMdrt: true, excellentAgent: true });
  assert.equal(result.yearly[1].fyc, 391000);
  assert.equal(result.yearly[1].mdrt, 65000);
});

test("preserves renewal commission and elite renewal bonus", () => {
  const result = engine.calculate({ packageId: "FP12", mbAmount: 10000, years: [{ med: 1100000, ci: 0, sav: 0 }] });
  assert.equal(result.yearly[2].rc, 220000);
  assert.equal(result.yearly[2].renewalBonus, 198000);
  assert.equal(result.yearly[3].renewalBonus, 99000);
});

test("returns seven-year totals and cumulative total consistently", () => {
  const result = engine.calculate({ packageId: "PA18", mbAmount: 10000, years: sevenYears({ med: 100000, ci: 100000, sav: 100000 }) });
  assert.equal(result.yearly.length, 8);
  assert.equal(result.cumulative, result.yearly[7].cumulative);
  assert.equal(result.cumulative, result.yearly.slice(1).reduce((sum, row) => sum + row.total, 0));
});
