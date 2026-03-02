const STORAGE_NAME = 'cp-tracker-username';
const STORAGE_THEME = 'cp-tracker-theme';
const STORAGE_CF_HANDLE = 'cp-tracker-cf-handle';
const STORAGE_LC_HANDLE = 'cp-tracker-lc-handle';
const STORAGE_AC_HANDLE = 'cp-tracker-ac-handle';
const STORAGE_CC_HANDLE = 'cp-tracker-cc-handle';
const STORAGE_SETUP_DONE = 'cp-tracker-setup-done';
const DEFAULT_THEME = 'dark';
let platformCounts = { codeforces: 0, leetcode: 0, codechef: 0, atcoder: 0 };
let difficultyData = [];
let recentSubmissions = [];
let tagCounts = {};

const nameModal = document.getElementById('name-modal');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const cfHandleInput = document.getElementById('cf-handle-input');
const lcHandleInput = document.getElementById('lc-handle-input');
const acHandleInput = document.getElementById('ac-handle-input');
const ccHandleInput = document.getElementById('cc-handle-input');
const modalCloseBtn = document.getElementById('modal-close-btn');
const userNameEl = document.getElementById('user-name');

import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://ssqujoxmtkbnjwsdfmpb.supabase.co",
  "sb_publishable_Lar1r6YYzsuV07RLXJmJwA_gdRghveL",
  {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
      },
    }
  );

(async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Session restore failed:", error);
  } else if (data.session) {
    currentUser = data.session.user;
    setAuthActionsVisible(true);
    setAuthStage("profile");
    await syncProfileFromSupabase(currentUser);
    setModalOpen(false);
  }
})();

function getUserName() {
  return localStorage.getItem(STORAGE_NAME) || '';
}

// ADD HERE
const authView = document.getElementById('auth-view');
const profileView = document.getElementById('profile-view');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const passwordLabel = document.querySelector('label[for="password-input"]');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authMethodSelect = document.getElementById('auth-method');
const switchAuthModeLink = document.getElementById('switch-auth-mode');
const resendConfirmBtn = document.getElementById('resend-confirm-btn');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authStatus = document.getElementById('auth-status');
const editHandlesBtn = document.getElementById('edit-handles-btn');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let authMethod = 'password'; // 'password' or 'magic'

function getStoredProfile() {
  return {
    name: localStorage.getItem(STORAGE_NAME) || '',
    cf: localStorage.getItem(STORAGE_CF_HANDLE) || '',
    lc: localStorage.getItem(STORAGE_LC_HANDLE) || '',
    cc: localStorage.getItem(STORAGE_CC_HANDLE) || '',
    ac: localStorage.getItem(STORAGE_AC_HANDLE) || ''
  };
}

function prefillProfileFields(profile = getStoredProfile()) {
  if (nameInput) nameInput.value = profile.name || '';
  if (cfHandleInput) cfHandleInput.value = profile.cf || '';
  if (lcHandleInput) lcHandleInput.value = profile.lc || '';
  if (ccHandleInput) ccHandleInput.value = profile.cc || '';
  if (acHandleInput) acHandleInput.value = profile.ac || '';
}

function setModalOpen(isOpen) {
  if (!nameModal) return;
  nameModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

// ADD HERE
function setAuthStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message || '';
  authStatus.style.color = isError ? 'var(--danger)' : 'var(--text-secondary)';
}

// magic-link helper removed; using email/password flows now.
// email+password sign-up / sign-in does not require a popup or redirect.

function setAuthStage(stage) {
  if (authView) authView.hidden = stage !== 'auth';
  if (profileView) profileView.hidden = stage !== 'profile';
  if (modalCloseBtn) modalCloseBtn.hidden = stage === 'auth';
}

function setAuthActionsVisible(isLoggedIn) {
  if (editHandlesBtn) editHandlesBtn.hidden = !isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
}

function setUserProfile({ name, cfHandle, lcHandle, acHandle, ccHandle, ghHandle }) {
  const trimmedName = (name || '').trim();
  if (trimmedName) {
    localStorage.setItem(STORAGE_NAME, trimmedName);
    if (userNameEl) userNameEl.textContent = trimmedName;
  }

  if (cfHandle !== undefined) {
    const trimmed = cfHandle.trim();
    if (trimmed) localStorage.setItem(STORAGE_CF_HANDLE, trimmed);
  }
  if (lcHandle !== undefined) {
    const trimmed = lcHandle.trim();
    if (trimmed) localStorage.setItem(STORAGE_LC_HANDLE, trimmed);
  }
  if (acHandle !== undefined) {
    const trimmed = acHandle.trim();
    if (trimmed) localStorage.setItem(STORAGE_AC_HANDLE, trimmed);
  }
  if (ccHandle !== undefined) {
    const trimmed = ccHandle.trim();
    if (trimmed) localStorage.setItem(STORAGE_CC_HANDLE, trimmed);
  }
  if (ghHandle !== undefined) {
    const trimmed = ghHandle.trim();
    if (trimmed) localStorage.setItem(STORAGE_GH_HANDLE, trimmed);
  }

  localStorage.setItem(STORAGE_SETUP_DONE, 'true');
  showGreeting();
  // removed github streak call
  setModalOpen(false);
}

function showGreeting() {
  const { name } = getStoredProfile();
  if (userNameEl) userNameEl.textContent = currentUser ? (name || 'Guest') : 'Guest';
}

function openHandlesModal() {
  if (!currentUser) return;
  setAuthStage('profile');
  prefillProfileFields();
  setModalOpen(true);
}

function closeHandlesModal() {
  if (!currentUser) return;
  setModalOpen(false);
}

// MODIFY HERE
async function getCurrentProfileRow(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("Profiles")
    .select("user_id, name, codeforces, leetcode, codechef, atcoder, github")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertProfile(profile) {
  const { error } = await supabase.from("Profiles").upsert(profile);
  if (error) throw error;
}

async function syncProfileFromSupabase(user) {
  if (!user?.id) return;
  try {
    const row = await getCurrentProfileRow(user.id);
    if (!row) return;

    setUserProfile({
      name: row.name || '',
      cfHandle: row.codeforces || '',
      lcHandle: row.leetcode || '',
      ccHandle: row.codechef || '',
      acHandle: row.atcoder || '',
      // github field removed
    });

    prefillProfileFields({
      name: row.name || '',
      cf: row.codeforces || '',
      lc: row.leetcode || '',
      cc: row.codechef || '',
      ac: row.atcoder || '',
      });
  } catch (error) {
    console.error("Failed to load profile from Supabase", error);
  }
}

// ADD HERE
async function restoreSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Session restore failed:", error);
    setAuthStage("auth");
    setModalOpen(true);
    return;
  }

  if (data?.session?.user) {
    currentUser = data.session.user;
    setAuthActionsVisible(true);
    setAuthStage("profile");
    await syncProfileFromSupabase(currentUser);
    setModalOpen(false);
  } else {
    setAuthStage("auth");
    setModalOpen(true);
  }
}

// authentication mode can be 'signin' or 'signup'
let authMode = 'signin';

function updateAuthUI() {
  if (!authTitle || !authSubtitle || !authSubmitBtn || !switchAuthModeLink) return;
  // Title and mode text
  if (authMode === 'signin') {
    authTitle.textContent = 'Sign in';
    switchAuthModeLink.textContent = "Don't have an account? Sign up";
  } else {
    authTitle.textContent = 'Sign up';
    switchAuthModeLink.textContent = 'Already have an account? Sign in';
  }

  // Method-specific UI
  if (authMethod === 'magic') {
    if (authSubtitle) authSubtitle.textContent = authMode === 'signup' ? 'Create account via email link.' : 'Sign in with a magic link sent to your email.';
    if (passwordLabel) passwordLabel.hidden = true;
    if (passwordInput) {
      passwordInput.hidden = true;
      passwordInput.value = ''; // clear any existing password
    }
    if (authSubmitBtn) authSubmitBtn.textContent = authMode === 'signup' ? 'Send sign-up link' : 'Send sign-in link';
  } else {
    if (authSubtitle) authSubtitle.textContent = authMode === 'signup' ? 'Create your account.' : 'Enter your credentials.';
    if (passwordLabel) passwordLabel.hidden = false;
    if (passwordInput) passwordInput.hidden = false;
    if (authSubmitBtn) authSubmitBtn.textContent = authMode === 'signup' ? 'Sign up' : 'Sign in';
  }
}

async function showVerificationNotice() {
  if (!authTitle || !authSubtitle || !authForm || !switchAuthModeLink) return;
  authTitle.textContent = 'Verify your email';
  authSubtitle.textContent = 'A confirmation email has been sent. Please check your inbox.';
  // disable all input elements and hide mode toggle while waiting for verification
  Array.from(authForm.elements).forEach(el => el.disabled = true);
  switchAuthModeLink.hidden = true;
  if (resendConfirmBtn) {
    resendConfirmBtn.hidden = false;
    resendConfirmBtn.disabled = false;
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = (emailInput?.value || '').trim();
  const password = (passwordInput?.value || '');
  if (!email) {
    setAuthStatus('Please enter your email.', true);
    return;
  }
  if (authMethod === 'password' && !password) {
    setAuthStatus('Please enter your password.', true);
    return;
  }

  authSubmitBtn.disabled = true;
  if (authForm) authForm.classList.add('loading');
  
  try {
    if (authMethod === 'magic') {
      // send magic link (no popup)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
      });
      if (error) throw error;
      setAuthStatus('');
      await showVerificationNotice();
      return;
    }

    // password flow
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setAuthStatus('');
      await showVerificationNotice();
      return;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthStatus('');
    }
  } catch (error) {
    console.error('Authentication error', error);
    setAuthStatus(error.message || 'Authentication failed.', true);
  } finally {
    authSubmitBtn.disabled = false;
    if (authForm) authForm.classList.remove('loading');
  }
}

if (authForm) {
  authForm.addEventListener('submit', handleAuthSubmit);
}

if (switchAuthModeLink) {
  switchAuthModeLink.addEventListener('click', (e) => {
    e.preventDefault();
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    updateAuthUI();
    setAuthStatus('');
    // restore inputs in case they were disabled by verification notice
    if (authForm) {
      Array.from(authForm.elements).forEach(el => el.disabled = false);
    }
    switchAuthModeLink.hidden = false;
    if (resendConfirmBtn) {
      resendConfirmBtn.hidden = true;
    }
  });
}

updateAuthUI();

// method selector listener (password <-> magic)
// method selector listener (password <-> magic)
if (authMethodSelect) {
  authMethodSelect.addEventListener('change', () => {
    authMethod = authMethodSelect.value === 'magic' ? 'magic' : 'password';

    // Hide password label and input separately
    if (passwordLabel) {
      passwordLabel.hidden = authMethod === 'magic';
    }
    if (passwordInput) {
      passwordInput.hidden = authMethod === 'magic';
      passwordInput.required = authMethod !== 'magic';
      if (authMethod === 'magic') passwordInput.value = '';
    }

    if (resendConfirmBtn) resendConfirmBtn.hidden = true;

    updateAuthUI();
  });
}

// setup resend confirmation handler
if (resendConfirmBtn) {
  resendConfirmBtn.addEventListener('click', async () => {
    const email = (emailInput?.value || '').trim();
    if (!email) {
      setAuthStatus('Enter your email to resend confirmation.', true);
      return;
    }
    resendConfirmBtn.disabled = true;
    try {
      if (authMethod === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
        });
        if (error) throw error;
        setAuthStatus('Magic link resent. Check your inbox.');
      } else {
        // try to resend confirmation for password signups (may depend on Supabase settings)
        const { error } = await supabase.auth.resend ? await supabase.auth.resend({ email }) : { error: null };
        if (error) throw error;
        setAuthStatus('Confirmation email resent.');
      }
    } catch (err) {
      console.error('Resend error', err);
      setAuthStatus(err.message || 'Unable to resend confirmation.', true);
    } finally {
      resendConfirmBtn.disabled = false;
    }
  });
}

// attempt to restore session on startup; opens auth modal when no session
restoreSession();

if (nameForm) {
  nameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      setAuthStage('auth');
      setAuthStatus('Sign in first to save profile.', true);
      setModalOpen(true);
      return;
    }
if (window.location.hash.includes("access_token")) {
  history.replaceState({}, document.title, window.location.pathname);
}
    // MODIFY HERE
    const profile = {
      user_id: currentUser.id,
      name: nameInput.value.trim(),
      codeforces: cfHandleInput.value.trim(),
      leetcode: lcHandleInput.value.trim(),
      codechef: ccHandleInput.value.trim(),
      atcoder: acHandleInput.value.trim(),
      // github removed
    };

    try {
      await upsertProfile(profile);
      setUserProfile({
        name: profile.name,
        cfHandle: profile.codeforces,
        lcHandle: profile.leetcode,
        ccHandle: profile.codechef,
        acHandle: profile.atcoder,
      });
      setAuthStatus('');
      setAuthStage('profile');
    } catch (error) {
      console.error("Failed to save profile to Supabase", error);
      setAuthStatus(error.message || 'Failed to save profile.', true);
      setModalOpen(true);
    }
  });
}

if (editHandlesBtn) editHandlesBtn.addEventListener('click', openHandlesModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeHandlesModal);
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      currentUser = null;
      if (authForm) authForm.reset();
      setAuthActionsVisible(false);
      setAuthStage('auth');
      setAuthStatus('');
      setModalOpen(true);
      showGreeting();
    }
  });
}


supabase.auth.onAuthStateChange((event, session) => {
  (async () => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      setAuthActionsVisible(true);
      setAuthStage('profile');
      await syncProfileFromSupabase(currentUser);
      setModalOpen(false);
      setAuthStatus('');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (event === 'SIGNED_OUT') {
      currentUser = null;
      setAuthActionsVisible(false);
      setAuthStage('auth');
      setModalOpen(true);
      showGreeting();
    }
  })().catch((error) => {
    console.error("Failed handling auth state change", error);
  });
});

const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const streakImg = document.getElementById('streak-img');

function getStoredTheme() { return localStorage.getItem(STORAGE_THEME) || DEFAULT_THEME; }
// GitHub streak widget removed; no longer used.
function applyTheme(theme) {
  // Add transition class for smooth theme change
  document.documentElement.classList.add('theme-transitioning');
  
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  if (themeToggle) themeToggle.checked = theme === 'light';
  if (themeLabel) themeLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
  localStorage.setItem(STORAGE_THEME, theme);
  
  // Remove transition class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 300);
}
if (themeToggle) {
  themeToggle.addEventListener('change', () => {
    applyTheme(themeToggle.checked ? 'light' : 'dark');
    // Debounce chart updates to avoid multiple rapid theme changes
    clearTimeout(window.chartUpdateTimeout);
    window.chartUpdateTimeout = setTimeout(() => {
      initCharts();
      initDifficultyTrend();
    }, 100);
  });
}

async function loadStats() {
  try {
    const { cf, lc, cc, ac } = getStoredProfile();
    const statsUrl = `/.netlify/functions/stats?cf=${encodeURIComponent(cf)}&lc=${encodeURIComponent(lc)}&cc=${encodeURIComponent(cc)}&ac=${encodeURIComponent(ac)}`;
    let res = await fetch(statsUrl);
    if (!res.ok) {
      res = await fetch('data.json');
    }
    const data = await res.json();
    if (data.platforms) {
      platformCounts = {
        codeforces: data.platforms.codeforces || 0,
        leetcode: data.platforms.leetcode || 0,
        codechef: data.platforms.codechef || 0,
        atcoder: data.platforms.atcoder || 0
      };
    }
    if (data.difficulty_chart) {
      // Filter to only Codeforces and LeetCode difficulty data
      difficultyData = data.difficulty_chart.filter(d => 
        d.label.startsWith('CF ') || d.label.startsWith('LC ')
      );
    }
    if (data.recent_submissions) {
      // Filter to only Codeforces and LeetCode submissions
      recentSubmissions = data.recent_submissions.filter(s => 
        s.platform === 'codeforces' || s.platform === 'leetcode'
      );
      // Clear caches when data changes
      filteredSubmissionsCache = null;
      filteredSubmissionsCacheKey = null;
      heatmapDataCache = null;
      heatmapDataCacheKey = null;
      streakCache = null;
      streakCacheKey = null;
      difficultyTrendCache = null;
      difficultyTrendCacheKey = null;
    }
    if (data.tag_counts) {
      tagCounts = data.tag_counts;
    }
    const lastEl = document.getElementById('last-updated');
    if (lastEl && data.last_updated) lastEl.textContent = data.last_updated;
  } catch (error) {
    console.error("Error loading JSON. Did you run the Python scraper?", error);
  }
  initCharts();
  renderSubmissions();
  renderHeatmap();
  initDifficultyTrend();
  renderStreaks();
  renderTagAnalysis();
}

let donutChart = null;
let donutChartTheme = null;
let donutChartData = null;

const PLATFORM_LABELS = ['Codeforces', 'LeetCode', 'CodeChef', 'AtCoder'];
const PLATFORM_COLORS = ['#445f9d', '#ffa116', '#5c4033', '#2d2d2d'];

function initPlatformDonut() {
  const ctx = document.getElementById('platform-donut');
  if (!ctx) return;
  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#e6edf3' : '#1f2328';
  const currentData = [
    platformCounts.codeforces,
    platformCounts.leetcode,
    platformCounts.codechef,
    platformCounts.atcoder
  ];
  const activeIndices = [0, 1, 2, 3].filter(i => currentData[i] > 0);
  const labels = activeIndices.length ? activeIndices.map(i => PLATFORM_LABELS[i]) : PLATFORM_LABELS;
  const data = activeIndices.length ? activeIndices.map(i => currentData[i]) : currentData;
  const bgColors = activeIndices.length ? activeIndices.map(i => PLATFORM_COLORS[i]) : PLATFORM_COLORS;

  const dataChanged = !donutChartData || JSON.stringify(donutChartData) !== JSON.stringify(currentData);
  const themeChanged = donutChartTheme !== isDark;

  if (!donutChart || dataChanged || themeChanged) {
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderColor: isDark ? '#21262d' : '#ffffff',
          borderWidth: 2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
    });
    donutChartTheme = isDark;
    donutChartData = [...currentData];
  } else {
    donutChart.data.labels = labels;
    donutChart.data.datasets[0].data = data;
    donutChart.data.datasets[0].backgroundColor = bgColors;
    donutChart.update('none');
  }
}

let barChart = null;
let barChartTheme = null;
let barChartData = null;

let trendChart = null;
let trendChartTheme = null;
let trendChartData = null;

function initDifficultyBars() {
  const ctx = document.getElementById('difficulty-bars');
  if (!ctx || difficultyData.length === 0) return;
  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#8b949e' : '#656d76';
  const gridColor = isDark ? 'rgba(48, 54, 61, 0.6)' : 'rgba(31, 35, 40, 0.15)';
  
  // Filter difficulty data to only Codeforces and LeetCode
  const filteredData = difficultyData.filter(d => 
    d.label.startsWith('CF ') || d.label.startsWith('LC ')
  );
  
  const currentData = filteredData.map(d => d.count);
  const dataChanged = !barChartData || 
    JSON.stringify(barChartData) !== JSON.stringify(currentData);
  const themeChanged = barChartTheme !== isDark;
  
  if (!barChart || dataChanged || themeChanged) {
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filteredData.map(d => d.label),
        datasets: [{
          label: 'Solved',
          data: currentData,
          backgroundColor: filteredData.map(d => d.color),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { display: false }, ticks: { color: textColor } } }
      }
    });
    barChartTheme = isDark;
    barChartData = [...currentData];
  } else {
    barChart.data.labels = filteredData.map(d => d.label);
    barChart.data.datasets[0].data = currentData;
    barChart.data.datasets[0].backgroundColor = filteredData.map(d => d.color);
    barChart.update('none');
  }
}

// Helper to convert difficulty to numeric score
function getDifficultyScore(submission) {
  if (submission.platform === 'codeforces') {
    const rating = parseInt(submission.difficulty);
    if (isNaN(rating)) return null;
    // Map Codeforces rating to score (800-3500 range)
    return rating;
  } else if (submission.platform === 'leetcode') {
    // Map LeetCode difficulty to score: Easy=1, Medium=2, Hard=3
    const diff = submission.difficulty.toLowerCase();
    if (diff.includes('easy')) return 1;
    if (diff.includes('medium')) return 2;
    if (diff.includes('hard')) return 3;
    // Try to parse numeric difficulty if available
    const num = parseInt(submission.difficulty);
    if (!isNaN(num)) return num;
    return null;
  }
  return null;
}

// Calculate moving average
function movingAverage(data, windowSize = 3) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const slice = data.slice(start, end);
    const sum = slice.reduce((acc, val) => acc + (val || 0), 0);
    result.push(slice.length > 0 ? sum / slice.length : null);
  }
  return result;
}

function calculateDifficultyTrend() {
  // Use memoized filtered submissions
  const filteredSubmissions = getFilteredSubmissions();
  
  const cacheKey = filteredSubmissionsCacheKey;
  
  if (difficultyTrendCache && difficultyTrendCacheKey === cacheKey) {
    return difficultyTrendCache;
  }

  if (filteredSubmissions.length === 0) {
    const emptyResult = { labels: [], values: [], smoothed: [] };
    difficultyTrendCache = emptyResult;
    difficultyTrendCacheKey = cacheKey;
    return emptyResult;
  }

  // Group submissions by week (7-day buckets)
  const weeklyBuckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  filteredSubmissions.forEach(sub => {
    const date = parseToLocalDate(sub.solvedAt);
    if (!date) return;
    
    const score = getDifficultyScore(sub);
    if (score === null) return;

    // Calculate week bucket (weeks ago from today)
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    const weekBucket = Math.floor(daysDiff / 7);
    
    if (!weeklyBuckets.has(weekBucket)) {
      weeklyBuckets.set(weekBucket, []);
    }
    weeklyBuckets.get(weekBucket).push(score);
  });

  // Convert to sorted array (oldest to newest)
  const sortedBuckets = Array.from(weeklyBuckets.entries())
    .sort((a, b) => b[0] - a[0]) // Sort by week bucket (newest first, then reverse)
    .reverse(); // Reverse to get oldest first

  const labels = [];
  const values = [];

  // Generate labels and average difficulty per week
  sortedBuckets.forEach(([weekBucket, scores]) => {
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - (weekBucket + 1) * 7);
    const weekEndDate = new Date(today);
    weekEndDate.setDate(today.getDate() - weekBucket * 7);
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const label = `${formatLocalDate(weekStartDate)}`;
    
    labels.push(label);
    values.push(avgScore);
  });

  // Apply moving average smoothing
  const smoothed = movingAverage(values, 3);

  const result = { labels, values, smoothed };
  difficultyTrendCache = result;
  difficultyTrendCacheKey = cacheKey;
  return result;
}

function initDifficultyTrend() {
  const ctx = document.getElementById('difficulty-trend');
  if (!ctx) return;
  
  const trendData = calculateDifficultyTrend();
  if (trendData.labels.length === 0) return;

  const isDark = getStoredTheme() !== 'light';
  const textColor = isDark ? '#8b949e' : '#656d76';
  const gridColor = isDark ? 'rgba(48, 54, 61, 0.5)' : 'rgba(31, 35, 40, 0.12)';
  const accentColor = isDark ? '#58a6ff' : '#0969da';
  const successColor = isDark ? '#3fb950' : '#1a7f37';

  const currentData = {
    labels: trendData.labels,
    values: trendData.values,
    smoothed: trendData.smoothed
  };

  const dataChanged = !trendChartData || 
    JSON.stringify(trendChartData) !== JSON.stringify(currentData);
  const themeChanged = trendChartTheme !== isDark;

  if (!trendChart || dataChanged || themeChanged) {
    if (trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trendData.labels,
        datasets: [
          {
            label: 'Average Difficulty',
            data: trendData.values,
            borderColor: accentColor,
            backgroundColor: isDark ? 'rgba(88, 166, 255, 0.1)' : 'rgba(9, 105, 218, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: accentColor,
            pointBorderColor: isDark ? '#161b22' : '#ffffff',
            pointBorderWidth: 2,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Smoothed Trend',
            data: trendData.smoothed,
            borderColor: successColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderDash: [5, 5],
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#161b22' : '#ffffff',
            titleColor: isDark ? '#e6edf3' : '#1f2328',
            bodyColor: isDark ? '#8b949e' : '#656d76',
            borderColor: isDark ? 'rgba(48, 54, 61, 0.6)' : 'rgba(31, 35, 40, 0.15)',
            borderWidth: 1,
            padding: 12,
            backdropFilter: 'blur(8px)',
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                if (context.datasetIndex === 0) {
                  // Raw average
                  return `Avg: ${value.toFixed(1)}`;
                } else {
                  // Smoothed
                  return `Trend: ${value ? value.toFixed(1) : 'N/A'}`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              display: false
            },
            ticks: {
              color: textColor,
              maxRotation: 45,
              minRotation: 45,
              maxTicksLimit: 12
            }
          },
          y: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              callback: function(value) {
                // Format y-axis labels based on value range
                if (value < 10) {
                  return value.toFixed(0);
                }
                return value.toFixed(0);
              }
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
    
    trendChartTheme = isDark;
    trendChartData = JSON.parse(JSON.stringify(currentData));
  } else {
    trendChart.data.labels = trendData.labels;
    trendChart.data.datasets[0].data = trendData.values;
    trendChart.data.datasets[1].data = trendData.smoothed;
    trendChart.update('none');
  }
}

function initCharts() { 
  initPlatformDonut(); 
  initDifficultyBars(); 
  initDifficultyTrend();
}

// Memoize submissions rendering
let lastSubmissionsKey = null;

function renderSubmissions() {
  const tbody = document.getElementById('submissions-body');
  if (!tbody) return;
  
  // Filter to only Codeforces and LeetCode
  const filtered = recentSubmissions.filter(row => 
    row.platform === 'codeforces' || row.platform === 'leetcode'
  );
  
  // Check if data changed
  const currentKey = JSON.stringify(filtered.map(s => ({ 
    name: s.name, 
    platform: s.platform, 
    difficulty: s.difficulty 
  })));
  
  if (lastSubmissionsKey === currentKey && tbody.children.length > 0) {
    return; // Skip re-render if data hasn't changed
  }
  
  lastSubmissionsKey = currentKey;
  
  if (filtered.length === 0) {
    tbody.innerHTML = recentSubmissions.length === 0 
      ? 'Run the Python script to fetch recent submissions!'
      : 'No submissions from Codeforces or LeetCode found.';
    return;
  }
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  filtered.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a href="${escapeHtml(row.url)}" target="_blank" class="problem-link">${escapeHtml(row.name)}</a></td>
      <td><span class="platform-badge platform-${row.platform}">${escapeHtml(row.platformLabel)}</span></td>
      <td><span class="difficulty difficulty-${row.difficultyClass}">${escapeHtml(row.difficulty)}</span></td>
      <td><span class="time-ago">${escapeHtml(row.solvedAt)}</span></td>
    `;
    fragment.appendChild(tr);
  });
  
  tbody.innerHTML = '';
  tbody.appendChild(fragment);
}

function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

// Memoized heatmap data calculation
let heatmapDataCache = null;
let heatmapDataCacheKey = null;

// Memoized streak calculations
let streakCache = null;
let streakCacheKey = null;

// Memoized difficulty trend
let difficultyTrendCache = null;
let difficultyTrendCacheKey = null;

// Pre-filtered submissions cache
let filteredSubmissionsCache = null;
let filteredSubmissionsCacheKey = null;

// Helper to get filtered submissions (memoized)
function getFilteredSubmissions() {
  const cacheKey = JSON.stringify(recentSubmissions.map(s => ({ 
    platform: s.platform, 
    solvedAt: s.solvedAt 
  })));
  
  if (filteredSubmissionsCache && filteredSubmissionsCacheKey === cacheKey) {
    return filteredSubmissionsCache;
  }
  
  filteredSubmissionsCache = recentSubmissions.filter(s => 
    s.platform === 'codeforces' || s.platform === 'leetcode'
  );
  filteredSubmissionsCacheKey = cacheKey;
  return filteredSubmissionsCache;
}

// Helper to format date as YYYY-MM-DD in local timezone (consistent)
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse date string and normalize to local date (handles timezone issues)
const parseToLocalDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Try parsing as ISO string first (e.g., "2026-02-20T10:54:16")
  let date = new Date(dateStr);
  
  // If that fails, try parsing as common formats
  if (isNaN(date.getTime())) {
    // Try "Jan 15, 2026" format
    date = new Date(dateStr);
  }
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Normalize to local date (set to midnight local time)
  // This ensures we don't get off-by-one errors due to timezone conversion
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return localDate;
};

function calculateHeatmapData() {
  // Use memoized filtered submissions
  const filteredSubmissions = getFilteredSubmissions();
  
  const cacheKey = filteredSubmissionsCacheKey;
  
  if (heatmapDataCache && heatmapDataCacheKey === cacheKey) {
    return heatmapDataCache;
  }

  // Create a map of date -> { total, codeforces, leetcode } (using local timezone consistently)
  const activityMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Process submissions with platform breakdown
  filteredSubmissions.forEach(sub => {
    const date = parseToLocalDate(sub.solvedAt);
    if (date) {
      const dateStr = formatLocalDate(date);
      const existing = activityMap.get(dateStr) || { total: 0, codeforces: 0, leetcode: 0 };
      existing.total += 1;
      if (sub.platform === 'codeforces') {
        existing.codeforces += 1;
      } else if (sub.platform === 'leetcode') {
        existing.leetcode += 1;
      }
      activityMap.set(dateStr, existing);
    }
  });

  // Generate a rolling 52-week window (364 days)
  const days = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 363); // 364 days total (0-363 inclusive)
  startDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 364; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatLocalDate(currentDate);
    const activity = activityMap.get(dateStr) || { total: 0, codeforces: 0, leetcode: 0 };
    const count = activity.total;
    
    // Map count to level (0-4)
    let level = 0;
    if (count > 0) {
      if (count === 1) level = 1;
      else if (count <= 3) level = 2;
      else if (count <= 5) level = 3;
      else level = 4;
    }
    
    days.push({
      date: dateStr,
      count,
      level,
      codeforces: activity.codeforces,
      leetcode: activity.leetcode
    });
  }

  heatmapDataCache = days;
  heatmapDataCacheKey = cacheKey;
  return days;
}

function calculateStreaks() {
  const heatmapData = calculateHeatmapData();
  const cacheKey = heatmapDataCacheKey;
  
  if (streakCache && streakCacheKey === cacheKey) {
    return streakCache;
  }
  
  // Calculate current streak (consecutive days from today backwards)
  let currentStreak = 0;
  for (let i = heatmapData.length - 1; i >= 0; i--) {
    if (heatmapData[i].count > 0) {
      currentStreak++;
    } else {
      // If today has no activity, don't count it
      if (i === heatmapData.length - 1) {
        currentStreak = 0;
      }
      break;
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < heatmapData.length; i++) {
    if (heatmapData[i].count > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }
  
  // Calculate active days in last 30 days
  const last30Days = heatmapData.slice(-30);
  const activeDays = last30Days.filter(day => day.count > 0).length;
  
  const result = {
    currentStreak,
    longestStreak,
    activeDays
  };
  
  streakCache = result;
  streakCacheKey = cacheKey;
  return result;
}

function renderStreaks() {
  const streaks = calculateStreaks();
  
  // Animate count-up for streak values
  const animateCountUp = (elementId, targetValue, duration = 1000) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
      
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = targetValue;
      }
    };
    
    requestAnimationFrame(animate);
  };
  
  animateCountUp('current-streak', streaks.currentStreak);
  animateCountUp('longest-streak', streaks.longestStreak);
  animateCountUp('active-days', streaks.activeDays);
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  const monthsEl = document.getElementById('heatmap-months');
  if (!grid) return;
  
  const heatmapData = calculateHeatmapData();

  // Build a 52-week window (columns) out of the 364 days
  const DAYS_PER_WEEK = 7;
  const NUM_WEEKS = 52;
  const totalNeeded = DAYS_PER_WEEK * NUM_WEEKS;
  const sliceStart = Math.max(0, heatmapData.length - totalNeeded);
  const windowDays = heatmapData.slice(sliceStart);

  const weeks = [];
  for (let i = 0; i < NUM_WEEKS; i++) {
    weeks.push(new Array(DAYS_PER_WEEK).fill(null));
  }
  windowDays.forEach((day, idx) => {
    const weekIndex = Math.floor(idx / DAYS_PER_WEEK);
    const dayIndex = idx % DAYS_PER_WEEK;
    if (weekIndex < NUM_WEEKS) {
      weeks[weekIndex][dayIndex] = day;
    }
  });

  // Only re-render if data actually changed
  const currentDataKey = JSON.stringify(windowDays.map(d => `${d.date}-${d.level}`));
  if (grid.dataset.renderedKey === currentDataKey) {
    return; // Skip re-render if data hasn't changed
  }
  
  grid.innerHTML = '';
  grid.dataset.renderedKey = currentDataKey;

  // Use DocumentFragments for performance
  const fragment = document.createDocumentFragment();

  // Helper to format tooltip date nicely (e.g., "Oct 14, 2025")
  const formatTooltipDate = (dateStr) => {
    const d = parseToLocalDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      if (!day) {
        cell.setAttribute('data-level', 0);
        fragment.appendChild(cell);
        return;
      }

      cell.setAttribute('data-level', day.level);

      const formattedDate = formatTooltipDate(day.date);
      const contributionWord = day.count === 1 ? 'contribution' : 'contributions';
      let tooltipText = `${day.count} ${contributionWord} on ${formattedDate}`;
      if (day.count > 0) {
        const parts = [];
        if (day.codeforces > 0) {
          parts.push(`${day.codeforces} Codeforces`);
        }
        if (day.leetcode > 0) {
          parts.push(`${day.leetcode} LeetCode`);
        }
        if (parts.length > 0) {
          tooltipText += `\n${parts.join(' • ')}`;
        }
      }

      cell.setAttribute('data-tooltip', tooltipText);
      cell.setAttribute('title', tooltipText);

      cell.style.opacity = '0';
      fragment.appendChild(cell);
    });
  });

  grid.appendChild(fragment);
  
  // Animate cells with requestAnimationFrame for smooth appearance
  requestAnimationFrame(() => {
    const cells = grid.querySelectorAll('.heatmap-cell');
    cells.forEach((cell, index) => {
      setTimeout(() => {
        cell.style.opacity = '1';
      }, Math.min(index * 0.5, 150)); // Faster, capped animation
    });
  });

  // Month labels aligned with week columns
  if (monthsEl) {
    monthsEl.innerHTML = '';
    const monthsFragment = document.createDocumentFragment();
    let lastMonth = null;

    weeks.forEach((week, weekIndex) => {
      const label = document.createElement('span');
      label.className = 'heatmap-month-label';

      const firstDay = week.find(Boolean);
      if (firstDay) {
        const d = parseToLocalDate(firstDay.date);
        if (d) {
          const month = d.getMonth();
          if (month !== lastMonth && d.getDate() <= 7) {
            label.textContent = d.toLocaleDateString(undefined, { month: 'short' });
            lastMonth = month;
          }
        }
      }

      monthsFragment.appendChild(label);
    });

    monthsEl.appendChild(monthsFragment);
  }

  // Update streaks when heatmap data changes (will use cached calculation)
  renderStreaks();
}

// Initialize card animations and optimize initial render
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.glass-card');
  cards.forEach((card, index) => {
    card.style.setProperty('--card-index', index);
    // Add fade-in animation
    card.style.animationDelay = `${index * 0.05}s`;
  });
  
  // Preload heatmap to avoid layout shift
  requestAnimationFrame(() => {
    renderHeatmap();
  });
});

function renderTagAnalysis() {
  const topTagsEl = document.getElementById('top-tags');
  const weakTagsEl = document.getElementById('weak-tags');
  
  if (!topTagsEl || !weakTagsEl || !tagCounts || Object.keys(tagCounts).length === 0) {
    if (topTagsEl) topTagsEl.innerHTML = '<p class="tag-empty">No tag data available</p>';
    if (weakTagsEl) weakTagsEl.innerHTML = '<p class="tag-empty">No tag data available</p>';
    return;
  }
  
  // Convert tag counts to array and sort
  const tagArray = Object.entries(tagCounts).map(([tag, count]) => ({ tag, count }));
  tagArray.sort((a, b) => b.count - a.count);
  
  // Get top 8 tags (strengths)
  const topTags = tagArray.slice(0, 8);
  
  // Get weak areas (tags with count <= 2, sorted by count ascending)
  const weakTags = tagArray
    .filter(item => item.count <= 2)
    .sort((a, b) => a.count - b.count)
    .slice(0, 8);
  
  // Render top tags
  topTagsEl.innerHTML = '';
  if (topTags.length === 0) {
    topTagsEl.innerHTML = '<p class="tag-empty">No data available</p>';
  } else {
    const maxCount = topTags[0].count;
    topTags.forEach(({ tag, count }) => {
      const tagEl = document.createElement('div');
      tagEl.className = 'tag-item';
      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
      tagEl.innerHTML = `
        <div class="tag-name">${escapeHtml(tag)}</div>
        <div class="tag-bar-container">
          <div class="tag-bar" style="width: ${percentage}%"></div>
        </div>
        <div class="tag-count">${count}</div>
      `;
      topTagsEl.appendChild(tagEl);
    });
  }
  
  // Render weak tags
  weakTagsEl.innerHTML = '';
  if (weakTags.length === 0) {
    weakTagsEl.innerHTML = '<p class="tag-empty">Great! No weak areas detected</p>';
  } else {
    weakTags.forEach(({ tag, count }) => {
      const tagEl = document.createElement('div');
      tagEl.className = 'tag-item tag-item-weak';
      tagEl.innerHTML = `
        <div class="tag-name">${escapeHtml(tag)}</div>
        <div class="tag-count">${count} ${count === 1 ? 'problem' : 'problems'}</div>
      `;
      weakTagsEl.appendChild(tagEl);
    });
  }
}

applyTheme(getStoredTheme());
showGreeting();
prefillProfileFields();
setAuthActionsVisible(false);
setAuthStage('auth');
restoreSession().finally(() => {
  loadStats();
});
