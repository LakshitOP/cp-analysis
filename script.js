const STORAGE_NAME = 'cp-tracker-username';
const STORAGE_THEME = 'cp-tracker-theme';
const DEFAULT_THEME = 'dark';
let platformCounts = { codeforces: 0, leetcode: 0, codechef: 0, atcoder: 0 };
let difficultyData = [];
let recentSubmissions = [];

const nameModal = document.getElementById('name-modal');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const userNameEl = document.getElementById('user-name');

function getUserName() { return localStorage.getItem(STORAGE_NAME) || ''; }
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
nameForm.addEventListener('submit', (e) => { e.preventDefault(); setUserName(nameInput.value); });

const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const streakImg = document.getElementById('streak-img');

function getStoredTheme() { return localStorage.getItem(STORAGE_THEME) || DEFAULT_THEME; }
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  if (themeToggle) themeToggle.checked = theme === 'light';
  if (themeLabel) themeLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
  const streakTheme = theme === 'light' ? 'default' : 'dark';
  if (streakImg) streakImg.src = `https://github-readme-streak-stats.herokuapp.com/?user=LakshitOP&theme=${streakTheme}&hide_border=true&border_radius=5`;
  localStorage.setItem(STORAGE_THEME, theme);
}
if (themeToggle) {
  themeToggle.addEventListener('change', () => {
    applyTheme(themeToggle.checked ? 'light' : 'dark');
    initCharts();
  });
}

async function loadStats() {
  try {
    const res = await fetch('data.json');
    const data = await res.json();
    if (data.platforms) platformCounts = data.platforms;
    if (data.difficulty_chart) difficultyData = data.difficulty_chart;
    if (data.recent_submissions) recentSubmissions = data.recent_submissions;
    const lastEl = document.getElementById('last-updated');
    if (lastEl && data.last_updated) lastEl.textContent = data.last_updated;
  } catch (error) {
    console.error("Error loading JSON. Did you run the Python scraper?", error);
  }
  initCharts();
  renderSubmissions();
  renderHeatmap();
}

let donutChart = null;
function initPlatformDonut() {
  const ctx = document.getElementById('platform-donut');
  if (!ctx) return;
  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#e6edf3' : '#1f2328';
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Codeforces', 'LeetCode', 'CodeChef', 'AtCoder'],
      datasets: [{
        data: [platformCounts.codeforces, platformCounts.leetcode, platformCounts.codechef, platformCounts.atcoder],
        backgroundColor: ['#445f9d', '#ffa116', '#5B4638', '#222222'],
        borderColor: isDark ? '#161b22' : '#ffffff',
        borderWidth: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
  });
}

let barChart = null;
function initDifficultyBars() {
  const ctx = document.getElementById('difficulty-bars');
  if (!ctx || difficultyData.length === 0) return;
  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#8b949e' : '#656d76';
  const gridColor = isDark ? 'rgba(48, 54, 61, 0.5)' : 'rgba(31, 35, 40, 0.12)';
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: difficultyData.map(d => d.label),
      datasets: [{
        label: 'Solved',
        data: difficultyData.map(d => d.count),
        backgroundColor: difficultyData.map(d => d.color),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { display: false }, ticks: { color: textColor } } }
    }
  });
}

function initCharts() { initPlatformDonut(); initDifficultyBars(); }

function renderSubmissions() {
  const tbody = document.getElementById('submissions-body');
  if (!tbody) return;
  if (recentSubmissions.length === 0) {
    tbody.innerHTML = 'Run the Python script to fetch recent submissions!';
    return;
  }
  tbody.innerHTML = recentSubmissions.map(row => `<tr> <td><a href="${row.url}" target="_blank" class="problem-link">${escapeHtml(row.name)}</a></td> <td><span class="platform-badge platform-${row.platform}">${escapeHtml(row.platformLabel)}</span></td> <td><span class="difficulty difficulty-${row.difficultyClass}">${escapeHtml(row.difficulty)}</span></td> <td><span class="time-ago">${escapeHtml(row.solvedAt)}</span></td> </tr>`).join('');
}

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 371; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    const count = Math.random() > 0.4 ? Math.floor(Math.random() * 5) : 0;
    cell.setAttribute('data-level', count === 0 ? 0 : (count <= 2 ? 1 : (count <= 4 ? 2 : 3)));
    grid.appendChild(cell);
  }
}

applyTheme(getStoredTheme());
showGreeting();
loadStats();
