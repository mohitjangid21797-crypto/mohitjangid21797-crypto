// scripts/generate-gfg-card.mjs
// Fetches live GeeksforGeeks stats for a username and writes gfg-profile-card.svg
// Run: node scripts/generate-gfg-card.mjs <gfg-username>
//
// Solved counts: https://gfgstatscard.vercel.app/<user>?raw=true
// Heatmap (daily submissions): GfG practice API (unverified; card falls back if it fails)

import fs from "fs";

const username = process.argv[2] || "mohitjangid108";
const API_URL = `https://gfgstatscard.vercel.app/${encodeURIComponent(username)}?raw=true`;
const SUBMISSIONS_URL = "https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/";

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Response was not valid JSON:", text.slice(0, 300));
      return null;
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
    return null;
  }
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Returns { "YYYY-MM-DD": count } for the last two calendar years
async function fetchSubmissionDays(handle) {
  const days = {};
  const thisYear = new Date().getUTCFullYear();

  for (const year of [thisYear - 1, thisYear]) {
    try {
      const res = await fetch(SUBMISSIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ handle, requestType: "getYearwiseUserSubmissions", year, month: "" }),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error(`Heatmap ${year}: not JSON:`, text.slice(0, 200));
        continue;
      }

      const result = json?.result;
      if (!result || typeof result !== "object") {
        console.error(`Heatmap ${year}: unexpected shape:`, text.slice(0, 200));
        continue;
      }

      let added = 0;
      for (const [date, v] of Object.entries(result)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const count = num(v !== null && typeof v === "object" ? (v.count ?? v.submissions) : v, 0);
        days[date] = count;
        added++;
      }
      console.log(`Heatmap ${year}: ${added} day entries`);
    } catch (err) {
      console.error(`Heatmap ${year}: fetch failed:`, err.message);
    }
  }
  return days;
}

function levelColor(c) {
  if (c <= 0) return "#161b22";
  if (c === 1) return "#0e4429";
  if (c <= 3) return "#006d32";
  if (c <= 6) return "#26a641";
  return "#39d353";
}

// Builds the heatmap block (53 weeks x 7 days, ending today). Returns SVG string.
function buildHeatmap(days, yTop) {
  const CELL = 8, GAP = 2, STEP = CELL + GAP, COLS = 53;
  const x0 = Math.round((620 - COLS * STEP) / 2);
  const gridY = yTop + 26;

  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (52 * 7 + end.getUTCDay()));

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let cells = "", labels = "", lastMonth = -1, total = 0, activeDays = 0;

  for (let i = 0; i <= 52 * 7 + end.getUTCDay(); i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    if (d > end) break;
    const col = Math.floor(i / 7), row = i % 7;
    const key = d.toISOString().slice(0, 10);
    const count = days[key] || 0;
    total += count;
    if (count > 0) activeDays++;

    if (row === 0 && d.getUTCMonth() !== lastMonth) {
      lastMonth = d.getUTCMonth();
      labels += `<text x="${x0 + col * STEP}" y="${yTop + 20}" font-family="Segoe UI, sans-serif" font-size="9" fill="#8b949e">${months[lastMonth]}</text>`;
    }
    cells += `<rect x="${x0 + col * STEP}" y="${gridY + row * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${levelColor(count)}"><title>${key}: ${count} submission(s)</title></rect>`;
  }

  const legendY = gridY + 7 * STEP + 14;
  const legend = [0, 1, 2, 4, 7].map((c, i) =>
    `<rect x="${530 + i * 12}" y="${legendY - 8}" width="${CELL}" height="${CELL}" rx="2" fill="${levelColor(c)}"/>`
  ).join("");

  const svg = `
  <line x1="24" y1="${yTop - 8}" x2="596" y2="${yTop - 8}" stroke="#21262d" stroke-width="1"/>
  <text x="45" y="${yTop + 6}" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#e6edf3">${total} submissions in the last year · ${activeDays} active days</text>
  ${labels}
  ${cells}
  <text x="518" y="${legendY}" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="9" fill="#8b949e">Less</text>
  ${legend}
  <text x="596" y="${legendY}" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="9" fill="#8b949e">More</text>`;

  return { svg, height: legendY - yTop + 20 };
}

async function main() {
  const data = await fetchJson(API_URL);

  if (!data || data.error) {
    console.error("API returned an error or no data:", data?.error || "unknown");
    console.error("Check that the username is correct and has at least 1 solved problem on GFG.");
  }

  const school = num(data?.School, 0);
  const basic = num(data?.Basic, 0);
  const easy = num(data?.Easy, 0);
  const medium = num(data?.Medium, 0);
  const hard = num(data?.Hard, 0);
  const total = num(data?.totalProblemsSolved, school + basic + easy + medium + hard);

  console.log("Fetched GFG stats:", { school, basic, easy, medium, hard, total });

  // Heatmap: only drawn if daily data was actually found
  const days = await fetchSubmissionDays(username);
  const hasHeatmap = Object.values(days).some((c) => c > 0);
  let heatmapSvg = "";
  let cardHeight = 260;
  if (hasHeatmap) {
    const hm = buildHeatmap(days, 290);
    heatmapSvg = hm.svg;
    cardHeight = 290 + hm.height + 8;
    console.log("Heatmap: drawn");
  } else {
    console.log("Heatmap: no daily data found, skipping (card unchanged)");
  }

  // Ring math (circumference for r=82 is ~515.2)
  const CIRC = 515.2;
  const sum = Math.max(total, 1);
  const schoolLen = (school / sum) * CIRC;
  const basicLen = (basic / sum) * CIRC;
  const easyLen = (easy / sum) * CIRC;
  const mediumLen = (medium / sum) * CIRC;
  const hardLen = (hard / sum) * CIRC;

  const svg = `<svg width="620" height="${cardHeight}" viewBox="0 0 620 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="620" height="${cardHeight}" rx="14" fill="#0d1117" stroke="#21262d" stroke-width="1"/>

  <g transform="translate(24,24)">
    <circle cx="16" cy="16" r="16" fill="#2F8D46"/>
    <text x="16" y="21" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#fff">${username.charAt(0).toUpperCase()}</text>
    <text x="42" y="12" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700" fill="#e6edf3">${username}</text>
    <text x="42" y="30" font-family="Segoe UI, sans-serif" font-size="12" fill="#8b949e">GeeksforGeeks Profile</text>
  </g>
  <line x1="24" y1="66" x2="596" y2="66" stroke="#21262d" stroke-width="1"/>

  <g transform="translate(140,175)">
    <circle r="82" fill="none" stroke="#21262d" stroke-width="18"/>
    <circle r="82" fill="none" stroke="#4dd0e1" stroke-width="18" stroke-dasharray="${schoolLen} ${CIRC}" transform="rotate(-90)"/>
    <circle r="82" fill="none" stroke="#7ED957" stroke-width="18" stroke-dasharray="${basicLen} ${CIRC}" stroke-dashoffset="${-schoolLen}" transform="rotate(-90)"/>
    <circle r="82" fill="none" stroke="#4caf50" stroke-width="18" stroke-dasharray="${easyLen} ${CIRC}" stroke-dashoffset="${-(schoolLen + basicLen)}" transform="rotate(-90)"/>
    <circle r="82" fill="none" stroke="#f5a623" stroke-width="18" stroke-dasharray="${mediumLen} ${CIRC}" stroke-dashoffset="${-(schoolLen + basicLen + easyLen)}" transform="rotate(-90)"/>
    <circle r="82" fill="none" stroke="#ef4743" stroke-width="18" stroke-dasharray="${hardLen} ${CIRC}" stroke-dashoffset="${-(schoolLen + basicLen + easyLen + mediumLen)}" transform="rotate(-90)"/>
    <text x="0" y="-6" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="38" font-weight="800" fill="#ffffff">${total}</text>
    <text x="0" y="20" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="13" fill="#8b949e">Problems Solved</text>
  </g>

  <g transform="translate(320,100)" font-family="Segoe UI, sans-serif" font-size="15" fill="#c9d1d9">
    <rect x="0" y="0" width="10" height="10" rx="2" fill="#4dd0e1"/><text x="18" y="10">School (${school})</text>
    <rect x="0" y="30" width="10" height="10" rx="2" fill="#7ED957"/><text x="18" y="40">Basic (${basic})</text>
    <rect x="0" y="60" width="10" height="10" rx="2" fill="#4caf50"/><text x="18" y="70">Easy (${easy})</text>
    <rect x="0" y="90" width="10" height="10" rx="2" fill="#f5a623"/><text x="18" y="100">Medium (${medium})</text>
    <rect x="0" y="120" width="10" height="10" rx="2" fill="#ef4743"/><text x="18" y="130">Hard (${hard})</text>
  </g>
  ${heatmapSvg}
  <text x="596" y="${cardHeight - 12}" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="10" fill="#484f58">Updated ${new Date().toISOString().slice(0, 10)}</text>
</svg>`;

  fs.writeFileSync("gfg-profile-card.svg", svg);
  console.log("gfg-profile-card.svg written successfully.");
}

main();
