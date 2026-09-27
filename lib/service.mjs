// src/host/service.ts
import { mkdir as mkdir2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, join as join2 } from "node:path";
import { randomBytes } from "node:crypto";

// src/shared/types.ts
var PACKAGE_NAME = "dsh-local-long-horizon";
var MAX_NEXT = 3;
var MAX_DONE_RECENT = 5;
var MAX_NOTES_CHARS = 500;
var INJECT_PATH_REL = ".dsh/task-status-inject.md";
var STATUS_MD_REL = "STATUS.md";

// src/host/git.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
async function resolveGitBranch(cwd) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
      { timeout: 2e3, maxBuffer: 64 * 1024 }
    );
    const branch = stdout.trim();
    if (!branch || branch === "HEAD") return null;
    return branch;
  } catch {
    return null;
  }
}

// src/host/injector.ts
function renderInject(record) {
  if (!record.enabled) {
    return "[TASK STATUS] DISABLED \u2014 mutations refused; re-enable in Long horizon pane or status tools.\n";
  }
  const next = record.next.length ? record.next.map((n, i) => `${i + 1}.${n}`).join(" ") : "\u2014";
  const blocked = record.blocked ? record.blocked.reason : "no";
  const inflight = record.inFlight?.summary ?? "\u2014";
  const line = `[TASK STATUS] Phase: ${record.phase} | Next: ${next} | InFlight: ${inflight} | Blocked: ${blocked}`;
  return `${line.slice(0, 220)}
`;
}
function renderDisabledInject() {
  return "[TASK STATUS] DISABLED \u2014 mutations refused; re-enable in Long horizon pane or status tools.\n";
}

// src/host/projectMd.ts
function renderStatusMd(record) {
  const age = ageLabel(record.updatedAt);
  const lines = [
    `# ${record.title}`,
    "",
    `- **Long horizon:** ${record.enabled ? "ON" : "OFF"}`,
    `- **Phase:** ${record.phase}`,
    `- **cwd:** \`${record.cwd}\``,
    `- **Updated:** ${age}`,
    ""
  ];
  if (record.blocked) {
    lines.push(`> **Blocked:** ${record.blocked.reason}`, "");
  }
  lines.push("## Now", "");
  lines.push(`- **In flight:** ${record.inFlight?.summary ?? "\u2014"}`);
  lines.push("- **Next 3:**");
  if (record.next.length === 0) {
    lines.push("  1. \u2014");
  } else {
    record.next.forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
  }
  lines.push("", "## Done (recent)", "");
  const recent = record.done.slice(-MAX_DONE_RECENT).reverse();
  if (recent.length === 0) {
    lines.push("- (none)");
  } else {
    for (const d of recent) {
      const v = d.verify ? ` \xB7 verify: ${d.verify}` : "";
      lines.push(`- \u2713 ${d.summary}${v} \xB7 ${ageLabel(d.at)}`);
    }
  }
  if (record.verifyHint) {
    lines.push("", `**Verify hint:** ${record.verifyHint}`);
  }
  if (record.gitBranch) {
    lines.push("", `*Last write branch:* \`${record.gitBranch}\``);
  }
  lines.push("");
  return lines.join("\n");
}
function ageLabel(at) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1e3));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// src/host/schema.ts
var ValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
};
function assertNext(next) {
  if (!Array.isArray(next)) throw new ValidationError("next must be an array of strings");
  if (next.length > MAX_NEXT) {
    throw new ValidationError(`next length ${next.length} exceeds hard cap ${MAX_NEXT}`);
  }
  for (const item of next) {
    if (typeof item !== "string" || item.trim() === "") {
      throw new ValidationError("next items must be non-empty strings");
    }
  }
}
function capNotes(notes) {
  if (notes.length <= MAX_NOTES_CHARS) return notes;
  return `${notes.slice(0, MAX_NOTES_CHARS - 1)}\u2026`;
}
function emptyRecord(partial) {
  const now = Date.now();
  return {
    taskId: partial.taskId,
    title: partial.title?.trim() || basenameTitle(partial.cwd),
    cwd: partial.cwd,
    updatedAt: now,
    phase: partial.phase?.trim() || "init",
    enabled: true,
    done: [],
    inFlight: null,
    next: [],
    blocked: null,
    verifyHint: partial.verifyHint?.trim() || "",
    keyPaths: [],
    notes: ""
  };
}
function basenameTitle(cwd) {
  const parts = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || cwd;
}

// src/host/storage.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
function defaultStorageRoot() {
  return join(homedir(), ".dsh", "storages", "dsh-local-long-horizon");
}
function vaultPath(storageRoot, taskId) {
  return join(storageRoot, `${taskId}.json`);
}
var CorruptVaultError = class extends Error {
  path;
  constructor(path, cause) {
    super(`corrupt vault JSON at ${path}`);
    this.name = "CorruptVaultError";
    this.path = path;
    if (cause !== void 0) this.cause = cause;
  }
};
async function loadVault(path) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    const code = err?.code;
    if (code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new CorruptVaultError(path, cause);
  }
}
async function saveVault(path, record) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(record, null, 2)}
`;
  await writeFile(tmp, body, "utf8");
  await rename(tmp, path);
}

// src/host/taskId.ts
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
function taskIdFromCwd(cwd) {
  const abs = resolve(cwd);
  const base = basename(abs).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 48) || "task";
  const hash = createHash("sha256").update(abs).digest("hex").slice(0, 12);
  return `${base}-${hash}`;
}
function normalizeCwd(cwd) {
  return resolve(cwd);
}

// src/host/service.ts
var DisabledError = class extends Error {
  constructor() {
    super("Long horizon is OFF for this project \u2014 flip ON in the pane or call status_set_enabled");
    this.name = "DisabledError";
  }
};
var NotInitializedError = class extends Error {
  constructor(cwd) {
    super(`No long-horizon vault for cwd ${cwd}. Call status_init first.`);
    this.name = "NotInitializedError";
  }
};
function ageLabel2(at) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1e3));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
var TaskStatusService = class {
  storageRoot;
  constructor(opts = {}) {
    this.storageRoot = opts.storageRoot ?? defaultStorageRoot();
  }
  pathFor(cwd) {
    return vaultPath(this.storageRoot, taskIdFromCwd(normalizeCwd(cwd)));
  }
  async snapshot(cwd, view) {
    const sampledAt = Date.now();
    if (!cwd || cwd.trim() === "") {
      return {
        ok: true,
        package: PACKAGE_NAME,
        enabled: false,
        initialized: false,
        cwd: null,
        message: "pass ?cwd= absolute path (or init a project)",
        sampledAt
      };
    }
    try {
      const abs = normalizeCwd(cwd);
      const record = await loadVault(this.pathFor(abs));
      if (!record) {
        return {
          ok: true,
          package: PACKAGE_NAME,
          enabled: false,
          initialized: false,
          cwd: abs,
          message: "Init this project with status_init (or the pane).",
          sampledAt
        };
      }
      const sync = await this.buildSyncHints(record, abs, view?.sessionId ?? null);
      return {
        ok: true,
        package: PACKAGE_NAME,
        enabled: record.enabled,
        initialized: true,
        record,
        sync,
        sampledAt
      };
    } catch (err) {
      if (err instanceof CorruptVaultError) {
        return {
          ok: false,
          package: PACKAGE_NAME,
          error: err.message,
          sampledAt
        };
      }
      return {
        ok: false,
        package: PACKAGE_NAME,
        error: String(err),
        sampledAt
      };
    }
  }
  async init(args, writer) {
    const abs = normalizeCwd(args.cwd);
    const taskId = taskIdFromCwd(abs);
    const path = vaultPath(this.storageRoot, taskId);
    const existing = await loadVault(path);
    if (existing) {
      existing.title = args.title?.trim() || existing.title;
      if (args.verifyHint !== void 0) existing.verifyHint = args.verifyHint.trim();
      if (args.phase !== void 0) existing.phase = args.phase.trim() || existing.phase;
      existing.enabled = true;
      existing.updatedAt = Date.now();
      await this.stampWriter(existing, abs, writer);
      await this.persist(existing, { writeInject: true, writeMd: true });
      return existing;
    }
    const record = emptyRecord({
      taskId,
      cwd: abs,
      title: args.title,
      verifyHint: args.verifyHint,
      phase: args.phase
    });
    await this.stampWriter(record, abs, writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async get(cwd) {
    return this.requireRecord(cwd);
  }
  async setEnabled(cwd, enabled, writer) {
    const record = await this.requireRecord(cwd);
    record.enabled = enabled;
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    if (!enabled) {
      await this.persist(record, { writeInject: "disabled", writeMd: true });
    } else {
      await this.persist(record, { writeInject: true, writeMd: true });
    }
    return record;
  }
  async setNext(cwd, next, writer) {
    assertNext(next);
    const record = await this.requireEnabled(cwd);
    record.next = next.map((s) => s.trim());
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async setInflight(cwd, summary, writer) {
    const record = await this.requireEnabled(cwd);
    if (summary === null || summary.trim() === "") {
      record.inFlight = null;
    } else {
      record.inFlight = { summary: summary.trim(), since: Date.now() };
    }
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async setPhase(cwd, phase, writer) {
    const record = await this.requireEnabled(cwd);
    record.phase = phase.trim() || record.phase;
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async markDone(cwd, summary, verify, rotateNext = false, writer) {
    const record = await this.requireEnabled(cwd);
    let warn;
    if (!verify || verify.trim() === "") {
      warn = "mark_done without verify \u2014 accepted with warning (v0)";
    }
    const item = {
      id: randomBytes(4).toString("hex"),
      summary: summary.trim(),
      verify: verify?.trim() || void 0,
      at: Date.now()
    };
    record.done.push(item);
    if (record.done.length > 50) record.done = record.done.slice(-50);
    if (record.inFlight?.summary === summary.trim()) record.inFlight = null;
    if (rotateNext && record.next[0] === summary.trim()) {
      record.next = record.next.slice(1);
    }
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return { record, warn };
  }
  async block(cwd, reason, writer) {
    const record = await this.requireEnabled(cwd);
    record.blocked = { reason: reason.trim(), since: Date.now() };
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async unblock(cwd, writer) {
    const record = await this.requireEnabled(cwd);
    record.blocked = null;
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async setNotes(cwd, notes, writer) {
    const record = await this.requireEnabled(cwd);
    record.notes = capNotes(notes);
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  recentDone(record) {
    return record.done.slice(-MAX_DONE_RECENT).reverse();
  }
  async stampWriter(record, cwd, writer) {
    const sid = writer?.sessionId?.trim();
    if (sid) record.lastSessionId = sid;
    const branch = await resolveGitBranch(cwd);
    if (branch) record.gitBranch = branch;
  }
  async buildSyncHints(record, cwd, currentSessionId) {
    const currentBranch = await resolveGitBranch(cwd);
    const warnings = [];
    const ageMs = Date.now() - record.updatedAt;
    if (ageMs >= 6 * 60 * 60 * 1e3) {
      warnings.push(`Last update ${ageLabel2(record.updatedAt)} \u2014 board may be stale for tonight\u2019s work.`);
    }
    if (record.gitBranch && currentBranch && record.gitBranch !== currentBranch) {
      warnings.push(
        `Git branch changed: last write on \`${record.gitBranch}\`, now on \`${currentBranch}\`. Same project board \u2014 skim Next/Done before trusting them, or start a fresh track after reset.`
      );
    }
    if (record.lastSessionId && currentSessionId && record.lastSessionId !== currentSessionId) {
      warnings.push(
        "Different chat than the last writer. This board may belong to another session \u2014 confirm before continuing."
      );
    }
    return {
      currentBranch,
      currentSessionId,
      warnings
    };
  }
  async requireRecord(cwd) {
    const abs = normalizeCwd(cwd);
    const record = await loadVault(this.pathFor(abs));
    if (!record) throw new NotInitializedError(abs);
    return record;
  }
  async requireEnabled(cwd) {
    const record = await this.requireRecord(cwd);
    if (!record.enabled) throw new DisabledError();
    return record;
  }
  async persist(record, opts) {
    await saveVault(vaultPath(this.storageRoot, record.taskId), record);
    if (opts.writeMd) {
      const mdPath = join2(record.cwd, STATUS_MD_REL);
      await mkdir2(dirname2(mdPath), { recursive: true });
      await writeFile2(mdPath, renderStatusMd(record), "utf8");
    }
    if (opts.writeInject === false) return;
    const injectPath = join2(record.cwd, INJECT_PATH_REL);
    await mkdir2(dirname2(injectPath), { recursive: true });
    const body = opts.writeInject === "disabled" ? renderDisabledInject() : renderInject(record);
    await writeFile2(injectPath, body, "utf8");
  }
};
export {
  CorruptVaultError,
  DisabledError,
  NotInitializedError,
  TaskStatusService,
  ValidationError
};
//# sourceMappingURL=service.mjs.map
