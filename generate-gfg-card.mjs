// scripts/generate-gfg-card.mjs
// Fetches live GeeksforGeeks stats for a username and writes gfg-profile-card.svg
// Run: node scripts/generate-gfg-card.mjs <gfg-username>

import fs from "fs";

const username = process.argv[2] || "mohitjangid108";

// Source 1: difficulty breakdown + total solved (documented raw=true support)
const BREAKDOWN_URL = `https://gfgstatscard.vercel.app/${username}?raw=true`;
// Source 2: coding score / institute rank / streak (best-effort, may be incomplete)
const EXTRA_URL = `https://geeks-for-geeks-api.vercel.app/${username}`;

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const breakdown = await fetchJson(BREAKDOWN_URL);
  const extra = await fetchJson(EXTRA_URL);

  // NOTE: Adjust these field paths if the API response shape differs.
  // Run this script locally first and console.log(breakdown) / console.log(extra)
  // to confirm the real key names before relying on the GitHub Action.
  const school = num(breakdown?.school ?? breakdown?.data?.school, 0);
  const basic = num(breakdown?.basic ?? breakdown?.data?.basic, 0);
  const easy = num(breakdown?.easy ?? breakdown?.data?.easy, 0);
  const medium = num(breakdown?.medium ?? breakdown?.data?.medium, 0);
  const hard = num(breakdown?.hard ?? breakdown?.data?.hard, 0);
  const total = num(
    breakdown?.total ?? breakdown?.data?.total,
    school + basic + easy + medium + hard
  );

  const codingScore = extra?.info?.codingScore ?? "N/A";
  const instituteRank = extra?.info?.instituteRank ?? "N/A";
  const currentStreak = num(extra?.info?.currentStreak, 0);
  const maxStreak = num(extra?.info?.maxStreak, 0);

  // Ring math (circumference for r=82 is ~515.2)
  const CIRC = 515.2;
  const sum = Math.max(total, 1);
  const basicLen = (basic / sum) * CIRC;
  const easyLen = (easy / sum) * CIRC;
  const mediumLen = (medium / sum) * CIRC;
  const hardLen = (hard / sum) * CIRC;

  const svg = `<svg width="900" height="330" viewBox="0 0 900 330" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f5a623"/>
      <stop offset="100%" stop-color="#f76b6b"/>
    </linearGradient>
  </defs>
  <rect width="900" height="330" rx="14" fill="#0d1117" stroke="#21262d" stroke-width="1"/>
  <g transform="translate(24,24)">
    <circle cx="16" cy="16" r="16" fill="#2F8D46"/>
    <text x="16" y="21" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#fff">${username.charAt(0).toUpperCase()}</text>
    <text x="42" y="12" font-family="Segoe UI, sans-serif" font-size="20" font-weight="700" fill="#e6edf3">${username}</text>
    <text x="42" y="32" font-family="Segoe UI, sans-serif" font-size="13" fill="#8b949e">GeeksforGeeks Profile</text>
  </g>
  <line x1="24" y1="70" x2="876" y2="70" stroke="#21262d" stroke-width="1"/>

  <g transform="translate(150,205)">
    <circle r="82" fill="none" stroke="#7ED957" stroke-width="18" stroke-dasharray="${basicLen + easyLen} ${CIRC}" transform="rotate(-90)"/>
    <circle r="82" fill="none" stroke="#f5a623" stroke-width="18" stroke-dasharray="${mediumLen} ${CIRC}" stroke-dashoffset="${-(basicLen + easyLen)}" transform="rotate(-90)"/>
    <circle r="82" fill="none" stroke="#ef4743" stroke-width="18" stroke-dasharray="${hardLen} ${CIRC}" stroke-dashoffset="${-(basicLen + easyLen + mediumLen)}" transform="rotate(-90)"/>
    <text x="0" y="-6" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="40" font-weight="800" fill="#ffffff">${total}</text>
    <text x="0" y="22" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="14" fill="#8b949e">Problems Solved</text>
  </g>

  <g transform="translate(300,120)" font-family="Segoe UI, sans-serif" font-size="14" fill="#c9d1d9">
    <rect x="0" y="0" width="10" height="10" rx="2" fill="#4dd0e1"/><text x="18" y="10">School (${school})</text>
    <rect x="0" y="30" width="10" height="10" rx="2" fill="#7ED957"/><text x="18" y="40">Basic (${basic})</text>
    <rect x="0" y="60" width="10" height="10" rx="2" fill="#4caf50"/><text x="18" y="70">Easy (${easy})</text>
    <rect x="0" y="90" width="10" height="10" rx="2" fill="#f5a623"/><text x="18" y="100">Medium (${medium})</text>
    <rect x="0" y="120" width="10" height="10" rx="2" fill="#ef4743"/><text x="18" y="130">Hard (${hard})</text>
  </g>

  <g transform="translate(500,100)" font-family="Segoe UI, sans-serif" font-size="15">
    <rect x="0" y="0" width="180" height="46" rx="8" fill="#0e2a1c" stroke="#1c4d33"/>
    <text x="14" y="29" fill="#c9d1d9">Coding Score</text>
    <text x="166" y="29" text-anchor="end" font-weight="700" fill="#ffffff">${codingScore}</text>

    <rect x="0" y="58" width="180" height="46" rx="8" fill="#111826" stroke="#22314a"/>
    <text x="14" y="87" fill="#c9d1d9">Problems Solved</text>
    <text x="166" y="87" text-anchor="end" font-weight="700" fill="#ffffff">${total}</text>

    <rect x="0" y="116" width="180" height="46" rx="8" fill="#1a1330" stroke="#33234f"/>
    <text x="14" y="145" fill="#c9d1d9">Institute Rank</text>
    <text x="166" y="145" text-anchor="end" font-weight="700" fill="#ffffff">${instituteRank}</text>
  </g>

  <g transform="translate(700,100)">
    <rect x="0" y="0" width="180" height="46" rx="10" fill="url(#streakGrad)"/>
    <text x="14" y="29" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="#fff">${currentStreak} Day Streak</text>
    <rect x="0" y="58" width="180" height="70" rx="10" fill="#151b23" stroke="#21262d"/>
    <text x="14" y="80" font-family="Segoe UI, sans-serif" font-size="13" fill="#8b949e">Longest Streak</text>
    <text x="14" y="112" font-family="Segoe UI, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${maxStreak} Days</text>
    <rect x="0" y="140" width="180" height="70" rx="10" fill="#151b23" stroke="#21262d"/>
    <text x="14" y="162" font-family="Segoe UI, sans-serif" font-size="13" fill="#8b949e">Last Updated</text>
    <text x="14" y="188" font-family="Segoe UI, sans-serif" font-size="13" fill="#c9d1d9">${new Date().toISOString().slice(0, 10)}</text>
  </g>
</svg>`;

  fs.writeFileSync("gfg-profile-card.svg", svg);
  console.log("gfg-profile-card.svg written:", { total, codingScore, instituteRank, currentStreak, maxStreak });
}

main();
