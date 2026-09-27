// src/host/index.ts
import { defineTool } from "@deepseek-ai/dsh-tools";

// src/host/route.ts
var ROUTE = "/api/dsh-local-long-horizon";

// src/host/index.ts
var name = "dsh-local-long-horizon";
var inject = ["webServer", "tools"];
function apply(ctx) {
  const unregister = ctx.webServer.register({
    kind: "exact",
    path: ROUTE,
    handler: (req, res) => {
      if (req.method !== "GET") {
        res.writeHead(405, { "content-type": "application/json", allow: "GET" });
        res.end(JSON.stringify({ error: "method not allowed; use GET" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({
        ok: true,
        package: "dsh-local-long-horizon",
        milestone: "M1",
        enabled: false,
        message: "stub \u2014 vault lands in M2",
        sampledAt: Date.now()
      }));
    }
  });
  ctx.effect(() => unregister, "long-horizon: /api/dsh-local-long-horizon route");
  const disposePing = ctx.tools.register(defineTool({
    name: "status_ping",
    description: "M1 probe: returns ok from dsh-local-long-horizon host module.",
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
      render: (_args, value) => [{
        type: "text",
        text: JSON.stringify(value)
      }]
    },
    async execute() {
      return {
        ok: true,
        package: "dsh-local-long-horizon",
        at: Date.now()
      };
    }
  }));
  ctx.effect(() => disposePing, "long-horizon: status_ping tool");
}
export {
  ROUTE,
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
