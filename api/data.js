// Vercel serverless proxy → Smartsheet API
// Returns slim rows: { count, columns: [{index,title}], rows: [{cells:[{i,v}]}] }

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

  const sheet = req.query?.sheet;
  const id    = SHEETS[sheet];
  if (!id) return res.status(400).json({ error: `Unknown sheet: "${sheet}"` });

  try {
    // Fetch page 1 (500 rows)
    const url  = `https://api.smartsheet.com/2.0/sheets/${id}?pageSize=500&page=1`;
    const r    = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: `Smartsheet ${r.status}`, detail: t.slice(0,300) });
    }
    const data = await r.json();

    // Build column title→index map
    const colMap = {};
    for (const col of (data.columns || [])) {
      colMap[col.title] = col.index;
    }

    // Slim down each row — keep only displayValue/value per cell, indexed by column title
    const rows = (data.rows || []).map(row => {
      const obj = {};
      for (const cell of (row.cells || [])) {
        // Find column title for this cell's columnIndex
        const col = data.columns.find(c => c.index === cell.columnIndex);
        if (col) {
          obj[col.title] = cell.displayValue ?? cell.value ?? null;
        }
      }
      return obj;
    });

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ sheet, count: rows.length, rows });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
