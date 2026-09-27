# `dsh-local-long-horizon`

Installable [DeepSeek Harness](https://github.com/deepseek-ai) (`dsh`) plugin: Host-owned long-horizon task status for local coding agents.

**Pin:** `dsh` **0.1.6-alpha.2** · package name `dsh-local-long-horizon`

## Install

```sh
# from a checkout that can resolve @deepseek-ai/dsh-tools (see below)
npm install && npm run build
dsh plugin --profile web add /abs/path/to/dsh-local-long-horizon
```

Acceptance smoke: `dsh web --port 3090 --no-open` then `dsh --profile web --dump-config` should list `dsh-local-long-horizon`.

## Local harness deps

This package imports `@deepseek-ai/dsh-tools` at runtime (tool registration). `package.json` points it at a sibling `../deepseek-harness` checkout via `file:`. Without that resolution the host row fails to import.

## Status (build)

| Milestone | State |
| --- | --- |
| M0/M1 skeleton | Host + stub rightbar + `status_ping` + stub `GET /api/dsh-local-long-horizon` |
| M2+ | Vault, mutators, inject, pane — see `agent/PLAN.md` (local) |

## Intent (v0)

- Structured task status on disk (JSON source of truth)
- Agent tools that enforce Next ≤ 3 and honest done/verify
- Tiny auto-inject file + project `AGENTS.md` seam
- Projected `STATUS.md` (same fields as the pane)
- Rightbar pane: long-horizon ON/OFF, done / next / in-flight / blocked
