// Vercel serverless proxy → Smartsheet API
// Returns only the fields needed by the dashboard (much smaller payload)

const TOKEN = '4WmjsP8V2PA7e3GP624bc4xxsSfEPzpMRUSEL';

const SHEETS = {
  raid: '7427364280553348',
  tms:  '7433689576198020',
  drr:  '3468458757934980',
};

// Column indices per sheet (verified from live API 09 Jun 2026)
const RAID_COLS = {
  id: 1, ref: 2, title: 3, type: 4, desc: 5,
  due: 7, p2g: 8, status: 9, owner: 12,
  impact: 14, likelihood: 15, rating: 16
};
const TMS_COLS  = { id: 0, name: 2, status: 4, owner: 5, finish: 7, type: 9 };
const DRR_COLS  = { service: 1, provider: 2, rag: 4 };

function cellVal(row, colIdx) {
  const cell = row.cells.find(c => c.columnIndex === colIdx);
  return cell ? (cell.displayValue ?? cell.value ?? null) : null;
}

function parseRows(rows, colMap) {
  return rows.map(row => {
    const obj = {};
    for (const [key, idx] of Object.entries(colMap)) {
      obj[key] = cellVal(row, idx);
    }
    return obj;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheet = req.query?.sheet;
  const id    = SHEETS[sheet];

  if (!id) {
    return res.status(400).json({ error: `Unknown sheet: "${sheet}"` });
  }

  try {
    // Fetch up to 2000 rows — Smartsheet default page is 100, max is 10000 but response gets large
    // We fetch in pages if needed
    let allRows = [];
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.smartsheet.com/2.0/sheets/${id}?pageSize=500&page=${pageNum}&include=format`;
      const r   = await fetch(url, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      if (!r.ok) {
        const text = await r.text();
        return res.status(r.status).json({
          error: `Smartsheet returned ${r.status}`,
          detail: text.slice(0, 300)
        });
      }

      const data = await r.json();
      const rows = data.rows || [];
      allRows = allRows.concat(rows);

      // Check if there are more pages
      if (rows.length < 500 || allRows.length >= 2000) {
        hasMore = false;
      } else {
        pageNum++;
      }
    }

    // Parse only the columns we need — much smaller response
    let colMap;
    if (sheet === 'raid')     colMap = RAID_COLS;
    else if (sheet === 'tms') colMap = TMS_COLS;
    else                      colMap = DRR_COLS;

    const parsed = parseRows(allRows, colMap);

    // Return lightweight JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      sheet,
      count: parsed.length,
      rows: parsed
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
