(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecruitCloud = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbzgUnyK9bVOovaj7C5tk4MZXIlTOOnv-Dq4f6KLvk-dWkmk66KkR-yJSVpyyTDAcjUIHA/exec";
  const CONTRACT = "recruit-dataset-v1";
  const VALUE_ALIAS = Object.freeze({ "工作與生活平衡": "Work-Life Balance" });
  const TRADEOFF_TITLES = Object.freeze([
    "收入上升空間", "時間自主", "管理／晉升", "建立自己客戶基礎"
  ]);
  const MAX_ROWS = 150;
  const MAX_BYTES = 180000;

  function isPlain(value) {
    return Boolean(value) && typeof value === "object" &&
      !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }
  function safeText(value, max = 550) {
    return typeof value === "string" && value.trim() && value.length <= max &&
      !/[<>\u0000-\u001f]/.test(value);
  }
  function safeRows(payload, tab, keys, size) {
    const value = payload.tabs && payload.tabs[tab];
    if (!isPlain(value) || !Array.isArray(value.rows) || value.rows.length !== size ||
        value.rows.length > MAX_ROWS) return null;
    if (!value.rows.every(row => isPlain(row) && keys.every(key => safeText(row[key])))) return null;
    return value.rows;
  }
  function parseCatalog(payload, defaults) {
    if (!isPlain(payload) || payload.ok !== true || payload.appId !== "recruit" ||
        payload.contractVersion !== CONTRACT || payload.financialIncluded !== false ||
        !isPlain(payload.tabs) || !Array.isArray(defaults.idealValues) ||
        !Array.isArray(defaults.careerTradeoffs)) {
      return null;
    }
    const ideal = safeRows(payload, "工作價值選項", ["工作價值"], 10);
    const tradeoff = safeRows(payload, "理財工作取捨", ["可能得到", "需要付出"], 4);
    if (!ideal || !tradeoff) return null;
    const values = ideal.map(row => VALUE_ALIAS[row["工作價值"]] || row["工作價值"]);
    // Keep the existing screen choices and stored Top 3 stable. A changed choice
    // vocabulary is a schema migration requiring explicit Owner review.
    if (new Set(values).size !== 10 ||
        !values.every((value, index) => value === defaults.idealValues[index])) return null;
    const descriptions = tradeoff.map((row, index) => [
      TRADEOFF_TITLES[index],
      row["可能得到"],
      row["需要付出"]
    ]);
    return { dataVersion: safeText(payload.dataVersion, 80) ? payload.dataVersion : "待核實",
      idealValues: values, careerTradeoffs: descriptions };
  }
  async function load(defaults, fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null) {
    if (typeof fetchImpl !== "function") return { state: "unavailable" };
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      const response = await fetchImpl(ENDPOINT + "?action=catalog", {
        method: "GET", mode: "cors", cache: "no-store",
        credentials: "omit", redirect: "follow",
        ...(controller ? { signal: controller.signal } : {})
      });
      if (!response.ok) return { state: "http-error" };
      const body = await response.text();
      if (body.length > MAX_BYTES) return { state: "invalid-data" };
      const data = parseCatalog(JSON.parse(body), defaults);
      return data ? { state: "ready", data } : { state: "invalid-data" };
    } catch (_) {
      // GAS ContentService redirect/CORS or network outage must never break
      // local candidate sessions or the existing Recruit Engine.
      return { state: "unavailable" };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return Object.freeze({ ENDPOINT, CONTRACT, parseCatalog, load });
});
