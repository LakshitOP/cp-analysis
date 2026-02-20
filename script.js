async function loadStats() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        document.getElementById('last-updated').innerText = data.last_updated;
        document.getElementById('total-solved').innerText = data.total_solved;
        document.getElementById('target-count').innerText = data.target;
        
        document.getElementById('cf-solved').innerText = data.platforms.codeforces;
        document.getElementById('lc-solved').innerText = data.platforms.leetcode;
        document.getElementById('cc-solved').innerText = data.platforms.codechef;
        document.getElementById('ac-solved').innerText = data.platforms.atcoder;
        
        const percentage = Math.min((data.total_solved / data.target) * 100, 100);
        
        setTimeout(() => {
            document.getElementById('green-bar').style.width = `${percentage}%`;
        }, 100);

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

loadStats();

