// ═══════════════════════════════════════════════════════════════
//  Game Logger — Ring buffer + daily files + weekly compression
// ═══════════════════════════════════════════════════════════════

import { appendFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { execFileSync } from 'child_process';

const LOG_DIR = '/data/logs';
const RING_SIZE = 500;
const COMPRESS_AFTER_DAYS = 7;

export type LogCategory = 'AUTH' | 'COMBAT' | 'ECONOMY' | 'SOCIAL' | 'ADMIN' | 'SYSTEM' | 'PVP' | 'GUILD' | 'RAW' | 'ITEM' | 'SKILL';

// ─── Ring Buffer (in-memory, last N events) ──────────────────

const ring: LogEntry[] = [];

export interface LogEntry {
  time: string;
  timestamp: number;
  category: LogCategory;
  text: string;
  player?: string;
}

export function log(category: LogCategory, text: string, player?: string): void {
  const now = new Date();
  const time = now.toISOString().slice(11, 19);
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const timeMs = `${time}.${ms}`;
  const entry: LogEntry = { time: timeMs, timestamp: Date.now(), category, text, player };

  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();

  const date = now.toISOString().slice(0, 10);
  const line = `[${timeMs}] [${category}] ${player ? `[${player}] ` : ''}${text}\n`;
  try {
    appendFileSync(`${LOG_DIR}/${date}.log`, line);
  } catch {}
}

export function getRecentLogs(limit = 200, categories?: string, search?: string, player?: string): LogEntry[] {
  let entries = ring.slice(-(limit * 3)); // grab extra to filter from

  // Category filter (comma-separated)
  if (categories && categories !== 'all') {
    const cats = new Set(categories.split(','));
    entries = entries.filter(e => cats.has(e.category));
  }

  // Player filter
  if (player) {
    const p = player.toLowerCase();
    entries = entries.filter(e => e.player?.toLowerCase().includes(p) || e.text.toLowerCase().includes(p));
  }

  // Search filter
  if (search) {
    const s = search.toLowerCase();
    entries = entries.filter(e => e.text.toLowerCase().includes(s) || e.category.toLowerCase().includes(s));
  }

  return entries.slice(-limit).reverse();
}

// ─── Log Rotation (compress old logs) ────────────────────────

export function initLogger(): void {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  rotateOldLogs();
  log('SYSTEM', 'Server started');
}

function rotateOldLogs(): void {
  try {
    const files = readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));
    const cutoff = Date.now() - COMPRESS_AFTER_DAYS * 86400000;

    // Group old files by ISO week for compression
    const toCompress = new Map<string, string[]>();

    for (const file of files) {
      const dateStr = file.replace('.log', '');
      const fileDate = new Date(dateStr + 'T00:00:00Z');
      if (isNaN(fileDate.getTime())) continue;
      if (fileDate.getTime() >= cutoff) continue;

      const weekId = getISOWeek(fileDate);
      if (!toCompress.has(weekId)) toCompress.set(weekId, []);
      toCompress.get(weekId)!.push(file);
    }

    for (const [weekId, logFiles] of toCompress) {
      const archiveName = `week-${weekId}.log.gz`;
      const archivePath = `${LOG_DIR}/${archiveName}`;
      if (existsSync(archivePath)) {
        for (const f of logFiles) {
          try { unlinkSync(`${LOG_DIR}/${f}`); } catch {}
        }
        continue;
      }

      // Concatenate all files for this week
      let combined = '';
      for (const f of logFiles.sort()) {
        combined += `\n=== ${f} ===\n`;
        try { combined += readFileSync(`${LOG_DIR}/${f}`, 'utf-8'); } catch {}
      }

      try {
        const tmpPath = `${LOG_DIR}/_tmp_${weekId}.log`;
        writeFileSync(tmpPath, combined);
        execFileSync('gzip', ['-f', tmpPath]);
        const gzTmp = tmpPath + '.gz';
        if (existsSync(gzTmp)) {
          renameSync(gzTmp, archivePath);
        }
        for (const f of logFiles) {
          try { unlinkSync(`${LOG_DIR}/${f}`); } catch {}
        }
        log('SYSTEM', `Compressed ${logFiles.length} log files into ${archiveName}`);
      } catch (e: any) {
        log('SYSTEM', `Log rotation error: ${e?.message || e}`);
      }
    }
  } catch {}
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Daily rotation check (call from setInterval)
export function checkRotation(): void {
  rotateOldLogs();
}
