import json
import requests
import re
import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def get_codeforces_data(handle):
    recent_subs = []
    cf_diff = {"CF <1000": 0, "CF 1000-1199": 0, "CF 1200-1399": 0, "CF 1400+": 0}
    tag_counts = {}
    count = 0
    try:
        url = f"https://codeforces.com/api/user.status?handle={handle}"
        res = requests.get(url).json()
        if res["status"] == "OK":
            solved_ids = set()
            for sub in res["result"]:
                if sub["verdict"] == "OK":
                    prob_id = f'{sub["problem"]["contestId"]}{sub["problem"]["index"]}'
                    if prob_id not in solved_ids:
                        solved_ids.add(prob_id)
                        rating = sub["problem"].get("rating")
                        if rating:
                            if rating < 1000: cf_diff["CF <1000"] += 1
                            elif rating < 1200: cf_diff["CF 1000-1199"] += 1
                            elif rating < 1400: cf_diff["CF 1200-1399"] += 1
                            else: cf_diff["CF 1400+"] += 1
                        # Collect tags for all solved problems
                        tags = sub["problem"].get("tags", [])
                        for tag in tags:
                            tag_counts[tag] = tag_counts.get(tag, 0) + 1
                        if len(recent_subs) < 10:
                            diff_class = "hard" if rating and rating >= 1400 else ("medium" if rating and rating >= 1000 else "easy")
                            recent_subs.append({
                                "name": sub["problem"]["name"],
                                "url": f'https://codeforces.com/contest/{sub["problem"]["contestId"]}/problem/{sub["problem"]["index"]}',
                                "platform": "codeforces",
                                "platformLabel": "CF",
                                "difficulty": str(rating) if rating else "N/A",
                                "difficultyClass": diff_class,
                                "solvedAt": datetime.fromtimestamp(sub["creationTimeSeconds"]).strftime('%b %d, %Y'),
                                "tags": tags
                            })
            count = len(solved_ids)
    except Exception as e:
        print(f"❌ Codeforces failed: {e}")
    return count, recent_subs, cf_diff, tag_counts

def get_leetcode_data(handle):
    lc_total = 0
    lc_diff = {"LC Easy": 0, "LC Medium": 0, "LC Hard": 0}
    try:
        url = "https://leetcode.com/graphql/"
        payload = {"query": "query getUserProfile($username: String!) { matchedUser(username: $username) { submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } } }", "variables": {"username": handle}}
        res = requests.post(url, json=payload).json()
        stats = res["data"]["matchedUser"]["submitStats"]["acSubmissionNum"]
        for stat in stats:
            if stat['difficulty'] == 'All': lc_total = stat['count']
            elif stat['difficulty'] == 'Easy': lc_diff['LC Easy'] = stat['count']
            elif stat['difficulty'] == 'Medium': lc_diff['LC Medium'] = stat['count']
            elif stat['difficulty'] == 'Hard': lc_diff['LC Hard'] = stat['count']
    except Exception:
        pass
    return lc_total, lc_diff

def get_codechef(handle):
    try:
        url = f"https://www.codechef.com/users/{handle}"
        res = requests.get(url, headers=headers)
        match = re.search(r'Fully Solved.*?(\d+)', res.text, re.IGNORECASE)
        if match: return int(match.group(1))
    except Exception:
        pass
    return 0

def get_atcoder(handle):
    try:
        url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user={handle}"
        res = requests.get(url, headers=headers)
        if res.status_code == 200: return res.json().get("count", 0)
        url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={handle}&from_second=0"
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            ac_problems = set([sub.get("problem_id") for sub in res.json() if sub.get("result") == "AC"])
            return len(ac_problems)
    except Exception:
        pass
    return 0



def load_handles():
    defaults = ("Derxy", "derxy", "derxy", "derxy")
    try:
        res = supabase.table("Profiles").select("*").limit(1).execute()
        if not res.data:
            return defaults

        row = res.data[0] or {}
        return (
            row.get("codeforces", defaults[0]),
            row.get("leetcode", defaults[1]),
            row.get("codechef", defaults[2]),
            row.get("atcoder", defaults[3]),
        )
    except Exception as e:
        print(f"Supabase handle load failed: {e}")
        return defaults

def main():
    cf, lc, cc, ac = load_handles()

    cf_count, cf_recent, cf_diff, cf_tags = get_codeforces_data(cf)
    lc_count, lc_diff = get_leetcode_data(lc)
    cc_count = get_codechef(cc)
    ac_count = get_atcoder(ac)

    # write data.json as you already do

    total = cf_count + lc_count + cc_count + ac_count

    chart_difficulty = [
        {"label": "CF <1000", "count": cf_diff["CF <1000"], "color": "#4caf50"},
        {"label": "CF 1000-1199", "count": cf_diff["CF 1000-1199"], "color": "#8bc34a"},
        {"label": "CF 1200-1399", "count": cf_diff["CF 1200-1399"], "color": "#ffc107"},
        {"label": "CF 1400+", "count": cf_diff["CF 1400+"], "color": "#f44336"},
        {"label": "LC Easy", "count": lc_diff["LC Easy"], "color": "#4caf50"},
        {"label": "LC Medium", "count": lc_diff["LC Medium"], "color": "#ff9800"},
        {"label": "LC Hard", "count": lc_diff["LC Hard"], "color": "#f44336"}
    ]
    data = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_solved": total,
        "target": 1500,
        "platforms": {
            "codeforces": cf_count,
            "leetcode": lc_count,
            "codechef": cc_count,
            "atcoder": ac_count,
        },
        "difficulty_chart": chart_difficulty,
        "recent_submissions": cf_recent,
        "tag_counts": cf_tags
    }
    with open("data.json", "w") as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    main()

