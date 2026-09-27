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

// src/client/StubBody.tsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  opacity: 0.65,
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
};
function StubBody() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: container, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, marginBottom: 4 }, children: "Long horizon" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: muted, children: "M1 stub \u2014 vault / tools / pane land M2\u2013M5" })
  ] }) });
}

// src/client/StubTitle.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function StubTitle() {
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
              background: "#8b93a7",
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
    StubBody
  ));
  const disposeTitle = ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register(
    { name: "sidebar.right.pane.tab.title", key: TAB_ID },
    StubTitle
  ));
  ctx.effect(() => () => {
    disposeTitle();
    disposeBody();
    disposeType();
  }, "long-horizon: rightbar tab type");
}
return module.exports; } });
//# sourceMappingURL=client.js.map
