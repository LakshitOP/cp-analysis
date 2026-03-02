const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  },
  body: JSON.stringify(body),
});

const CF_DIFF_TEMPLATE = {
  'CF 800-999': 0,
  'CF 1000-1199': 0,
  'CF 1200-1399': 0,
  'CF 1400+': 0,
};

const CC_DIFF_TEMPLATE = {
  'CC 1★-2★': 0,
  'CC 3★-4★': 0,
  'CC 5★-7★': 0,
};

function classifyCf(rating) {
  if (typeof rating !== 'number') return null;
  if (rating < 1000) return 'CF 800-999';
  if (rating < 1200) return 'CF 1000-1199';
  if (rating < 1400) return 'CF 1200-1399';
  return 'CF 1400+';
}

function classifyCcStars(stars) {
  if (typeof stars !== 'number' || Number.isNaN(stars)) return null;
  if (stars <= 2) return 'CC 1★-2★';
  if (stars <= 4) return 'CC 3★-4★';
  return 'CC 5★-7★';
}

function toDifficultyClass(value, platform) {
  if (platform === 'codechef') {
    if (value >= 5) return 'hard';
    if (value >= 3) return 'medium';
    return 'easy';
  }
  if (typeof value !== 'number') return 'easy';
  if (value >= 1400) return 'hard';
  if (value >= 1000) return 'medium';
  return 'easy';
}

async function getCodeforcesData(handle) {
  const diff = { ...CF_DIFF_TEMPLATE };
  const tagCounts = {};
  const recentSubmissions = [];

  if (!handle) return { count: 0, diff, tagCounts, recentSubmissions };

  try {
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`;
    const res = await fetch(url);
    const payload = await res.json();

    if (payload.status !== 'OK' || !Array.isArray(payload.result)) {
      return { count: 0, diff, tagCounts, recentSubmissions };
    }

    const solved = new Set();

    for (const submission of payload.result) {
      if (submission.verdict !== 'OK' || !submission.problem) continue;

      const contestId = submission.problem.contestId;
      const index = submission.problem.index;
      const problemId = `${contestId ?? ''}${index ?? ''}`;
      if (!problemId || solved.has(problemId)) continue;
      solved.add(problemId);

      const rating = submission.problem.rating;
      const bucket = classifyCf(rating);
      if (bucket) diff[bucket] += 1;

      const tags = Array.isArray(submission.problem.tags) ? submission.problem.tags : [];
      for (const tag of tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;

      if (recentSubmissions.length < 8) {
        recentSubmissions.push({
          name: submission.problem.name,
          url: contestId && index ? `https://codeforces.com/contest/${contestId}/problem/${index}` : '',
          platform: 'codeforces',
          platformLabel: 'CF',
          difficulty: typeof rating === 'number' ? String(rating) : 'N/A',
          difficultyClass: toDifficultyClass(rating, 'codeforces'),
          solvedAt: submission.creationTimeSeconds
            ? new Date(submission.creationTimeSeconds * 1000).toISOString()
            : '',
          tags,
        });
      }
    }

    return { count: solved.size, diff, tagCounts, recentSubmissions };
  } catch {
    return { count: 0, diff, tagCounts, recentSubmissions };
  }
}

async function getCodechefData(handle) {
  const diff = { ...CC_DIFF_TEMPLATE };
  const recentSubmissions = [];
  if (!handle) return { count: 0, diff, recentSubmissions };

  try {
    const userRes = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`);
    const userHtml = await userRes.text();

    const solvedMatch = userHtml.match(/Fully Solved\s*\(?\s*(\d+)\s*\)?/i) || userHtml.match(/Problems Solved\s*\(?\s*(\d+)\s*\)?/i);
    const count = solvedMatch ? Number(solvedMatch[1]) : 0;

    const starsMatch = userHtml.match(/(\d)★/) || userHtml.match(/rating\s*:\s*"?([1-7])"?/i);
    const stars = starsMatch ? Number(starsMatch[1]) : null;
    const starBucket = classifyCcStars(stars);
    if (starBucket) {
      // lightweight approximation: distribute solved problems by profile star level.
      diff[starBucket] = Math.max(1, count);
    }

    return { count, diff, recentSubmissions };
  } catch {
    return { count: 0, diff, recentSubmissions };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  const params = event.queryStringParameters || {};
  const cf = (params.cf || '').trim();
  const cc = (params.cc || '').trim();

  const [cfData, ccData] = await Promise.all([
    getCodeforcesData(cf),
    getCodechefData(cc),
  ]);

  const platforms = {
    codeforces: cfData.count,
    codechef: ccData.count,
  };

  return json(200, {
    last_updated: new Date().toISOString(),
    total_solved: Object.values(platforms).reduce((sum, n) => sum + n, 0),
    target: 1500,
    platforms,
    difficulty_chart: [
      { label: 'CF 800-999', count: cfData.diff['CF 800-999'], color: '#4caf50' },
      { label: 'CF 1000-1199', count: cfData.diff['CF 1000-1199'], color: '#8bc34a' },
      { label: 'CF 1200-1399', count: cfData.diff['CF 1200-1399'], color: '#ffc107' },
      { label: 'CF 1400+', count: cfData.diff['CF 1400+'], color: '#f44336' },
      { label: 'CC 1★-2★', count: ccData.diff['CC 1★-2★'], color: '#8ecae6' },
      { label: 'CC 3★-4★', count: ccData.diff['CC 3★-4★'], color: '#219ebc' },
      { label: 'CC 5★-7★', count: ccData.diff['CC 5★-7★'], color: '#023047' },
    ],
    recent_submissions: cfData.recentSubmissions,
    tag_counts: cfData.tagCounts,
  });
};
