const fs = require("fs");
const fetch = require("node-fetch");

const USERNAME = "mohitjangid21797-crypto";
const TOKEN = process.env.GITHUB_TOKEN;

async function getContributions() {
  const query = `
    query {
      user(login: "${USERNAME}") {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  return data.data.user.contributionsCollection.contributionCalendar.weeks;
}

function generateSVG(weeks) {
  // Take last 16 weeks for a clean bar chart
  const recentWeeks = weeks.slice(-16);
  const max = Math.max(...recentWeeks.map(w => 
    w.contributionDays.reduce((s, d) => s + d.contributionCount, 0)
  ), 1);

  const barWidth = 28;
  const gap = 12;
  const height = 160;
  const width = recentWeeks.length * (barWidth + gap) + 40;

  let bars = "";
  recentWeeks.forEach((week, i) => {
    const total = week.contributionDays.reduce((s, d) => s + d.contributionCount, 0);
    const h = Math.round((total / max) * (height - 30));
    const x = 30 + i * (barWidth + gap);
    const y = height - h - 10;
    const delay = (i * 0.18).toFixed(2);

    bars += `
      <rect x="${x}" y="${height - 10}" width="${barWidth}" height="0" rx="4"
            fill="#39d353">
        <animate attributeName="height" from="0" to="${h}" dur="0.8s" begin="${delay}s" fill="freeze"/>
        <animate attributeName="y" from="${height - 10}" to="${y}" dur="0.8s" begin="${delay}s" fill="freeze"/>
      </rect>
    `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height + 30}" viewBox="0 0 ${width} ${height + 30}"
     xmlns="http://www.w3.org/2000/svg" style="background:#0d1117">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  </style>
  <text x="20" y="24" fill="#8b949e" font-size="14">Weekly Contributions (Animated)</text>
  ${bars}
</svg>`;
}

(async () => {
  const weeks = await getContributions();
  const svg = generateSVG(weeks);

  if (!fs.existsSync("output")) fs.mkdirSync("output");
  fs.writeFileSync("output/contribution-bar-chart.svg", svg);
  console.log("Generated output/contribution-bar-chart.svg");
})();
