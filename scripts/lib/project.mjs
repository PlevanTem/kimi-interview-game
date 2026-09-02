import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const fromRoot = (...parts) => path.join(root, ...parts);
export async function json(relative) { return JSON.parse(await readFile(fromRoot(relative), 'utf8')); }
export async function exists(relative) { try { await access(fromRoot(relative)); return true; } catch { return false; } }
export function fail(errors, message) { errors.push(message); console.error(`ERROR ${message}`); }
export function finish(errors, label) { if (errors.length) { console.error(`${label}: FAIL (${errors.length})`); process.exitCode = 1; } else console.log(`${label}: PASS`); }
