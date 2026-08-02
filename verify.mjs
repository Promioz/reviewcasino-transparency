#!/usr/bin/env node
// Standalone chain verifier for the ReviewCasino transparency mirror.
// Zero dependencies — Node 18+ only. Anyone can run this against the files in
// THIS repository; no access to ReviewCasino's code or database is required.
//
//   node verify.mjs                 # verifies journal.jsonl (+ head.json if present)
//   node verify.mjs journal.jsonl
//
// The chain rule:
//   rowHash == sha256( canonicalJson(core) + prevHash )
// where canonicalJson serializes exactly these keys in exactly this order:
//   seq, entityType, entityId, field, oldValue, newValue, actorRole, reason, createdAt
// and the first row's prevHash is sha256("rc-genesis-2026").
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const GENESIS = sha256("rc-genesis-2026");

const file = process.argv[2] ?? "journal.jsonl";
const lines = readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => l.trim() !== "");

let prev = GENESIS;
let count = 0;
for (const line of lines) {
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    console.error(`❌ line ${count + 1}: not valid JSON`);
    process.exit(1);
  }
  const canonical = JSON.stringify({
    seq: e.seq,
    entityType: e.entityType,
    entityId: e.entityId,
    field: e.field,
    oldValue: e.oldValue ?? null,
    newValue: e.newValue ?? null,
    actorRole: e.actorRole,
    reason: e.reason ?? null,
    createdAt: e.createdAt,
  });
  if (e.prevHash !== prev) {
    console.error(`❌ chain BROKEN at seq ${e.seq}: prevHash mismatch (history edited or a row deleted before it)`);
    process.exit(1);
  }
  const expected = sha256(canonical + prev);
  if (e.rowHash !== expected) {
    console.error(`❌ chain BROKEN at seq ${e.seq}: rowHash mismatch (this row's content was altered)`);
    process.exit(1);
  }
  prev = e.rowHash;
  count++;
}

if (existsSync("head.json")) {
  const head = JSON.parse(readFileSync("head.json", "utf8"));
  if (head.count !== count) {
    console.error(`❌ head.json says count=${head.count}, journal has ${count}`);
    process.exit(1);
  }
  if (head.rowHash !== prev) {
    console.error(`❌ head.json rowHash does not match the journal's actual head`);
    process.exit(1);
  }
  console.log(`✅ chain verifies — ${count} event(s); head seq=${head.seq} rowHash=${prev}`);
  console.log(`   head.json matches. Now check the OpenTimestamps proof: ots verify ots/<date>-head.json.ots -f head.json`);
} else {
  console.log(`✅ chain verifies — ${count} event(s); head rowHash=${prev}`);
}
