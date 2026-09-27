window.__ModuleLoader__.load({ id: "dsh-local-long-horizon", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/LongHorizonBody.tsx
var import_react2 = require("react");

// src/client/useLongHorizon.ts
var import_react = require("react");

// src/client/store.ts
var snapshot = null;
var error = null;
var refs = 0;
var timer;
var cwd = "";
var listeners = /* @__PURE__ */ new Set();
var POLL_MS = 1e3;
function emit() {
  for (const l of listeners) l();
}
async function tick() {
  if (!cwd) {
    snapshot = {
      ok: true,
      package: "dsh-local-long-horizon",
      enabled: false,
      initialized: false,
      cwd: null,
      message: "No folder yet \u2014 open a workspace in this chat, or paste a path.",
      sampledAt: Date.now()
    };
    error = null;
    emit();
    return;
  }
  try {
    const res = await fetch(`/api/dsh-local-long-horizon?cwd=${encodeURIComponent(cwd)}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    snapshot = await res.json();
    error = null;
  } catch (err) {
    error = String(err);
  }
  emit();
}
function setTrackedCwd(next) {
  if (next === cwd) return;
  cwd = next;
  void tick();
}
function getTrackedCwd() {
  return cwd;
}
function subscribe(listener) {
  listeners.add(listener);
  refs += 1;
  if (refs === 1) {
    void tick();
    timer = setInterval(() => {
      void tick();
    }, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    refs -= 1;
    if (refs === 0 && timer !== void 0) {
      clearInterval(timer);
      timer = void 0;
    }
  };
}
function getSnapshot() {
  return snapshot;
}
function getError() {
  return error;
}
async function postToggle(enabled) {
  if (!cwd) throw new Error("no cwd");
  const res = await fetch("/api/dsh-local-long-horizon", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cwd, enabled })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  await tick();
}
async function postInit() {
  if (!cwd) throw new Error("no cwd");
  const res = await fetch("/api/dsh-local-long-horizon", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cwd, action: "init" })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  await tick();
}

// src/client/useLongHorizon.ts
function detectCwdFallback() {
  try {
    const w = window;
    if (typeof w.__DSH_CWD__ === "string" && w.__DSH_CWD__) return w.__DSH_CWD__;
    if (typeof w.__dsh?.cwd === "string" && w.__dsh.cwd) return w.__dsh.cwd;
  } catch {
  }
  return getTrackedCwd();
}
function useLongHorizon(sessionCwd) {
  const [, bump] = (0, import_react.useReducer)((n) => n + 1, 0);
  const lastAuto = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    return subscribe(() => bump());
  }, []);
  (0, import_react.useEffect)(() => {
    const fromSession = typeof sessionCwd === "string" && sessionCwd.trim() ? sessionCwd.trim() : null;
    const next = fromSession ?? detectCwdFallback();
    if (!next) return;
    if (fromSession && fromSession === lastAuto.current && getTrackedCwd() === fromSession) return;
    if (fromSession) lastAuto.current = fromSession;
    setTrackedCwd(next);
  }, [sessionCwd]);
  return {
    snapshot: getSnapshot(),
    error: getError(),
    cwd: getTrackedCwd(),
    sessionCwd: typeof sessionCwd === "string" && sessionCwd.trim() ? sessionCwd.trim() : null
  };
}

// src/client/paneState.ts
var openCount = 0;
var listeners2 = /* @__PURE__ */ new Set();
function setPaneOpen(open) {
  const next = open ? openCount + 1 : Math.max(0, openCount - 1);
  if (next === openCount) return;
  openCount = next;
  for (const listener of [...listeners2]) listener();
}
function isPaneOpen() {
  return openCount > 0;
}
function subscribePaneOpen(listener) {
  listeners2.add(listener);
  return () => {
    listeners2.delete(listener);
  };
}

// src/client/LongHorizonBody.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
function useNoopSessions(selector) {
  return selector({ byId: {} });
}
var container = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.5,
  color: "inherit"
};
var card = {
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "color-mix(in srgb, currentColor 4%, transparent)"
};
var muted = {
  color: "color-mix(in srgb, currentColor 55%, transparent)",
  fontSize: 12,
  fontFamily: MONO,
  margin: 0
};
var hairline = {
  borderTop: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
  margin: "6px 0"
};
var btn = {
  fontSize: 12,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
  background: "color-mix(in srgb, currentColor 8%, transparent)",
  color: "inherit",
  cursor: "pointer",
  whiteSpace: "nowrap"
};
function ageLabel(at) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1e3));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
function basename(path) {
  const parts = path.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || path;
}
function RecordView({ record }) {
  const recent = record.done.slice(-5).reverse();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    record.blocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        style: {
          ...card,
          borderColor: "color-mix(in srgb, #f87171 50%, transparent)"
        },
        children: [
          "\u26A0 Blocked: ",
          record.blocked.reason
        ]
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: "Now" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "In flight: ",
        record.inFlight?.summary ?? "\u2014"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: hairline }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: "Next 3" }),
      record.next.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: muted, children: "\u2014" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { style: { margin: 0, paddingLeft: 18 }, children: record.next.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: n }, n)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: "Done (recent)" }),
      recent.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: muted, children: "(none)" }) : recent.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 4 }, children: [
        "\u2713 ",
        d.summary,
        d.verify ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: muted, children: [
          " \xB7 verify: ",
          d.verify
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: muted, children: [
          " \xB7 ",
          ageLabel(d.at)
        ] })
      ] }, d.id))
    ] })
  ] });
}
function LongHorizonBody(props = {}) {
  const { sessionId, useSessions = useNoopSessions } = props;
  const sessionCwd = useSessions((sessions) => {
    if (!sessionId) return null;
    const cwd3 = sessions.byId[sessionId]?.cwd;
    return typeof cwd3 === "string" && cwd3.trim() ? cwd3.trim() : null;
  });
  const { snapshot: snapshot2, error: error2, cwd: cwd2 } = useLongHorizon(sessionCwd);
  const [cwdDraft, setCwdDraft] = (0, import_react2.useState)(cwd2);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [localErr, setLocalErr] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    setPaneOpen(true);
    return () => setPaneOpen(false);
  }, []);
  (0, import_react2.useEffect)(() => {
    if (cwd2) setCwdDraft(cwd2);
  }, [cwd2]);
  const initialized = snapshot2?.ok === true && snapshot2.initialized;
  const enabled = initialized ? snapshot2.enabled : false;
  const record = initialized ? snapshot2.record : null;
  const hasDraft = Boolean(cwdDraft.trim());
  const followingSession = Boolean(sessionCwd && cwd2 && sessionCwd === cwd2);
  async function onToggle() {
    setBusy(true);
    setLocalErr(null);
    try {
      await postToggle(!enabled);
    } catch (err) {
      setLocalErr(String(err));
    } finally {
      setBusy(false);
    }
  }
  async function onInit() {
    setBusy(true);
    setLocalErr(null);
    try {
      const next = cwdDraft.trim();
      if (next) setTrackedCwd(next);
      await postInit();
    } catch (err) {
      setLocalErr(String(err));
    } finally {
      setBusy(false);
    }
  }
  function onTrackFolder() {
    const next = cwdDraft.trim();
    if (!next) return;
    setTrackedCwd(next);
  }
  const modeLabel = !initialized ? "Off" : enabled ? "Active" : "Paused";
  const modeColor = !initialized ? "#8b93a7" : enabled ? "#22c55e" : "#fbbf24";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: container, children: [
    record ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "span",
                {
                  style: { fontWeight: 600 },
                  title: enabled ? "Long horizon is ON \u2014 agent status_* tools may update this board." : "Long horizon is OFF \u2014 board is read-only; mutating tools refuse.",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "span",
                      {
                        style: {
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          marginRight: 6,
                          background: modeColor
                        }
                      }
                    ),
                    modeLabel
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  disabled: busy,
                  onClick: () => {
                    void onToggle();
                  },
                  title: enabled ? "Turn Long horizon OFF for this folder (tools stop mutating; board stays visible)." : "Turn Long horizon ON so the agent can update Next / Done for this folder.",
                  style: { ...btn, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 },
                  children: enabled ? "Turn off" : "Turn on"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...muted, marginBottom: 2 }, children: [
          record.phase,
          " \xB7 ",
          basename(record.cwd),
          " \xB7 ",
          ageLabel(record.updatedAt)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: muted, title: record.cwd, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 600, fontFamily: "inherit", color: "inherit" }, children: basename(record.cwd) }),
          " \xB7 ",
          record.cwd
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordView, { record })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      !record ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              style: {
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                marginRight: 6,
                background: modeColor
              }
            }
          ),
          modeLabel
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, marginBottom: 6 }, children: followingSession ? "Following this chat\u2019s workspace folder." : "Open a workspace in this chat (or paste a path), then start Long horizon." })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...muted, marginBottom: 6, fontFamily: "inherit" }, children: followingSession ? "Workspace folder (auto)" : "Switch folder" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6, marginBottom: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            value: cwdDraft,
            onChange: (e) => setCwdDraft(e.target.value),
            placeholder: "Project folder (absolute path)",
            title: "Usually filled from the open workspace. Paste another absolute path only to override.",
            "aria-label": "Project folder",
            style: {
              flex: 1,
              fontSize: 11,
              fontFamily: MONO,
              padding: "4px 6px",
              borderRadius: 4,
              border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
              background: "transparent",
              color: "inherit"
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: onTrackFolder,
            disabled: !hasDraft,
            title: "Poll this folder\u2019s vault (override). Does not create a vault.",
            style: { ...btn, fontSize: 11, opacity: hasDraft ? 1 : 0.5, cursor: hasDraft ? "pointer" : "not-allowed" },
            children: "Track folder"
          }
        )
      ] }),
      !cwd2 && !record ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...muted, fontFamily: "inherit", marginBottom: 6 }, children: "No folder yet \u2014 open a workspace in this chat, or paste a path." }) : null,
      sessionCwd && cwd2 && sessionCwd !== cwd2 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => {
            setCwdDraft(sessionCwd);
            setTrackedCwd(sessionCwd);
          },
          title: "Reset to the workspace folder of the active chat.",
          style: { ...btn, fontSize: 11, marginBottom: 6 },
          children: "Use chat workspace"
        }
      ) : null,
      snapshot2?.ok === true && !snapshot2.initialized && hasDraft ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, marginBottom: 6 }, children: "Start tracking so the agent can keep Next / Done in sync." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            disabled: busy || !hasDraft,
            onClick: () => {
              void onInit();
            },
            title: "Create the Long horizon vault for this folder, turn it ON, and write STATUS.md.",
            style: { ...btn, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 },
            children: "Start tracking this folder"
          }
        )
      ] }) : null,
      error2 || localErr ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#f87171", fontSize: 12, marginTop: 6 }, children: error2 || localErr }) : null
    ] }),
    snapshot2?.ok === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      "Route error: ",
      snapshot2.error
    ] }) : null
  ] });
}

// src/client/LongHorizonDockChip.tsx
var import_react3 = require("react");

// src/client/chipState.ts
var GREY = "#8b93a7";
var GREEN = "#22c55e";
var AMBER = "#fbbf24";
var RED = "#ef4444";
function trunc(s, max = 22) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}\u2026`;
}
function deriveChip(snapshot2, error2) {
  if (error2) {
    return {
      dot: RED,
      label: "Horizon \xB7 error",
      title: `Long horizon route error
${error2}`,
      dim: false
    };
  }
  if (!snapshot2) {
    return {
      dot: GREY,
      label: "Horizon \xB7 \u2026",
      title: "Long horizon \u2014 waiting for first sample",
      dim: true
    };
  }
  if (!snapshot2.ok) {
    return {
      dot: RED,
      label: "Horizon \xB7 error",
      title: `Long horizon route error
${snapshot2.error}`,
      dim: false
    };
  }
  if (!snapshot2.initialized) {
    const cwd2 = snapshot2.cwd;
    return {
      dot: GREY,
      label: "Horizon \xB7 off",
      title: cwd2 ? `Long horizon not started for
${cwd2}
Open the pane \u2192 Start tracking this folder` : "Long horizon \u2014 open a workspace in this chat to track it",
      dim: true
    };
  }
  const r = snapshot2.record;
  const base = `${r.phase} \xB7 ${r.cwd}
Updated ${Math.max(0, Math.round((Date.now() - r.updatedAt) / 1e3))}s ago`;
  if (r.blocked) {
    return {
      dot: RED,
      label: "Horizon \xB7 blocked",
      title: `${base}
Blocked: ${r.blocked.reason}`,
      dim: false
    };
  }
  if (!r.enabled) {
    return {
      dot: AMBER,
      label: "Horizon \xB7 paused",
      title: `${base}
Long horizon is OFF (board still readable)`,
      dim: false
    };
  }
  if (r.inFlight?.summary) {
    const s = trunc(r.inFlight.summary, 18);
    return {
      dot: GREEN,
      label: `Horizon \xB7 ${s}`,
      title: `${base}
In flight: ${r.inFlight.summary}${r.next[0] ? `
Next: ${r.next.join(" \xB7 ")}` : ""}`,
      dim: false
    };
  }
  if (r.next.length > 0) {
    const s = trunc(r.next[0], 16);
    return {
      dot: GREEN,
      label: `Horizon \xB7 next: ${s}`,
      title: `${base}
Next: ${r.next.join(" \xB7 ")}`,
      dim: false
    };
  }
  const last = r.done[r.done.length - 1];
  if (last) {
    return {
      dot: GREEN,
      label: "Horizon \xB7 clear",
      title: `${base}
Last done: ${last.summary}
No in-flight / next items`,
      dim: false
    };
  }
  return {
    dot: GREEN,
    label: "Horizon \xB7 on",
    title: `${base}
Active \u2014 no items yet`,
    dim: false
  };
}

// src/client/LongHorizonDockChip.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function useNoopSessions2(selector) {
  return selector({ byId: {} });
}
function LongHorizonDockChip(props) {
  const { onOpen, sessionId, useSessions = useNoopSessions2 } = props;
  const sessionCwd = useSessions((sessions) => {
    if (!sessionId) return null;
    const cwd2 = sessions.byId[sessionId]?.cwd;
    return typeof cwd2 === "string" && cwd2.trim() ? cwd2.trim() : null;
  });
  const { snapshot: snapshot2, error: error2 } = useLongHorizon(sessionCwd);
  const [paneOpen, setPaneOpenState] = (0, import_react3.useState)(isPaneOpen);
  (0, import_react3.useEffect)(() => subscribePaneOpen(() => setPaneOpenState(isPaneOpen())), []);
  if (paneOpen) return null;
  const display = deriveChip(snapshot2, error2);
  const glowing = !display.dim && display.dot !== "#8b93a7";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "button",
    {
      type: "button",
      onClick: onOpen,
      title: display.title,
      "aria-label": `Long horizon: ${display.label}`,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        padding: "1px 8px",
        borderRadius: 999,
        border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
        background: "color-mix(in srgb, currentColor 6%, transparent)",
        color: "inherit",
        fontVariantNumeric: "tabular-nums",
        cursor: "pointer",
        opacity: display.dim ? 0.55 : 1,
        transition: "opacity 200ms"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "span",
          {
            "aria-hidden": true,
            style: {
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: display.dot,
              display: "inline-block",
              boxShadow: glowing ? `0 0 5px ${display.dot}` : "none",
              flexShrink: 0
            }
          }
        ),
        display.label
      ]
    }
  );
}

// src/client/LongHorizonIcon.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function LongHorizonGuideIcon({ size = 26, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: size, height: size, className, viewBox: "0 0 28 28", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "path",
      {
        d: "M4 18.5 H24",
        stroke: "currentColor",
        strokeWidth: "1.75",
        strokeLinecap: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "path",
      {
        d: "M9 18.5 A5 5 0 0 1 19 18.5",
        stroke: "currentColor",
        strokeWidth: "1.75",
        strokeLinecap: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "path",
      {
        d: "M14 8.5 V11.2 M8.2 11.5 L10 13.2 M19.8 11.5 L18 13.2",
        stroke: "currentColor",
        strokeWidth: "1.75",
        strokeLinecap: "round"
      }
    )
  ] });
}

// src/client/LongHorizonTitle.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function useNoopSessions3(selector) {
  return selector({ byId: {} });
}
function LongHorizonTitle(props = {}) {
  const { sessionId, useSessions = useNoopSessions3 } = props;
  const sessionCwd = useSessions((sessions) => {
    if (!sessionId) return null;
    const cwd2 = sessions.byId[sessionId]?.cwd;
    return typeof cwd2 === "string" && cwd2.trim() ? cwd2.trim() : null;
  });
  const { snapshot: snapshot2, error: error2 } = useLongHorizon(sessionCwd);
  let color = "#8b93a7";
  if (error2 || snapshot2 && !snapshot2.ok) color = "#ef4444";
  else if (snapshot2?.ok && snapshot2.initialized && snapshot2.enabled) color = "#22c55e";
  else if (snapshot2?.ok && snapshot2.initialized) color = "#fbbf24";
  const tip = error2 || snapshot2 && !snapshot2.ok ? "Long horizon route error" : snapshot2?.ok && snapshot2.initialized && snapshot2.enabled ? "Long horizon ON \u2014 agent is writing Next / Done" : snapshot2?.ok && snapshot2.initialized ? "Long horizon OFF \u2014 board is read-only" : sessionCwd ? `Following workspace ${sessionCwd}` : "Long horizon \u2014 open a workspace in this chat to track it";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "span",
    {
      title: tip,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "span",
          {
            style: {
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              display: "inline-block"
            }
          }
        ),
        "Long horizon"
      ]
    }
  );
}

// src/client/index.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var TAB_ID = "dsh-local-long-horizon";
var TAB_KIND = "local-long-horizon";
var inject = ["slots", "sidebarRight", "sidebarRightTabs"];
function apply(ctx) {
  const definition = {
    id: TAB_ID,
    kind: TAB_KIND,
    title: () => "Long horizon",
    guide: [{
      id: "local-long-horizon",
      order: 250,
      title: () => "Long horizon",
      description: () => "Task status for long-running local agent work (Next 3, inflight, blocked)",
      icon: LongHorizonGuideIcon
    }]
  };
  const disposeType = ctx.sidebarRightTabs.register(definition);
  const disposeBody = ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register(
    { name: "sidebar.right.pane.tab", key: TAB_ID },
    LongHorizonBody
  ));
  const disposeTitle = ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register(
    { name: "sidebar.right.pane.tab.title", key: TAB_ID },
    LongHorizonTitle
  ));
  const LongHorizonDockSeat = (props) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    LongHorizonDockChip,
    {
      sessionId: typeof props.sessionId === "string" ? props.sessionId : void 0,
      useSessions: typeof props.useSessions === "function" ? props.useSessions : void 0,
      onOpen: () => ctx.sidebarRight.openTab(TAB_KIND)
    }
  );
  const disposeDock = ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register(
    { name: "conversation.composer.dock", id: "local-long-horizon", order: -9 },
    LongHorizonDockSeat
  ));
  ctx.effect(() => () => {
    disposeDock();
    disposeTitle();
    disposeBody();
    disposeType();
  }, "long-horizon: rightbar tab type");
}
return module.exports; } });
//# sourceMappingURL=client.js.map
