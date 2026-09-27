// src/host/index.ts
import { URL } from "node:url";

// src/host/route.ts
var ROUTE = "/api/dsh-local-long-horizon";

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
var TaskStatusService = class {
  storageRoot;
  constructor(opts = {}) {
    this.storageRoot = opts.storageRoot ?? defaultStorageRoot();
  }
  pathFor(cwd) {
    return vaultPath(this.storageRoot, taskIdFromCwd(normalizeCwd(cwd)));
  }
  async snapshot(cwd) {
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
      return {
        ok: true,
        package: PACKAGE_NAME,
        enabled: record.enabled,
        initialized: true,
        record,
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
  async init(args) {
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
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async get(cwd) {
    return this.requireRecord(cwd);
  }
  async setEnabled(cwd, enabled) {
    const record = await this.requireRecord(cwd);
    record.enabled = enabled;
    record.updatedAt = Date.now();
    if (!enabled) {
      await this.persist(record, { writeInject: "disabled", writeMd: true });
    } else {
      await this.persist(record, { writeInject: true, writeMd: true });
    }
    return record;
  }
  async setNext(cwd, next) {
    assertNext(next);
    const record = await this.requireEnabled(cwd);
    record.next = next.map((s) => s.trim());
    record.updatedAt = Date.now();
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async setInflight(cwd, summary) {
    const record = await this.requireEnabled(cwd);
    if (summary === null || summary.trim() === "") {
      record.inFlight = null;
    } else {
      record.inFlight = { summary: summary.trim(), since: Date.now() };
    }
    record.updatedAt = Date.now();
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async setPhase(cwd, phase) {
    const record = await this.requireEnabled(cwd);
    record.phase = phase.trim() || record.phase;
    record.updatedAt = Date.now();
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async markDone(cwd, summary, verify, rotateNext = false) {
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
    await this.persist(record, { writeInject: true, writeMd: true });
    return { record, warn };
  }
  async block(cwd, reason) {
    const record = await this.requireEnabled(cwd);
    record.blocked = { reason: reason.trim(), since: Date.now() };
    record.updatedAt = Date.now();
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async unblock(cwd) {
    const record = await this.requireEnabled(cwd);
    record.blocked = null;
    record.updatedAt = Date.now();
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  async setNotes(cwd, notes) {
    const record = await this.requireEnabled(cwd);
    record.notes = capNotes(notes);
    record.updatedAt = Date.now();
    await this.persist(record, { writeInject: true, writeMd: true });
    return record;
  }
  recentDone(record) {
    return record.done.slice(-MAX_DONE_RECENT).reverse();
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

// src/host/tools.ts
function resolveCwd(args, exec) {
  const fromArg = args.cwd?.trim();
  if (fromArg) return fromArg;
  const fromAgent = exec.agent?.session?.header?.cwd?.trim();
  if (fromAgent) return fromAgent;
  throw new Error("cwd required (pass cwd or run from an agent session with a workspace cwd)");
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
    next: { type: "array", items: { type: "string" } }
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
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          package: { type: "string", required: true },
          at: { type: "integer", required: true }
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
      cwd: { type: "string", description: "Absolute project cwd (defaults to session cwd)." },
      title: { type: "string", description: "Short task title." },
      verifyHint: { type: "string", description: "How to verify done items." },
      phase: { type: "string", description: "Short phase label." }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.init({
          cwd: resolveCwd(args, exec),
          title: args.title,
          verifyHint: args.verifyHint,
          phase: args.phase
        });
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_get",
    description: "Return the full structured long-horizon status for the current (or named) cwd.",
    parameters: {
      cwd: { type: "string", description: "Absolute project cwd (defaults to session cwd)." }
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
      cwd: { type: "string" },
      next: {
        type: "array",
        required: true,
        description: "0\u20133 next work items.",
        items: { type: "string" }
      }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setNext(resolveCwd(args, exec), args.next ?? []);
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_inflight",
    description: "Set or clear the single in-flight slice. Pass empty summary to clear.",
    parameters: {
      cwd: { type: "string" },
      summary: { type: "string", description: "In-flight summary, or empty to clear." }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        const summary = args.summary?.trim() ? args.summary : null;
        return await service.setInflight(resolveCwd(args, exec), summary);
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_phase",
    description: "Set the short phase label.",
    parameters: {
      cwd: { type: "string" },
      phase: { type: "string", required: true }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setPhase(resolveCwd(args, exec), args.phase);
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_mark_done",
    description: "Append a done item. Prefer including verify evidence (warn-only if missing in v0).",
    parameters: {
      cwd: { type: "string" },
      summary: { type: "string", required: true },
      verify: { type: "string", description: "How this was verified." },
      rotateNext: { type: "boolean", description: "If true and next[0] matches summary, drop it." }
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
          Boolean(args.rotateNext)
        );
        if (warn) record._warn = warn;
        return record;
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_block",
    description: "Mark the task blocked with a reason.",
    parameters: {
      cwd: { type: "string" },
      reason: { type: "string", required: true }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.block(resolveCwd(args, exec), args.reason);
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_unblock",
    description: "Clear the blocked state.",
    parameters: {
      cwd: { type: "string" }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.unblock(resolveCwd(args, exec));
      } catch (err) {
        toolError(err);
      }
    }
  }));
  disposers.push(tools.register({
    name: "status_set_enabled",
    description: "Turn Long horizon ON or OFF for this project (OFF refuses mutations and freezes inject).",
    parameters: {
      cwd: { type: "string" },
      enabled: { type: "boolean", required: true }
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args, exec) {
      try {
        return await service.setEnabled(resolveCwd(args, exec), Boolean(args.enabled));
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
            const snap = await service.snapshot(cwd);
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
            if (!cwd) {
              res.writeHead(400, { "content-type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: "cwd required" }));
              return;
            }
            if (body.action === "init") {
              const record = await service.init({ cwd });
              res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
              res.end(JSON.stringify({ ok: true, record }));
              return;
            }
            if (typeof body.enabled === "boolean") {
              const snap = await service.snapshot(cwd);
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
                await service.init({ cwd });
              }
              const record = await service.setEnabled(cwd, body.enabled);
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
