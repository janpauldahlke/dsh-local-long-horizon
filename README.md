# dsh-local-long-horizon

Installable [DeepSeek Harness](https://github.com/deepseek-ai) (`dsh`) plugin: **Host-owned** long-horizon task status for local coding agents.

**Pin:** `dsh` **0.1.6-alpha.2** · package `dsh-local-long-horizon`

## Install

```sh
npm install && npm run build
dsh plugin --profile web add /abs/path/to/dsh-local-long-horizon
# restart or boot:
env -u DSH_WEB_URL -u DSH_SHELL -u DSH_SESSION_ID dsh web --port 3090 --no-open
```

No harness `file:` deps — host registers tools on the live `ctx.tools` service (already provided by dsh).

Uninstall: `dsh plugin --profile web remove dsh-local-long-horizon` (or remove from profile bundles) and restart the **acceptance** instance.

## What you get

| Surface | Path / name |
| --- | --- |
| Vault (source of truth) | `~/.dsh/storages/dsh-local-long-horizon/<taskId>.json` |
| Inject (≤~50 tokens) | `<cwd>/.dsh/task-status-inject.md` |
| Markdown projection | `<cwd>/STATUS.md` (**overwritten** on every mutation — one-way) |
| HTTP | `GET/POST /api/dsh-local-long-horizon` |
| Rightbar | **Long horizon** — Active ON/OFF, phase, Next 3, inflight, blocked, recent done |

## Agent tools

`status_init` · `status_get` · `status_set_next` · `status_set_inflight` · `status_set_phase` · `status_mark_done` · `status_block` / `status_unblock` · `status_set_enabled` · `status_ping`

- Next list hard-capped at **3**.
- When **OFF**, mutating tools refuse; inject freezes to a DISABLED line; `status_get` still works.
- `status_mark_done` without `verify` **warns** in v0 (not a hard reject).

## Recommended `AGENTS.md` snippet (project root)

```markdown
## Long horizon
Before coding, read `.dsh/task-status-inject.md` if present — it is binding current task state.
Use status_* tools to update Next (≤3), in-flight, done (with verify), and blocked.
Do not invent a parallel STATUS novel; the vault owns truth and STATUS.md is generated.
```

## UI

Open the **Long horizon** rightbar tab. Bind an absolute project `cwd`, **Init**, then use **ON/OFF**. CSS chrome matches slot-health / gpu-monitor (inline `currentColor` cards).

## Limitations

- Last-writer-wins; no distributed lock.
- Pane cwd bind is manual if the shell does not expose cwd to the client.
- Out of tree only — no harness core patches.
