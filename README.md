# dsh-local-long-horizon

Installable [DeepSeek Harness](https://github.com/deepseek-ai) (`dsh`) plugin: Host-owned long-horizon task status for local coding agents.

**Status:** scaffolding — plugin source lands in follow-up commits.

## Intent (v0)

- Structured task status on disk (JSON source of truth)
- Agent tools that enforce Next ≤ 3 and honest done/verify
- Tiny auto-inject file + project `AGENTS.md` seam
- Projected `STATUS.md` (same fields as the pane)
- Rightbar pane: long-horizon ON/OFF, done / next / in-flight / blocked

Pin: `dsh` **0.1.6-alpha.2**. Out-of-tree `dsh.bundle` only.

## Install (when packaged)

```sh
dsh plugin --profile web add /abs/path/to/dsh-local-long-horizon
```

More install / tool / UI docs will land with the first working build.
