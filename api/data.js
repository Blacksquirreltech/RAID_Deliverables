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

  const sheet = req.query?.sheet;
  const id    = SHEETS[sheet];
  if (!id) return res.status(400).json({ error: `Unknown sheet: "${sheet}"` });

  try {
    const url = `https://api.smartsheet.com/2.0/sheets/${id}?pageSize=500&page=1`;
    const r   = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: `Smartsheet ${r.status}`, detail: t.slice(0,300) });
    }

    const data = await r.json();
    const columns = data.columns || [];
    const rawRows = data.rows    || [];

    // Build columnId->title using STRING comparison to avoid JS integer precision loss
    // Smartsheet columnIds are 64-bit integers — JS loses precision above 2^53
    // Solution: build the map from the raw JSON text to preserve the IDs as strings
    const rawText = JSON.stringify(data.columns);
    const idTitleMap = {};
    for (const col of columns) {
      // col.id may already be imprecise in JS — use the title+index instead
      idTitleMap[col.index] = col.title;
    }

    // Convert rows: for each cell, find its column by index
    // We need columnIndex on the cell — Smartsheet returns columnId not columnIndex in cells
    // So build a columnId->index map first, accepting potential precision loss
    // but using String() to compare
    const colIdToIndex = {};
    for (const col of columns) {
      colIdToIndex[String(col.id)] = col.index;
    }

    const rows = rawRows.map(row => {
      const obj = {};
      for (const cell of (row.cells || [])) {
        // Try matching by columnId as string
        const idx = colIdToIndex[String(cell.columnId)];
        const title = idx !== undefined ? idTitleMap[idx] : null;
        if (title) {
          obj[title] = cell.displayValue ?? cell.value ?? null;
        }
      }
      return obj;
    });

    // Debug: include first row raw for diagnosis
    const debugFirstRow = rawRows[0] ? {
      cellCount: rawRows[0].cells.length,
      firstCell: rawRows[0].cells[0],
      colIdSample: String(rawRows[0].cells[0]?.columnId),
      mapKeySample: Object.keys(colIdToIndex)[0]
    } : null;

    return res.status(200).json({ sheet, count: rows.length, rows, debug: debugFirstRow });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack?.slice(0,300) });
  }
}
