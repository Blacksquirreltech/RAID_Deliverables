// fetch.js — pulls all required Smartsheet data and writes to /data/*.json
import fetch from 'node-fetch';
import { writeFileSync, mkdirSync } from 'fs';

const TOKEN  = process.env.SMARTSHEET_TOKEN;
const BASE   = 'https://api.smartsheet.com/2.0';
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// Sheet IDs
const SHEETS = {
  raid:         7427364280553348,   // Dakar 26 TEC - RAID
  tms:          7433689576198020,   // Technology Master Schedule
  mastersheet:  2744860420296580,   // Mastersheet (deliverables)
  drr:          3468458757934980,   // DRR Master Tracker
  // SONATEL VROS
  vros_ced_son: 3592938480160644,
  vros_cid_son: 3380501881507716,
  vros_cor_son: 8239242690908036,
  vros_cto_son: 1196278009515908,
  vros_dar_son: 8241433124228996,
  vros_dex_son: 1483104515477380,
  vros_saw_son: 2681065383612292,
  vros_sbw_son: 5068303769751428,
  vros_ced_arp: 1106975512285060,
  // ARTP VROS
  vros_dex_arp: 1439944999391108,
  vros_saw_arp: 3130302393175940,
  vros_sbw_arp: 7634329369792388,
  vros_yov_arp: 553695677730692,
};

async function getSheet(id) {
  const url = `${BASE}/sheets/${id}?include=format&pageSize=500`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.error(`Failed to fetch sheet ${id}: ${res.status} ${res.statusText}`);
    return null;
  }
  return res.json();
}

function colMap(sheet) {
  const map = {};
  for (const col of sheet.columns) map[col.title] = col.index;
  return map;
}

function cellVal(row, idx) {
  const cell = row.cells.find(c => c.columnIndex === idx);
  return cell?.displayValue ?? cell?.value ?? null;
}

// ── RAID ────────────────────────────────────────────────────────────────────
async function fetchRaid() {
  const sheet = await getSheet(SHEETS.raid);
  if (!sheet) return [];
  const cm = colMap(sheet);
  return sheet.rows.map(row => ({
    id:       cellVal(row, cm['Unique Identifier']),
    title:    cellVal(row, cm['Title']),
    type:     cellVal(row, cm['Type']),
    status:   cellVal(row, cm['Status']),
    desc:     cellVal(row, cm['Description']),
    due:      cellVal(row, cm['Due Date']),
    owner:    cellVal(row, cm['Owner']),
    impact:   cellVal(row, cm['Impact']),
    likelihood: cellVal(row, cm['Likelihood']),
    rating:   cellVal(row, cm['Rating']),
    p2g:      cellVal(row, cm['Path to Green']),
    service:  cellVal(row, cm['Impacted Service']),
    ref:      cellVal(row, cm['Plan Reference']),
    elevate:  cellVal(row, cm['Elevate To:']),
  })).filter(r => r.id && r.status !== 'Closed');
}

// ── TMS ────────────────────────────────────────────────────────────────────
async function fetchTMS() {
  const sheet = await getSheet(SHEETS.tms);
  if (!sheet) return [];
  const cm = colMap(sheet);
  return sheet.rows.map(row => ({
    id:        cellVal(row, cm['TMS Identifier']),
    wgId:      cellVal(row, cm['WG Unique Identifier']),
    iocCode:   cellVal(row, cm['IOC Milestone Code']),
    name:      cellVal(row, cm['Task Name']),
    status:    cellVal(row, cm['Status']),
    owner:     cellVal(row, cm['Assigned Owner']),
    start:     cellVal(row, cm['Start Date']),
    finish:    cellVal(row, cm['Expected Finish Date']),
    type:      cellVal(row, cm['Milestone / Task Type']),
    workstream:cellVal(row, cm['Owner']),
  })).filter(r => r.id);
}

// ── MASTERSHEET ─────────────────────────────────────────────────────────────
async function fetchMastersheet() {
  const sheet = await getSheet(SHEETS.mastersheet);
  if (!sheet) return [];
  const cm = colMap(sheet);
  return sheet.rows.map(row => ({
    id:      cellVal(row, cm['Identifier']),
    name:    cellVal(row, cm['Task Name']),
    ref:     cellVal(row, cm['Reference Column']),
    status:  cellVal(row, cm['Status']),
    owner:   cellVal(row, cm['Assigned Owner']),
    start:   cellVal(row, cm['Start Date']),
    finish:  cellVal(row, cm['Expected Finish Date']),
    pct:     cellVal(row, cm['Percentage Completed ']),
  })).filter(r => r.id);
}

// ── DRR ────────────────────────────────────────────────────────────────────
async function fetchDRR() {
  const sheet = await getSheet(SHEETS.drr);
  if (!sheet) return [];
  const cm = colMap(sheet);
  return sheet.rows.map(row => ({
    service:   cellVal(row, cm['Service']),
    provider:  cellVal(row, cm['Service Provider']),
    workgroup: cellVal(row, cm['Workgroup']),
    rag:       cellVal(row, cm['Overall RAG']),
    risk:      cellVal(row, cm['Risks']),
    pct:       cellVal(row, cm['% Complete']),
    window:    cellVal(row, cm['Exercise Window Start']),
    windowEnd: cellVal(row, cm['Exercise Window End']),
    reschStart:cellVal(row, cm['Rescheduled window start']),
    reschEnd:  cellVal(row, cm['Rescheduled window end']),
    note:      cellVal(row, cm['Risk Description']),
    scope:     cellVal(row, cm['Scope Status']),
  })).filter(r => r.service);
}

// ── VROS ────────────────────────────────────────────────────────────────────
async function fetchVROS() {
  const results = [];
  const entries = Object.entries(SHEETS).filter(([k]) => k.startsWith('vros_'));
  for (const [key, id] of entries) {
    const parts    = key.split('_');        // vros_ced_son or vros_dex_arp
    const venue    = parts[1].toUpperCase();
    const provider = parts[2] === 'son' ? 'SONATEL' : 'ARTP';
    const sheet    = await getSheet(id);
    if (!sheet) continue;
    const cm = colMap(sheet);
    for (const row of sheet.rows) {
      const task   = cellVal(row, cm['Milestone/Task'] ?? cm['Column3'] ?? 4);
      const start  = cellVal(row, cm['Start']  ?? cm['Baseline Start'] ?? cm['Column9'] ?? 9);
      const finish = cellVal(row, cm['Finish'] ?? cm['Baseline Finish'] ?? cm['Column10'] ?? 10);
      const resp   = cellVal(row, cm['Responsible'] ?? cm['Column6'] ?? 6);
      const prog   = cellVal(row, cm['PROGRESS'] ?? cm['Column7'] ?? 7);
      const rag    = cellVal(row, cm['Status (RAG)'] ?? 17);
      if (task && (start || finish)) {
        results.push({ venue, provider, task, start, finish, responsible: resp, progress: prog, rag });
      }
    }
  }
  return results;
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching Smartsheet data…');
  mkdirSync('data', { recursive: true });

  const [raid, tms, mastersheet, drr, vros] = await Promise.all([
    fetchRaid(),
    fetchTMS(),
    fetchMastersheet(),
    fetchDRR(),
    fetchVROS(),
  ]);

  const meta = {
    lastUpdated: new Date().toISOString(),
    counts: {
      raid: raid.length,
      tms:  tms.length,
      mastersheet: mastersheet.length,
      drr:  drr.length,
      vros: vros.length,
    }
  };

  writeFileSync('data/raid.json',        JSON.stringify(raid, null, 2));
  writeFileSync('data/tms.json',         JSON.stringify(tms, null, 2));
  writeFileSync('data/mastersheet.json', JSON.stringify(mastersheet, null, 2));
  writeFileSync('data/drr.json',         JSON.stringify(drr, null, 2));
  writeFileSync('data/vros.json',        JSON.stringify(vros, null, 2));
  writeFileSync('data/meta.json',        JSON.stringify(meta, null, 2));

  console.log('Done.', meta.counts);
}

main().catch(err => { console.error(err); process.exit(1); });
