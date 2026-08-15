// scripts/generate-gfg-card.mjs
// Fetches live GeeksforGeeks stats for a username and writes gfg-profile-card.svg
// Run: node scripts/generate-gfg-card.mjs <gfg-username>
//
// Data source: https://github.com/napiyo/geeksForGeeksStatsAPI
// Confirmed JSON shape (from the project's own README example):
// { "School": 5, "Basic": 27, "Easy": 56, "Medium": 97, "Hard": 8,
//   "userName": "napiyo", "totalProblemsSolved": 193 }
//
// NOTE: This API does NOT expose Coding Score, Institute Rank, or POTD streak —
// those fields aren't available from any public GFG scraper as of now, so this
// card intentionally only shows what can actually be fetched live.

import fs from "fs";

const username = process.argv[2] || "@mohitjangid108";
const API_URL = `https://geeks-for-geeks-stats-api.vercel.app/?raw=y&userName=${encodeURIComponent(username)}`;

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

  // Ring math (circumference for r=82 is ~515.2)
  const CIRC = 515.2;
  const sum = Math.max(total, 1);
  const schoolLen = (school / sum) * CIRC;
  const basicLen = (basic / sum) * CIRC;
  const easyLen = (easy / sum) * CIRC;
  const mediumLen = (medium / sum) * CIRC;
  const hardLen = (hard / sum) * CIRC;

  const svg = `<svg width="620" height="260" viewBox="0 0 620 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="620" height="260" rx="14" fill="#0d1117" stroke="#21262d" stroke-width="1"/>

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

  <text x="596" y="248" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="10" fill="#484f58">Updated ${new Date().toISOString().slice(0, 10)}</text>
</svg>`;

  fs.writeFileSync("gfg-profile-card.svg", svg);
  console.log("gfg-profile-card.svg written successfully.");
}

main();
