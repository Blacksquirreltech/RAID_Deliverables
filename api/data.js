// Vercel serverless function — proxies Smartsheet API calls server-side
// Deployed at: /api/data?sheet=raid|tms|drr
// No CORS issues — runs on Vercel's server, not the browser

const SHEET_IDS = {
  raid: '7427364280553348',
  tms:  '7433689576198020',
  drr:  '3468458757934980',
};

export default async function handler(req, res) {
  // Allow browser to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const { sheet } = req.query;
  const sheetId   = SHEET_IDS[sheet];

  if (!sheetId) {
    return res.status(400).json({ error: `Unknown sheet: ${sheet}. Use raid, tms, or drr.` });
  }

  const token = process.env.SMARTSHEET_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'SMARTSHEET_TOKEN not configured in Vercel environment.' });
  }

  try {
    const url  = `https://api.smartsheet.com/2.0/sheets/${sheetId}?pageSize=500`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `Smartsheet error: ${resp.status}`, detail: text });
    }

    const data = await resp.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
