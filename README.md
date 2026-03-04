You can access my file via this link
https://cp-analysiss.netlify.app/

Started at 15 feb
v1 complited till 2 march (It can do basic things done)
ui imporvement v2 is going on.....

## Netlify deployment

This project now supports Netlify Functions for live stats.

- Main endpoint: `/.netlify/functions/stats`
- Optional friendly path (via redirect): `/api/stats`

The frontend (`script.js`) calls the Netlify function with the saved handles and falls back to `data.json` if the function is unavailable.
