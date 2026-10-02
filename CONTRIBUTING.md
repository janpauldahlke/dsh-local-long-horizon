# Contributing

Thanks for poking at this. It is a small dual-face DeepSeek Harness plugin
(host vault + agent tools + web client pane). Keep changes focused.

## Setup

```sh
git clone https://github.com/janpauldahlke/dsh-local-long-horizon.git
cd dsh-local-long-horizon
npm install
npm test                 # build + node suite
dsh plugin --profile web add "$PWD"
# restart dsh web; hard-refresh the browser
```

Paste the README `AGENTS.md` snippet into a toy project so the local agent
actually reads `.dsh/task-status-inject.md`.

## Layout

| Path | Role |
| --- | --- |
| `src/host/` | Cordis plugin, vault, tools, inject + `STATUS.md`, `/api/dsh-local-long-horizon` |
| `src/client/` | Rightbar **Long horizon** pane + composer dock chip (inline styles only) |
| `src/shared/` | Vault / snapshot types shared by both faces |
| `scripts/test/` | Node suite (`npm test`) — no GPU required |
| `build.mjs` | esbuild → `lib/index.js` + `lib/client.js` (+ `lib/testables.mjs`) |
| `cordis.patch.yml` | Loader row (`name` must match `package.json`) |
| `media/` | README screenshots |

Client runtime may only `require` frozen DSH platform modules (react, cordis,
store, ui slots/primitives/dockkit). Everything else is bundled.

## Rules of the road

1. **Vault owns truth.** Tools mutate JSON; `STATUS.md` and the inject file are
   one-way projections. Never teach agents to hand-edit those as source of truth.
2. **Honesty over polish.** OFF refuses mutations; corrupt / wrong-shape vaults
   error loudly; Next hard-cap is 3; empty `summary` / `reason` are rejected.
3. **Rebuild after edits:** `npm run build` (or `npm test`). Commit updated
   `lib/` when behavior changes so install-without-toolchain keeps working.
4. **No secrets** in screenshots, logs, or commits. Prefer short paths in docs;
   never paste API keys. Local `ENV.md` / `agent/` stay gitignored.
5. **`AGENTS.md` is the inject glue.** DSH already injects project `AGENTS.md`;
   this plugin hooks that seam via the tiny `.dsh/task-status-inject.md` file.
   Document any change to that contract in the README.

## Verify locally

```sh
npm test
dsh --profile web --dump-config | grep dsh-local-long-horizon
# with dsh web up + plugin loaded:
# curl -sG http://127.0.0.1:3080/api/dsh-local-long-horizon --data-urlencode "cwd=/abs/path"
# open Long horizon rightbar; close it and confirm the dock chip under chat
```

## Pull requests

- One concern per PR (host / client / docs / tests).
- Say what you ran (`npm test`, tool story, pane glance).
- Match existing style: small files, typed records, inline client styles.
- Bump `package.json` `version` only when we intentionally cut a release.

## Out of scope (for now)

- Hard-reject `mark_done` without verify (v0 warns only)
- Multi-writer locks / cloud sync
- Editing Next 3 from the pane UI
- DeepSeek Harness core PRs — this stays an out-of-tree plugin

Questions or smoke reports: open a GitHub issue.
