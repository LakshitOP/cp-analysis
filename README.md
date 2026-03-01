You can access my file via this link
https://lakshitop.github.io/cp-analysis/


## Netlify deployment

This project now supports Netlify Functions for live stats.

- Main endpoint: `/.netlify/functions/stats`
- Optional friendly path (via redirect): `/api/stats`

The frontend (`script.js`) calls the Netlify function with the saved handles and falls back to `data.json` if the function is unavailable.
