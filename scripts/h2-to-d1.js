#!/usr/bin/env node
/*
 * h2-to-d1.js - convert an H2 SCRIPT dump into SQLite / Cloudflare D1 SQL.
 *
 * Usage:
 *   node h2-to-d1.js <h2dump.sql> <out.sql> [--validate]
 *
 * What it does:
 *   - maps H2 column types to SQLite (CHARACTER VARYING/CLOB/ENUM/JSON -> TEXT,
 *     BIGINT/BOOLEAN/SMALLINT/TINYINT/INT -> INTEGER, FLOAT(53)/DOUBLE -> REAL,
 *     NUMERIC(p,s) -> NUMERIC, TIMESTAMP/DATE/TIME -> TEXT, BINARY -> BLOB).
 *   - strips identity (`GENERATED ... AS IDENTITY`), `DEFAULT ON NULL`,
 *     `SELECTIVITY n` and `AUTO_INCREMENT`; drops PK/FK `ALTER TABLE` and
 *     `CREATE USER` statements (a D1 data copy does not need them).
 *   - decodes H2/SQL `U&'...'` unicode literals (e.g. \2194 -> an arrow).
 *   - emits `DROP TABLE IF EXISTS "x";` before each CREATE so the import is
 *     idempotent and can be re-run to refresh the cloud copy.
 *
 *   --validate runs the generated SQL through Node's built-in SQLite
 *   (requires `node --experimental-sqlite`) before writing is reported.
 */
const fs = require('fs');

const inFile = process.argv[2];
const outFile = process.argv[3];
const validate = process.argv.includes('--validate');
if (!inFile || !outFile) {
  console.error('Usage: node h2-to-d1.js <h2dump.sql> <out.sql> [--validate]');
  process.exit(2);
}
const raw = fs.readFileSync(inFile, 'utf8');

function decodeUnicodeLiterals(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === 'U' && sql[i + 1] === '&' && sql[i + 2] === "'") {
      i += 3;
      let s = '';
      while (i < sql.length) {
        const c = sql[i];
        if (c === "'") {
          if (sql[i + 1] === "'") { s += "'"; i += 2; continue; }
          i++; break;
        }
        if (c === '\\') {
          const n = sql[i + 1];
          if (n === '\\') { s += '\\'; i += 2; continue; }
          if (n === '+') {
            const hex = sql.substr(i + 2, 6);
            if (/^[0-9A-Fa-f]{6}$/.test(hex)) { s += String.fromCodePoint(parseInt(hex, 16)); i += 8; continue; }
          }
          const hex4 = sql.substr(i + 1, 4);
          if (/^[0-9A-Fa-f]{4}$/.test(hex4)) { s += String.fromCharCode(parseInt(hex4, 16)); i += 5; continue; }
          s += '\\'; i += 1; continue;
        }
        s += c; i++;
      }
      out += "'" + s.replace(/'/g, "''") + "'";
      continue;
    }
    out += sql[i]; i++;
  }
  return out;
}

function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inStr) {
      cur += c;
      if (c === "'") {
        if (sql[i + 1] === "'") { cur += "'"; i++; }
        else inStr = false;
      }
    } else {
      if (c === "'") { inStr = true; cur += c; }
      else if (c === '-' && sql[i + 1] === '-') {
        while (i < sql.length && sql[i] !== '\n') i++;
        cur += '\n';
      } else if (c === ';') { stmts.push(cur); cur = ''; }
      else cur += c;
    }
  }
  if (cur.trim()) stmts.push(cur);
  return stmts;
}

function convTable(t) {
  t = t.replace(/^CREATE\s+(CACHED|MEMORY)\s+TABLE/i, 'CREATE TABLE');
  t = t.replace(/"public"\./gi, '');
  t = t.replace(/\b(BIGINT|INTEGER|INT|SMALLINT|NUMERIC\s*\(\s*\d+\s*(,\s*\d+\s*)?\))\s+GENERATED\s+(BY\s+DEFAULT|ALWAYS)\s+AS\s+IDENTITY\s*\([^)]*\)/gi, 'INTEGER');
  t = t.replace(/\bGENERATED\s+(BY\s+DEFAULT|ALWAYS)\s+AS\s+IDENTITY\s*\([^)]*\)/gi, '');
  t = t.replace(/\bDEFAULT\s+ON\s+NULL/gi, '');
  t = t.replace(/\bSELECTIVITY\s+\d+/gi, '');
  t = t.replace(/\bAUTO_INCREMENT\b/gi, '');
  t = t.replace(/CHARACTER\s+VARYING\s*\(\s*\d+\s*\)/gi, 'TEXT');
  t = t.replace(/CHARACTER\s+VARYING/gi, 'TEXT');
  t = t.replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, 'TEXT');
  t = t.replace(/\bVARCHAR\b/gi, 'TEXT');
  t = t.replace(/\bCHARACTER\s*\(\s*\d+\s*\)/gi, 'TEXT');
  t = t.replace(/\bCLOB\b/gi, 'TEXT');
  t = t.replace(/ENUM\s*\([^)]*\)/gi, 'TEXT');
  t = t.replace(/\bJSON\b/gi, 'TEXT');
  t = t.replace(/\bUUID\b/gi, 'TEXT');
  t = t.replace(/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi, 'TEXT');
  t = t.replace(/\bTIMESTAMP\s*\(\s*\d+\s*\)/gi, 'TEXT');
  t = t.replace(/\bTIMESTAMP\b/gi, 'TEXT');
  t = t.replace(/\bDATETIME\b/gi, 'TEXT');
  t = t.replace(/\bDATE\b/gi, 'TEXT');
  t = t.replace(/\bTIME\b/gi, 'TEXT');
  t = t.replace(/DOUBLE\s+PRECISION/gi, 'REAL');
  t = t.replace(/\bDOUBLE\b/gi, 'REAL');
  t = t.replace(/\bFLOAT\s*\(\s*\d+\s*\)/gi, 'REAL');
  t = t.replace(/\bFLOAT\b/gi, 'REAL');
  t = t.replace(/\bNUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'NUMERIC');
  t = t.replace(/\bDECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'NUMERIC');
  t = t.replace(/\bDECIMAL\b/gi, 'NUMERIC');
  t = t.replace(/BINARY\s+VARYING\s*\(\s*\d+\s*\)/gi, 'BLOB');
  t = t.replace(/\bVARBINARY\s*\(\s*\d+\s*\)/gi, 'BLOB');
  t = t.replace(/\bBINARY\s*\(\s*\d+\s*\)/gi, 'BLOB');
  t = t.replace(/\bBINARY\b/gi, 'BLOB');
  t = t.replace(/\bBIGINT\b/gi, 'INTEGER');
  t = t.replace(/\bSMALLINT\b/gi, 'INTEGER');
  t = t.replace(/\bTINYINT\b/gi, 'INTEGER');
  t = t.replace(/\bINT\b/gi, 'INTEGER');
  t = t.replace(/\bBOOLEAN\b/gi, 'INTEGER');
  t = t.replace(/\bBIT\b/gi, 'INTEGER');
  return t.trim();
}

function convInsert(t) {
  t = t.replace(/"public"\./gi, '');
  t = t.replace(/\bTIMESTAMP\s+WITH\s+TIME\s+ZONE\s+'/gi, "'");
  t = t.replace(/\bTIMESTAMP\s+'/gi, "'");
  t = t.replace(/\bDATE\s+'/gi, "'");
  t = t.replace(/\bTIME\s+'/gi, "'");
  t = t.replace(/\bJSON\s+'/gi, "'");
  t = t.replace(/\bTRUE\b/g, '1');
  t = t.replace(/\bFALSE\b/g, '0');
  return t.trim();
}

const stmts = splitStatements(raw);
const out = [];
const stats = { table: 0, insert: 0, dropped: 0, skipped: {}, unknown: [] };

for (const s of stmts) {
  const t = decodeUnicodeLiterals(s).trim();
  if (!t) continue;
  const up = t.toUpperCase();
  if (up.startsWith('CREATE USER') || up.startsWith('ALTER TABLE')) {
    const k = up.split(' ').slice(0, 2).join(' ');
    stats.skipped[k] = (stats.skipped[k] || 0) + 1;
    continue;
  }
  if (up.startsWith('SET ') || up.startsWith('CREATE SCHEMA') || up.startsWith('CREATE SEQUENCE') || up.startsWith('COMMENT')) {
    stats.skipped[t.slice(0, 24)] = (stats.skipped[t.slice(0, 24)] || 0) + 1;
    continue;
  }
  if (up.startsWith('CREATE TABLE') || up.startsWith('CREATE CACHED TABLE') || up.startsWith('CREATE MEMORY TABLE')) {
    const c = convTable(t);
    const m = /^CREATE TABLE "([^"]+)"/i.exec(c);
    if (m) { out.push(`DROP TABLE IF EXISTS "${m[1]}"`); stats.dropped++; }
    out.push(c);
    stats.table++;
    continue;
  }
  if (up.startsWith('CREATE INDEX') || up.startsWith('CREATE UNIQUE INDEX')) { out.push(t.replace(/"public"\./gi, '').trim()); continue; }
  if (up.startsWith('INSERT INTO')) { out.push(convInsert(t)); stats.insert++; continue; }
  stats.unknown.push(t.slice(0, 80));
}

const banner = `-- VyGo D1 import (converted from H2 dump ${new Date().toISOString()})\n`;
const finalSql = banner + out.join(';\n') + ';\n';

let validated = null;
if (validate) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(':memory:');
    let ok = 0;
    for (const stmt of splitStatements(finalSql).map(x => x.trim()).filter(Boolean)) {
      db.exec(stmt);
      ok++;
    }
    validated = ok;
  } catch (e) {
    console.error('VALIDATION FAILED:', e.message);
    process.exit(1);
  }
}

fs.writeFileSync(outFile, finalSql, 'utf8');
console.log(JSON.stringify({
  tables: stats.table, inserts: stats.insert, dropStatements: stats.dropped,
  skipped: stats.skipped, unknown: stats.unknown,
  validatedStatements: validated, outBytes: fs.statSync(outFile).size,
}, null, 2));
