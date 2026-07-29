const TOKEN = '4WmjsP8V2PA7e3GP624bc4xxsSfEPzpMRUSEL';
const SHEETS = {
  raid: '7427364280553348',
  tms:  '7433689576198020',
  drr:  '3468458757934980',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sheet = null;
  if (req.query?.sheet) sheet = req.query.sheet;
  if (!sheet && req.url) {
    const m = req.url.match(/[?&]sheet=([^&]+)/);
    if (m) sheet = decodeURIComponent(m[1]);
  }
  sheet = (sheet || '').trim().toLowerCase();
  const id = SHEETS[sheet];
  if (!id) return res.status(400).json({ error: `Unknown sheet: "${sheet}"`, valid: Object.keys(SHEETS) });

  try {
    const r = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${id}?pageSize=500&page=1`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: `Smartsheet ${r.status}`, detail: t.slice(0, 300) });
    }
    const data = await r.json();

    // Build columnId → title using String() to avoid 64-bit integer precision loss
    const colIdToTitle = {};
    for (const col of (data.columns || [])) {
      colIdToTitle[String(col.id)] = col.title;
    }

    // Convert each row into a plain { "Column Title": value } object
    const rows = (data.rows || []).map(row => {
      const obj = {};
      for (const cell of (row.cells || [])) {
        const title = colIdToTitle[String(cell.columnId)];
        if (title) obj[title] = cell.displayValue ?? cell.value ?? null;
      }
      return obj;
    });

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ sheet, count: rows.length, rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
