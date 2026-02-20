/* ========== Constants & Mock Data ========== */
const STORAGE_NAME = 'cp-tracker-username';
const STORAGE_THEME = 'cp-tracker-theme';
const DEFAULT_THEME = 'dark';

const MOCK_PLATFORM_COUNTS = {
  codeforces: 420,
  leetcode: 380,
  codechef: 150,
  atcoder: 95
};

const MOCK_DIFFICULTY = [
  { label: 'CF 800', count: 80, color: '#4caf50' },
  { label: 'CF 900-1000', count: 120, color: '#8bc34a' },
  { label: 'CF 1100-1200', count: 95, color: '#ffc107' },
  { label: 'CF 1300+', count: 125, color: '#ff9800' },
  { label: 'LC Easy', count: 200, color: '#4caf50' },
  { label: 'LC Medium', count: 150, color: '#ff9800' },
  { label: 'LC Hard', count: 30, color: '#f44336' }
];

const MOCK_SUBMISSIONS = [
  { name: 'Watermelon', url: 'https://codeforces.com/problemset/problem/4/A', platform: 'codeforces', platformLabel: 'CF', difficulty: '800', difficultyClass: 'easy', solvedAt: '2 hours ago' },
  { name: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', platform: 'leetcode', platformLabel: 'LC', difficulty: 'Easy', difficultyClass: 'easy', solvedAt: '5 hours ago' },
  { name: 'START01', url: 'https://www.codechef.com/problems/START01', platform: 'codechef', platformLabel: 'CC', difficulty: 'Beginner', difficultyClass: 'easy', solvedAt: '1 day ago' },
  { name: 'Practice A', url: 'https://atcoder.jp/contests/abc001/tasks/abc001_1', platform: 'atcoder', platformLabel: 'AC', difficulty: 'Gray', difficultyClass: 'easy', solvedAt: '1 day ago' },
  { name: 'Longest Substring Without Repeating', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', platform: 'leetcode', platformLabel: 'LC', difficulty: 'Medium', difficultyClass: 'medium', solvedAt: '2 days ago' },
  { name: 'Array with Odd Sum', url: 'https://codeforces.com/problemset/problem/1296/A', platform: 'codeforces', platformLabel: 'CF', difficulty: '1200', difficultyClass: 'medium', solvedAt: '3 days ago' },
  { name: 'Trapping Rain Water', url: 'https://leetcode.com/problems/trapping-rain-water/', platform: 'leetcode', platformLabel: 'LC', difficulty: 'Hard', difficultyClass: 'hard', solvedAt: '4 days ago' },
  { name: 'Weird Algorithm', url: 'https://cses.fi/problemset/task/1068', platform: 'codeforces', platformLabel: 'CF', difficulty: '900', difficultyClass: 'easy', solvedAt: '5 days ago' }
];

// Generate mock heatmap: last ~365 days, random 0-4 levels
function generateHeatmapData() {
  const data = [];
  const now = new Date();
  const totalCells = 53 * 7; // 371
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (totalCells - 1 - i));
    const count = Math.random() > 0.4 ? Math.floor(Math.random() * 5) : 0;
    data.push({ date: d.toISOString().slice(0, 10), count });
  }
  return data;
}

const heatmapData = generateHeatmapData();

/* ========== First-time name modal ========== */
const nameModal = document.getElementById('name-modal');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const userNameEl = document.getElementById('user-name');

function getUserName() {
  return localStorage.getItem(STORAGE_NAME) || '';
}

function setUserName(name) {
  const trimmed = (name || '').trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_NAME, trimmed);
    userNameEl.textContent = trimmed;
    nameModal.setAttribute('aria-hidden', 'true');
  }
}

function showGreeting() {
  const name = getUserName();
  if (name) {
    userNameEl.textContent = name;
    nameModal.setAttribute('aria-hidden', 'true');
  } else {
    nameModal.setAttribute('aria-hidden', 'false');
  }
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  setUserName(nameInput.value);
});

/* ========== Theme toggle ========== */
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const streakImg = document.getElementById('streak-img');

function getStoredTheme() {
  return localStorage.getItem(STORAGE_THEME) || DEFAULT_THEME;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  themeToggle.checked = theme === 'light';
  themeLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
  const streakTheme = theme === 'light' ? 'default' : 'dark';
  streakImg.src = `https://github-readme-streak-stats.herokuapp.com/?user=LakshitOP&theme=${streakTheme}&hide_border=true&border_radius=5`;
  localStorage.setItem(STORAGE_THEME, theme);
}

themeToggle.addEventListener('change', () => {
  const next = themeToggle.checked ? 'light' : 'dark';
  applyTheme(next);
  initCharts();
});

/* ========== Load stats from data.json (optional) ========== */
let platformCounts = { ...MOCK_PLATFORM_COUNTS };

async function loadStats() {
  try {
    const res = await fetch('data.json');
    const data = await res.json();
    if (data.platforms) {
      platformCounts = data.platforms;
    }
    const lastEl = document.getElementById('last-updated');
    if (lastEl && data.last_updated) lastEl.textContent = data.last_updated;
  } catch (_) {
    document.getElementById('last-updated').textContent = 'Using demo data';
  }
  initCharts();
}

/* ========== Chart.js: Platform Donut ========== */
let donutChart = null;

function initPlatformDonut() {
  const ctx = document.getElementById('platform-donut');
  if (!ctx) return;

  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#e6edf3' : '#1f2328';
  const colors = ['#ff9800', '#ffc107', '#4caf50', '#2196f3'];

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Codeforces', 'LeetCode', 'CodeChef', 'AtCoder'],
      datasets: [{
        data: [
          platformCounts.codeforces || 0,
          platformCounts.leetcode || 0,
          platformCounts.codechef || 0,
          platformCounts.atcoder || 0
        ],
        backgroundColor: colors,
        borderColor: isDark ? '#161b22' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, padding: 12, font: { size: 11 } }
        }
      }
    }
  });
}

/* ========== Chart.js: Difficulty Bar ========== */
let barChart = null;

function initDifficultyBars() {
  const ctx = document.getElementById('difficulty-bars');
  if (!ctx) return;

  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#8b949e' : '#656d76';
  const gridColor = isDark ? 'rgba(48, 54, 61, 0.5)' : 'rgba(31, 35, 40, 0.12)';

  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MOCK_DIFFICULTY.map(d => d.label),
      datasets: [{
        label: 'Solved',
        data: MOCK_DIFFICULTY.map(d => d.count),
        backgroundColor: MOCK_DIFFICULTY.map(d => d.color),
        borderColor: MOCK_DIFFICULTY.map(d => d.color),
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 } }
        }
      }
    }
  });
}

function initCharts() {
  initPlatformDonut();
  initDifficultyBars();
}

/* ========== Heatmap ========== */
function getHeatmapLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  grid.innerHTML = '';
  heatmapData.forEach(({ date, count }) => {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('data-level', getHeatmapLevel(count));
    cell.setAttribute('title', `${date}: ${count} question(s)`);
    cell.setAttribute('role', 'img');
    cell.setAttribute('aria-label', `${date} ${count} questions`);
    grid.appendChild(cell);
  });
}

/* ========== Recent Submissions table ========== */
function renderSubmissions() {
  const tbody = document.getElementById('submissions-body');
  if (!tbody) return;
  tbody.innerHTML = MOCK_SUBMISSIONS.map(row => `
    <tr>
      <td>
        <a href="${row.url}" target="_blank" rel="noopener noreferrer" class="problem-link">${escapeHtml(row.name)}</a>
      </td>
      <td><span class="platform-badge platform-${row.platform}">${escapeHtml(row.platformLabel)}</span></td>
      <td><span class="difficulty difficulty-${row.difficultyClass}">${escapeHtml(row.difficulty)}</span></td>
      <td><span class="time-ago">${escapeHtml(row.solvedAt)}</span></td>
    </tr>
  `).join('');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ========== Init ========== */
applyTheme(getStoredTheme());
showGreeting();
loadStats();
renderHeatmap();
renderSubmissions();
