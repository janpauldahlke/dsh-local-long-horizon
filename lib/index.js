// src/host/index.ts
import { URL } from "node:url";

// src/host/route.ts
var ROUTE = "/api/dsh-local-long-horizon";

// src/host/service.ts
import { mkdir as mkdir2, writeFile as writeFile3 } from "node:fs/promises";
import { dirname as dirname2, join as join3 } from "node:path";
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
async function gitShort(cwd, args) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], {
      timeout: 2e3,
      maxBuffer: 64 * 1024
    });
    const branch = stdout.trim();
    if (!branch || branch === "HEAD") return null;
    return branch;
  } catch {
    return null;
  }
}
async function resolveGitBranch(cwd) {
  return await gitShort(cwd, ["symbolic-ref", "--short", "HEAD"]) ?? await gitShort(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

// src/host/agentsMd.ts
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
var LONG_HORIZON_HEADING = "## Long horizon";
var LONG_HORIZON_SECTION = `${LONG_HORIZON_HEADING}
Before coding, read \`.dsh/task-status-inject.md\` if present \u2014 it is binding
current task state (DeepSeek Harness injects this AGENTS.md; the inject file is
the live board).
Use status_* tools to update Next (\u22643), in-flight, done (with verify), and blocked.
Do not invent a parallel STATUS novel; the vault owns truth and STATUS.md is generated.
`;
function hasLongHorizonSection(content) {
  return content.includes(LONG_HORIZON_HEADING);
}
function mergeAgentsMd(existing) {
  const section = `${LONG_HORIZON_SECTION.trimEnd()}
`;
  if (existing === null) {
    return { content: section, action: "created" };
  }
  if (hasLongHorizonSection(existing)) {
    return { content: existing, action: "unchanged" };
  }
  const base = existing.replace(/\s+$/, "");
  const sep = base.length === 0 ? "" : "\n\n";
  return { content: `${base}${sep}${section}`, action: "appended" };
}
async function ensureAgentsMd(cwd) {
  const path = join(cwd, "AGENTS.md");
  let existing = null;
  try {
    existing = await readFile(path, "utf8");
  } catch (err) {
    const code = err.code;
    if (code !== "ENOENT") throw err;
  }
  const { content, action } = mergeAgentsMd(existing);
  if (action === "unchanged") return action;
  await writeFile(path, content, "utf8");
  return action;
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
function requireNonEmpty(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ValidationError(`${field} must be a non-empty string`);
  return text;
}
function assertVaultShape(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("vault root must be an object");
  }
  const o = raw;
  for (const key of ["taskId", "title", "cwd", "phase"]) {
    if (typeof o[key] !== "string" || o[key].trim() === "") {
      throw new ValidationError(`vault missing string field ${key}`);
    }
  }
  if (typeof o.updatedAt !== "number" || !Number.isFinite(o.updatedAt)) {
    throw new ValidationError("vault.updatedAt must be a finite number");
  }
  if (typeof o.enabled !== "boolean") {
    throw new ValidationError("vault.enabled must be a boolean");
  }
  if (!Array.isArray(o.next) || !Array.isArray(o.done) || !Array.isArray(o.keyPaths)) {
    throw new ValidationError("vault next/done/keyPaths must be arrays");
  }
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
import { mkdir, readFile as readFile2, rename, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, join as join2 } from "node:path";
import { homedir } from "node:os";
function defaultStorageRoot() {
  return join2(homedir(), ".dsh", "storages", "dsh-local-long-horizon");
}
function vaultPath(storageRoot, taskId) {
  return join2(storageRoot, `${taskId}.json`);
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
    raw = await readFile2(path, "utf8");
  } catch (err) {
    const code = err?.code;
    if (code === "ENOENT") return null;
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new CorruptVaultError(path, cause);
  }
  try {
    assertVaultShape(parsed);
  } catch (cause) {
    throw new CorruptVaultError(path, cause instanceof ValidationError ? cause : cause);
  }
  return parsed;
}
async function saveVault(path, record) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(record, null, 2)}
`;
  await writeFile2(tmp, body, "utf8");
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
      await ensureAgentsMd(abs);
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
    await ensureAgentsMd(abs);
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
      await ensureAgentsMd(normalizeCwd(cwd));
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
    const summaryText = requireNonEmpty(summary, "summary");
    const record = await this.requireEnabled(cwd);
    let warn;
    if (!verify || verify.trim() === "") {
      warn = "mark_done without verify \u2014 accepted with warning (v0)";
    }
    const item = {
      id: randomBytes(4).toString("hex"),
      summary: summaryText,
      at: Date.now()
    };
    const verifyText = verify?.trim();
    if (verifyText) item.verify = verifyText;
    record.done.push(item);
    if (record.done.length > 50) record.done = record.done.slice(-50);
    if (record.inFlight?.summary === summaryText) record.inFlight = null;
    if (rotateNext && record.next[0] === summaryText) {
      record.next = record.next.slice(1);
    }
    record.updatedAt = Date.now();
    await this.stampWriter(record, normalizeCwd(cwd), writer);
    await this.persist(record, { writeInject: true, writeMd: true });
    return { record, warn };
  }
  async block(cwd, reason, writer) {
    const reasonText = requireNonEmpty(reason, "reason");
    const record = await this.requireEnabled(cwd);
    record.blocked = { reason: reasonText, since: Date.now() };
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
      const mdPath = join3(record.cwd, STATUS_MD_REL);
      await mkdir2(dirname2(mdPath), { recursive: true });
      await writeFile3(mdPath, renderStatusMd(record), "utf8");
    }
    if (opts.writeInject === false) return;
    const injectPath = join3(record.cwd, INJECT_PATH_REL);
    await mkdir2(dirname2(injectPath), { recursive: true });
    const body = opts.writeInject === "disabled" ? renderDisabledInject() : renderInject(record);
    await writeFile3(injectPath, body, "utf8");
  }
};

// src/host/tools.ts
function resolveCwd(args, exec) {
  const fromArg = args.cwd?.trim();
  if (fromArg) return fromArg;
  const fromAgent = exec.agent?.session?.header?.cwd?.trim();
  if (fromAgent) return fromAgent;
  throw new Error("cwd required (pass cwd or run from an agent session with a workspace cwd)");
}
function writerFrom(exec) {
  const id = exec.agent?.session?.id ?? exec.agent?.session?.header?.id;
  return typeof id === "string" && id.trim() ? { sessionId: id.trim() } : {};
}
function toolError(err) {
  if (err instanceof ValidationError || err instanceof DisabledError || err instanceof NotInitializedError || err instanceof CorruptVaultError) {
    throw err;
  }
  throw err instanceof Error ? err : new Error(String(err));
}
var recordSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    taskId: { type: "string" },
    title: { type: "string" },
    cwd: { type: "string" },
    updatedAt: { type: "integer" },
    phase: { type: "string" },
    enabled: { type: "boolean" },
    next: { type: "array", items: { type: "string" } },
    done: { type: "array" },
    inFlight: {},
    blocked: {},
    verifyHint: { type: "string" },
    keyPaths: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
    lastSessionId: { type: "string" },
    gitBranch: { type: "string" },
    _warn: { type: "string" }
  }
};
function renderJson(_args, value) {
  return [{ type: "text", text: JSON.stringify(value, null, 2) }];
}
function registerTools(ctx, service) {
  const tools = ctx.tools;
  const disposers = [];
  disposers.push(tools.register({
    name: "status_ping",
    description: "Health probe for dsh-local-long-horizon host module.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {}
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["ok", "package", "at"],
        properties: {
          ok: { type: "boolean" },
          package: { type: "string" },
          at: { type: "integer" }
        }
      },
      render: (_a, v) => [{ type: "text", text: JSON.stringify(v) }]
    },
    async execute() {
      return { ok: true, package: "dsh-local-long-horizon", at: Date.now() };
    }
  }));
  disposers.push(tools.register({
    name: "status_init",
    description: "Create or refresh the long-horizon vault for a project cwd. Enables Long horizon ON.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cwd: { type: "string", description: "Absolute project cwd (defaults to session cwd)." },
        title: { type: "string", description: "Short task title." },
        verifyHint: { type: "string", description: "How to verify done items." },
        phase: { type: "string", description: "Short phase label." }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.init({
          cwd: resolveCwd(args, exec),
          title: args.title,
          verifyHint: args.verifyHint,
          phase: args.phase
        }, writerFrom(exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_get",
    description: "Return the full structured long-horizon status for the current (or named) cwd.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cwd: { type: "string", description: "Absolute project cwd (defaults to session cwd)." }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.get(resolveCwd(args, exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_next",
    description: "Replace the Next list (hard cap 3 items). Refused when Long horizon is OFF.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["next"],
      properties: {
        cwd: { type: "string" },
        next: {
          type: "array",
          description: "0\u20133 next work items.",
          items: { type: "string" }
        }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setNext(resolveCwd(args, exec), args.next ?? [], writerFrom(exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_inflight",
    description: "Set the single in-flight work slice. ALWAYS pass summary (non-empty string). To clear, use status_clear_inflight instead. Never call with empty args. Do not write STATUS.md or .dsh temps by hand.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["summary"],
      properties: {
        cwd: { type: "string" },
        summary: {
          type: "string",
          minLength: 1,
          description: "Non-empty in-flight work summary."
        }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        const summary = typeof args.summary === "string" ? args.summary.trim() : "";
        if (!summary) {
          throw new ValidationError(
            "status_set_inflight requires a non-empty summary; use status_clear_inflight to clear"
          );
        }
        return await service.setInflight(
          resolveCwd(args, exec),
          summary,
          writerFrom(exec)
        );
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_clear_inflight",
    description: "Clear the in-flight slice. No arguments required besides optional cwd.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cwd: { type: "string" }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setInflight(
          resolveCwd(args, exec),
          null,
          writerFrom(exec)
        );
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_phase",
    description: "Set the short phase label.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["phase"],
      properties: {
        cwd: { type: "string" },
        phase: { type: "string" }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setPhase(resolveCwd(args, exec), args.phase, writerFrom(exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_mark_done",
    description: "Append a done item. Prefer including verify evidence (warn-only if missing in v0).",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["summary"],
      properties: {
        cwd: { type: "string" },
        summary: {
          type: "string",
          minLength: 1,
          description: "Non-empty done summary."
        },
        verify: { type: "string", description: "How this was verified." },
        rotateNext: { type: "boolean", description: "If true and next[0] matches summary, drop it." }
      }
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => {
        const text = v._warn ? `WARN: ${v._warn}
${JSON.stringify(v, null, 2)}` : JSON.stringify(v, null, 2);
        return [{ type: "text", text }];
      }
    },
    async execute(args, exec) {
      try {
        const { record, warn } = await service.markDone(
          resolveCwd(args, exec),
          args.summary,
          args.verify,
          Boolean(args.rotateNext),
          writerFrom(exec)
        );
        const out = JSON.parse(JSON.stringify(record));
        if (warn) out._warn = warn;
        return out;
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_block",
    description: "Mark the task blocked with a reason.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["reason"],
      properties: {
        cwd: { type: "string" },
        reason: {
          type: "string",
          minLength: 1,
          description: "Non-empty blocked reason."
        }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.block(resolveCwd(args, exec), args.reason, writerFrom(exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_unblock",
    description: "Clear the blocked state.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cwd: { type: "string" }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.unblock(resolveCwd(args, exec), writerFrom(exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_enabled",
    description: "Turn Long horizon ON or OFF for this project (OFF refuses mutations and freezes inject).",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["enabled"],
      properties: {
        cwd: { type: "string" },
        enabled: { type: "boolean" }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setEnabled(resolveCwd(args, exec), Boolean(args.enabled), writerFrom(exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  return () => {
    for (const d of disposers.reverse()) d();
  };
}

// src/host/index.ts
var name = "dsh-local-long-horizon";
var inject = ["tools"];
function readBody(req) {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve2(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function registerRoute(ctx, service) {
  const unregister = ctx.webServer.register({
    kind: "exact",
    path: ROUTE,
    handler: (req, res) => {
      void (async () => {
        try {
          const host = req.headers.host ?? "127.0.0.1";
          const url = new URL(req.url ?? ROUTE, `http://${host}`);
          if (req.method === "GET") {
            const cwd = url.searchParams.get("cwd");
            const sessionId = url.searchParams.get("sessionId");
            const snap = await service.snapshot(cwd, { sessionId });
            res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
            res.end(JSON.stringify(snap));
            return;
          }
          if (req.method === "POST") {
            const raw = await readBody(req);
            let body;
            try {
              body = JSON.parse(raw || "{}");
            } catch {
              res.writeHead(400, { "content-type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: "invalid JSON body" }));
              return;
            }
            const cwd = body.cwd?.trim();
            const writer = body.sessionId?.trim() ? { sessionId: body.sessionId.trim() } : void 0;
            if (!cwd) {
              res.writeHead(400, { "content-type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: "cwd required" }));
              return;
            }
            if (body.action === "init") {
              const record = await service.init({ cwd }, writer);
              res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
              res.end(JSON.stringify({ ok: true, record }));
              return;
            }
            if (typeof body.enabled === "boolean") {
              const snap = await service.snapshot(cwd, { sessionId: writer?.sessionId });
              if (!snap.ok) {
                res.writeHead(500, { "content-type": "application/json" });
                res.end(JSON.stringify(snap));
                return;
              }
              if (!snap.initialized) {
                if (!body.enabled) {
                  res.writeHead(400, { "content-type": "application/json" });
                  res.end(JSON.stringify({ ok: false, error: "not initialized" }));
                  return;
                }
                await service.init({ cwd }, writer);
              }
              const record = await service.setEnabled(cwd, body.enabled, writer);
              res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
              res.end(JSON.stringify({ ok: true, record }));
              return;
            }
            res.writeHead(400, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: 'expected { cwd, enabled } or { cwd, action: "init" }' }));
            return;
          }
          res.writeHead(405, { "content-type": "application/json", allow: "GET, POST" });
          res.end(JSON.stringify({ error: "method not allowed; use GET or POST" }));
        } catch (err) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: String(err) }));
        }
      })();
    }
  });
  ctx.effect(() => unregister, "long-horizon: route");
}
function apply(ctx) {
  const service = new TaskStatusService();
  const disposeTools = registerTools(ctx, service);
  ctx.effect(() => disposeTools, "long-horizon: tools");
  ctx.inject(["webServer"], (webCtx) => {
    registerRoute(webCtx, service);
  });
}
export {
  ROUTE,
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
