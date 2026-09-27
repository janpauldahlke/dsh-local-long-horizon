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
      message: "Set a project cwd to track (open a workspace session).",
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
function detectCwd() {
  try {
    const w = window;
    if (typeof w.__DSH_CWD__ === "string" && w.__DSH_CWD__) return w.__DSH_CWD__;
    if (typeof w.__dsh?.cwd === "string" && w.__dsh.cwd) return w.__dsh.cwd;
  } catch {
  }
  return getTrackedCwd();
}
function useLongHorizon() {
  const [, bump] = (0, import_react.useReducer)((n) => n + 1, 0);
  (0, import_react.useEffect)(() => {
    const detected = detectCwd();
    if (detected) setTrackedCwd(detected);
    return subscribe(() => bump());
  }, []);
  return {
    snapshot: getSnapshot(),
    error: getError(),
    cwd: getTrackedCwd()
  };
}

// src/client/LongHorizonBody.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
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
function ageLabel(at) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1e3));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
function RecordView({ record }) {
  const recent = record.done.slice(-5).reverse();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...muted, marginBottom: 4 }, children: [
      record.phase,
      " \xB7 ",
      record.cwd.split("/").pop(),
      " \xB7 ",
      ageLabel(record.updatedAt)
    ] }),
    record.blocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        style: {
          ...card,
          borderColor: "color-mix(in srgb, #f87171 50%, transparent)",
          marginBottom: 8
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
function LongHorizonBody() {
  const { snapshot: snapshot2, error: error2, cwd: cwd2 } = useLongHorizon();
  const [cwdDraft, setCwdDraft] = (0, import_react2.useState)(cwd2);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [localErr, setLocalErr] = (0, import_react2.useState)(null);
  const enabled = snapshot2?.ok === true && snapshot2.initialized ? snapshot2.enabled : false;
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
      if (cwdDraft.trim()) setTrackedCwd(cwdDraft.trim());
      await postInit();
    } catch (err) {
      setLocalErr(String(err));
    } finally {
      setBusy(false);
    }
  }
  function onBindCwd() {
    if (cwdDraft.trim()) setTrackedCwd(cwdDraft.trim());
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: container, children: [
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
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 600 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "span",
                {
                  style: {
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    marginRight: 6,
                    background: enabled ? "#22c55e" : "#8b93a7"
                  }
                }
              ),
              enabled ? "Active" : "Off"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                disabled: busy || !(snapshot2?.ok && snapshot2.initialized),
                onClick: () => {
                  void onToggle();
                },
                style: {
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
                  background: "color-mix(in srgb, currentColor 8%, transparent)",
                  color: "inherit",
                  cursor: busy ? "wait" : "pointer",
                  opacity: snapshot2?.ok && snapshot2.initialized ? 1 : 0.5
                },
                children: enabled ? "ON" : "OFF"
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6, marginBottom: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            value: cwdDraft,
            onChange: (e) => setCwdDraft(e.target.value),
            placeholder: "/abs/project/cwd",
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onBindCwd, style: { fontSize: 11, padding: "4px 8px" }, children: "Bind" })
      ] }),
      error2 || localErr ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#f87171", fontSize: 12 }, children: error2 || localErr }) : null
    ] }),
    snapshot2?.ok === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      "Route error: ",
      snapshot2.error
    ] }) : null,
    snapshot2?.ok === true && !snapshot2.initialized ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: 8 }, children: snapshot2.message }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || !cwdDraft.trim(), onClick: () => {
        void onInit();
      }, children: "Init this project\u2026" })
    ] }) : null,
    snapshot2?.ok === true && snapshot2.initialized ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordView, { record: snapshot2.record }) : null
  ] });
}

// src/client/LongHorizonTitle.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function LongHorizonTitle() {
  const { snapshot: snapshot2, error: error2 } = useLongHorizon();
  let color = "#8b93a7";
  if (error2 || snapshot2 && !snapshot2.ok) color = "#ef4444";
  else if (snapshot2?.ok && snapshot2.initialized && snapshot2.enabled) color = "#22c55e";
  else if (snapshot2?.ok && snapshot2.initialized) color = "#fbbf24";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "span",
    {
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
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
var TAB_ID = "dsh-local-long-horizon";
var inject = ["slots", "sidebarRight", "sidebarRightTabs"];
function apply(ctx) {
  const definition = {
    id: TAB_ID,
    kind: "local-long-horizon",
    title: () => "Long horizon",
    guide: [{
      id: "local-long-horizon",
      order: 250,
      title: () => "Long horizon",
      description: () => "Task status for long-running local agent work (Next 3, inflight, blocked)"
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
  ctx.effect(() => () => {
    disposeTitle();
    disposeBody();
    disposeType();
  }, "long-horizon: rightbar tab type");
}
return module.exports; } });
//# sourceMappingURL=client.js.map
