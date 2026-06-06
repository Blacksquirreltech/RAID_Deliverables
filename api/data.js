// Vercel serverless proxy — calls Smartsheet server-side, returns JSON to browser
// Token is hardcoded here so no environment variable setup is needed

const TOKEN = '4WmjsP8V2PA7e3GP624bc4xxsSfEPzpMRUSEL';

const SHEETS = {
  raid: '7427364280553348',
  tms:  '7433689576198020',
  drr:  '3468458757934980',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheet = req.query?.sheet || req.url?.split('sheet=')[1];
  const id    = SHEETS[sheet];

  if (!id) {
    return res.status(400).json({ error: `Unknown sheet "${sheet}". Use: raid, tms, drr` });
  }

  try {
    const r = await fetch(`https://api.smartsheet.com/2.0/sheets/${id}?pageSize=500`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({ error: `Smartsheet ${r.status}`, detail: text });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
