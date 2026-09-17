(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecruitEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MB_OPTIONS = Object.freeze({
    FP12: Object.freeze([10000, 15000, 20000, 30000]),
    PA18: Object.freeze([10000, 15000, 20000, 30000, 40000, 50000]),
    TTFS: Object.freeze([25000, 40000, 60000, 80000])
  });

  function normaliseYears(years) {
    return Array.from({ length: 7 }, (_, index) => {
      const source = (years && years[index]) || {};
      return { med: Number(source.med) || 0, ci: Number(source.ci) || 0, sav: Number(source.sav) || 0 };
    });
  }

  function calculate(input) {
    const packageId = MB_OPTIONS[input.packageId] ? input.packageId : "PA18";
    const mbAmount = Number(input.mbAmount) || MB_OPTIONS[packageId][0];
    const years = normaliseYears(input.years);
    const continuousMdrt = Boolean(input.continuousMdrt);
    const excellentAgent = Boolean(input.excellentAgent);
    const yearly = Array.from({ length: 8 }, () => ({ fyc: 0, mb: 0, yeb: 0, rc: 0, renewalBonus: 0, mdrt: 0, total: 0, cumulative: 0 }));

    years.forEach((business, index) => {
      const year = index + 1;
      const fyc = business.med * 0.25 + business.ci * 0.5 + business.sav * 0.25;
      const yebRate = fyc >= 391000 ? 0.235 : fyc >= 275000 ? 0.194 : fyc >= 128000 ? 0.167 : 0;
      yearly[year].fyc += fyc;
      yearly[year].yeb += fyc > 0 ? fyc * yebRate : 0;

      if (fyc >= 2656000) yearly[year].mdrt = 120000 + (continuousMdrt ? 65000 : 0) + (excellentAgent ? 15000 : 0);
      else if (fyc >= 1328000) yearly[year].mdrt = 60000 + (continuousMdrt ? 35000 : 0) + (excellentAgent ? 15000 : 0);
      else if (fyc >= 391000) yearly[year].mdrt = 30000 + (continuousMdrt ? 20000 : 0) + (excellentAgent ? 15000 : 0);

      if (packageId === "FP12" && year === 1) yearly[year].mb = Math.min(mbAmount * 12, fyc / 1.25);
      else if (packageId === "PA18" && year === 1) yearly[year].mb = Math.min(mbAmount * 12, fyc / 1.5);
      else if (packageId === "PA18" && year === 2) yearly[year].mb = Math.min(mbAmount * 6, fyc / 1.5);
      else if (packageId === "TTFS" && year <= 3) yearly[year].mb = mbAmount * 12;

      const rcBase = business.med * 0.2 + business.ci * 0.1 + business.sav * 0.05;
      const elite = fyc >= 275000;
      const r2Rate = elite ? 0.9 : 0.7;
      const r36Rate = elite ? 0.45 : 0.35;
      for (let resultYear = year + 1; resultYear <= 7; resultYear += 1) {
        const age = resultYear - year + 1;
        yearly[resultYear].rc += rcBase;
        if (age === 2) yearly[resultYear].renewalBonus += rcBase * r2Rate;
        else if (age >= 3 && age <= 6) yearly[resultYear].renewalBonus += rcBase * r36Rate;
      }
    });

    let cumulative = 0;
    for (let year = 1; year <= 7; year += 1) {
      const row = yearly[year];
      row.total = row.fyc + row.mb + row.yeb + row.rc + row.renewalBonus + row.mdrt;
      cumulative += row.total;
      row.cumulative = cumulative;
    }
    return { packageId, mbAmount, years, yearly, cumulative };
  }

  return Object.freeze({ MB_OPTIONS, calculate });
});
