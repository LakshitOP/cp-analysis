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
  'CF <1000': 0,
  'CF 1000-1199': 0,
  'CF 1200-1399': 0,
  'CF 1400+': 0,
};

const LC_DIFF_TEMPLATE = {
  'LC Easy': 0,
  'LC Medium': 0,
  'LC Hard': 0,
};

function classifyCf(rating) {
  if (typeof rating !== 'number') return null;
  if (rating < 1000) return 'CF <1000';
  if (rating < 1200) return 'CF 1000-1199';
  if (rating < 1400) return 'CF 1200-1399';
  return 'CF 1400+';
}

function toDifficultyClass(rating) {
  if (typeof rating !== 'number') return 'easy';
  if (rating >= 1400) return 'hard';
  if (rating >= 1000) return 'medium';
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

      if (recentSubmissions.length < 10) {
        recentSubmissions.push({
          name: submission.problem.name,
          url: contestId && index ? `https://codeforces.com/contest/${contestId}/problem/${index}` : '',
          platform: 'codeforces',
          platformLabel: 'CF',
          difficulty: typeof rating === 'number' ? String(rating) : 'N/A',
          difficultyClass: toDifficultyClass(rating),
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

async function getLeetcodeData(handle) {
  const diff = { ...LC_DIFF_TEMPLATE };
  if (!handle) return { count: 0, diff };

  try {
    const res = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query getUserProfile($username: String!) { matchedUser(username: $username) { submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } } }',
        variables: { username: handle },
      }),
    });

    const payload = await res.json();
    const stats = payload?.data?.matchedUser?.submitStats?.acSubmissionNum;
    if (!Array.isArray(stats)) return { count: 0, diff };

    let count = 0;
    for (const item of stats) {
      if (item.difficulty === 'All') count = item.count || 0;
      if (item.difficulty === 'Easy') diff['LC Easy'] = item.count || 0;
      if (item.difficulty === 'Medium') diff['LC Medium'] = item.count || 0;
      if (item.difficulty === 'Hard') diff['LC Hard'] = item.count || 0;
    }
    return { count, diff };
  } catch {
    return { count: 0, diff };
  }
}

async function getCodechefCount(handle) {
  if (!handle) return 0;
  try {
    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`);
    const html = await res.text();
    const match = html.match(/Fully Solved.*?(\d+)/i);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

async function getAtcoderCount(handle) {
  if (!handle) return 0;
  try {
    const rankRes = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${encodeURIComponent(handle)}`);
    if (rankRes.ok) {
      const rankPayload = await rankRes.json();
      if (typeof rankPayload.count === 'number') return rankPayload.count;
    }

    const submissionsRes = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`);
    if (!submissionsRes.ok) return 0;
    const submissions = await submissionsRes.json();
    const solved = new Set(
      (Array.isArray(submissions) ? submissions : [])
        .filter((item) => item.result === 'AC' && item.problem_id)
        .map((item) => item.problem_id)
    );
    return solved.size;
  } catch {
    return 0;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  const params = event.queryStringParameters || {};
  const cf = (params.cf || '').trim();
  const lc = (params.lc || '').trim();
  const cc = (params.cc || '').trim();
  const ac = (params.ac || '').trim();

  const [cfData, lcData, ccCount, acCount] = await Promise.all([
    getCodeforcesData(cf),
    getLeetcodeData(lc),
    getCodechefCount(cc),
    getAtcoderCount(ac),
  ]);

  const platforms = {
    codeforces: cfData.count,
    leetcode: lcData.count,
    codechef: ccCount,
    atcoder: acCount,
  };

  return json(200, {
    last_updated: new Date().toISOString(),
    total_solved: Object.values(platforms).reduce((sum, n) => sum + n, 0),
    target: 1500,
    platforms,
    difficulty_chart: [
      { label: 'CF <1000', count: cfData.diff['CF <1000'], color: '#4caf50' },
      { label: 'CF 1000-1199', count: cfData.diff['CF 1000-1199'], color: '#8bc34a' },
      { label: 'CF 1200-1399', count: cfData.diff['CF 1200-1399'], color: '#ffc107' },
      { label: 'CF 1400+', count: cfData.diff['CF 1400+'], color: '#f44336' },
      { label: 'LC Easy', count: lcData.diff['LC Easy'], color: '#4caf50' },
      { label: 'LC Medium', count: lcData.diff['LC Medium'], color: '#ff9800' },
      { label: 'LC Hard', count: lcData.diff['LC Hard'], color: '#f44336' },
    ],
    recent_submissions: cfData.recentSubmissions,
    tag_counts: cfData.tagCounts,
  });
};
