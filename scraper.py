import json
import requests
import re
from datetime import datetime

CF_HANDLE = "derxy"
LC_HANDLE = "derxy"
CC_HANDLE = "derxy"
AC_HANDLE = "derxy"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

def get_codeforces(handle):
    try:
        url = f"https://codeforces.com/api/user.status?handle={handle}"
        res = requests.get(url).json() 
        if res["status"] == "OK":
            solved = set()
            for sub in res["result"]:
                if sub["verdict"] == "OK":
                    solved.add(f'{sub["problem"]["contestId"]}{sub["problem"]["index"]}')
            count = len(solved)
            print(f"✅ Codeforces: Found {count} solved.")
            return count
    except Exception as e:
        print(f"❌ Codeforces failed: {e}")
    return 0

def get_leetcode(handle):
    try:
        url = "https://leetcode.com/graphql/"
        payload = {
            "query": "query getUserProfile($username: String!) { matchedUser(username: $username) { submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } } }",
            "variables": {"username": handle}
        }
        res = requests.post(url, json=payload).json()
        count = res["data"]["matchedUser"]["submitStats"]["acSubmissionNum"][0]["count"]
        print(f"✅ LeetCode: Found {count} solved.")
        return count
    except Exception as e:
        print(f"❌ LeetCode failed: {e}")
    return 0

def get_codechef(handle):
    try:
        url = f"https://www.codechef.com/users/{handle}"
        res = requests.get(url, headers=HEADERS)
        
        match = re.search(r'Fully Solved.*?\((\d+)\)', res.text, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            print(f"✅ CodeChef: Found {count} solved.")
            return count
            
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(res.text, "html.parser")
        section = soup.find('section', class_=lambda c: c and 'problems-solved' in c)
        if section and section.find('h3'):
            text = section.find('h3').text
            count = int(''.join(filter(str.isdigit, text)))
            print(f"✅ CodeChef: Found {count} solved.")
            return count
            
    except Exception as e:
        print(f"❌ CodeChef failed: {e}")
    print("❌ CodeChef: Could not find stats.")
    return 0

def get_atcoder(handle):
    try:
        url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user={handle}"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            count = res.json().get("count", 0)
            print(f"✅ AtCoder: Found {count} solved.")
            return count
            
        url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={handle}&from_second=0"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            ac_problems = set()
            for sub in res.json():
                if sub.get("result") == "AC":
                    ac_problems.add(sub.get("problem_id"))
            count = len(ac_problems)
            print(f"✅ AtCoder: Found {count} solved.")
            return count
            
        print(f"❌ AtCoder: API returned status code {res.status_code}")
    except Exception as e:
        print(f"❌ AtCoder failed: {e}")
    return 0
def main():
    print("Fetching CP stats...")
    cf = get_codeforces(CF_HANDLE)
    lc = get_leetcode(LC_HANDLE)
    cc = get_codechef(CC_HANDLE)
    ac = get_atcoder(AC_HANDLE)
    
    total = cf + lc + cc + ac
    target = 1500 
    
    data = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_solved": total,
        "target": target,
        "platforms": {
            "codeforces": cf,
            "leetcode": lc,
            "codechef": cc,
            "atcoder": ac
        }
    }
    
    with open("data.json", "w") as f:
        json.dump(data, f, indent=4)
        
    print(f"🎉 Update complete! Total solved: {total}/{target}")

if __name__ == "__main__":
    main()