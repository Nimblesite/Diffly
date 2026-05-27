# Diffy — Agent Instructions

<!-- agent-pmo:74cf183 -->

⚠️ KILLING A VSCODE PROCESS — EVEN IN THE BROWSER — WILL BE MET WITH INSTANT, EXTREME VIOLENCE!

> ⚠️ **TOKEN DISCIPLINE.** Check file size first. `Grep` over `Read`. Use `offset`/`limit`.
> Smallest diff that solves the problem. Delete dead code, unused imports, stale comments.
> Call out irrelevant context before proceeding. Bloat degrades reasoning. ⚠️

> ⚠️ **CRITICAL: THIS CODEBASE RECEIVES A GRADE OF A+.** WE DON'T ALLOW BAD CODE. NOT EVEN FOR ONE LINE. CODE MUST PASS REVIEW AT Google / Meta / Microsoft. ANYTHING LESS IS ⛔️ ILLEGAL AND MUST BE FIXED IMMEDIATELY.

⚠️ **NEW VIEWS, ACTIVITY-BAR ICONS, SIDEBARS, TREE PROVIDERS, OR WEBVIEWS ARE ⛔️ ILLEGAL.**
Diffy is **context-menu only**. Every feature hangs off VSCode's existing SCM history, SCM resource state, editor title, and explorer menus — plus a small set of palette commands. If a feature needs a new panel to exist, the feature is wrong.

Full design + execution plan: [spec.md](spec.md).

## Project Overview

**Diffy** is a VSCode extension that does exactly one thing: **pick two things and diff them** against a git repository. Side A is a commit; Side B is another commit, the working copy, the index, or a branch/tag (resolved to a commit). It shells out to `git`, hands two URIs to VSCode's built-in `vscode.diff`, and uses a multi-step QuickPick for browsing many changed files. No custom renderer, no custom view.

**Primary language:** TypeScript (pure — Rust LSP was considered and rejected; LSP is for _language_ semantics, not diffing)
**Build command:** `make ci`
**Test command:** `make test`
**Lint command:** `make lint`

There are 7 standard make targets: `build`, `test`, `lint`, `fmt`, `clean`, `ci`, `setup`. Repo-specific targets sit below a horizontal marker. `make package` builds the VSIX. `make test` runs fail-fast, collects coverage, asserts measured ≥ threshold from `coverage-thresholds.json`, and exits non-zero on any failure.

## Architecture (one-line per layer)

```
context-menu / palette command
  → ui/* QuickPick (CommitPicker | SideBPicker | RefPicker | FilePicker)
  → git/GitRepo  → git/GitRunner (subprocess)
  → providers/DiffyContentProvider (TextDocumentContentProvider for diffy://)
  → vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title)
```

- **`src/git/`** — pure logic. No `vscode` imports. Subprocess wrapper + NUL-delimited porcelain parsers. Trivially portable to IntelliJ/Kotlin if anyone ever wants that.
- **`src/providers/DiffyContentProvider.ts`** — `TextDocumentContentProvider` for scheme `diffy`. URI parse + GitRepo call. Pure dispatch.
- **`src/ui/`** — `vscode.window.createQuickPick<T>()` wrappers. Each returns `Result<T, Cancelled>`. FilePicker stays open after selection (`ignoreFocusOut: true`) so a single comparison drives many diffs.
- **`src/commands/`** — one file per command. Glue only; logic lives in `git/` and `ui/`.
- **`src/extension.ts`** — activate/deactivate; command + provider registration ONLY. No business logic.
- **Global state** lives in exactly one file: `src/state.ts` (Memento wrapper for last comparison). Nothing escapes it.

## Hard Rules (no exceptions, NON-NEGOTIABLE)

- **NO git commands from the agent.** No `git add`, `commit`, `push`, `checkout`, `merge`, `rebase`. CI and GitHub Actions handle git. (Diffy itself shells out to `git` at runtime — that's the product. The _agent_ doesn't drive git in the dev loop.)
- **NO new views, sidebars, activity-bar icons, tree providers, or webviews.** Context menus + palette commands only. Browsing many files is a QuickPick, not a panel.
- **NO THROWING EXCEPTIONS for control flow.** Return `Result<T,E>` via a discriminated union. Panics are bugs.
- **NO REGEX on structured data.** Git porcelain output is parsed via NUL-delimited splits (`-z` flag everywhere). Never regex over JSON, YAML, source code, or git output.
- **NO PLACEHOLDERS.** If something isn't implemented, leave a loud compilation error with TODO. Silent no-ops = ⛔️ ILLEGAL.
- **Functions < 20 lines.** Refactor aggressively.
- **Files < 450 lines.** Extract modules when over.
- **ZERO DUPLICATION.** Search before writing. Move code, don't copy. Diffy detects diffs — its own codebase must be exemplary.
- **TypeScript strict mode.** `tsconfig.json` has `"strict": true`. No `any`. No `!` (non-null assertion) — use optional chaining or explicit guards. No `// @ts-ignore` / `@ts-nocheck`. No `as Type` casts without a comment explaining safety. All function params and return types annotated.
- **No suppressing linter warnings.** Fix the code, not the linter.
- **Decouple providers from the VSCode SDK.** `src/git/` and `src/ui/uri.ts` have ZERO `vscode` imports. SDK-bound modules are thin shells around pure logic.
- **No string literals.** Named constants only, all in `src/constants.ts`.
- **Named parameters** for functions with 3+ args.
- **No commented-out code.** Delete it.
- **No legacy code.** Legacy = deleted.
- **Copying files is illegal.** MOVE them.
- **Centralize global state** in `src/state.ts`.

## Logging Standards

- **`pino` only.** Never `console.log` for diagnostics.
- **Log at entry/exit of significant operations.** Levels: `error|warn|info|debug|trace`.
- **Structured fields, not string interpolation.** `logger.info({ rev, path }, 'show')` — never format strings.
- Write detailed logs to a file in the extension's state folder. Basic errors AND diagnostics MUST also appear in the extension's VSCode Output Channel so users can see them without hunting for files.
- **NEVER log file contents, repo paths containing user data, commit messages, branch names, or secrets.** Log SHAs (already opaque) and counts.

## Testing Rules

- **Testing any UI/Extension with a fake VSCode = ⛔️ ILLEGAL.** Tests run in actual VSCode via `@vscode/test-electron`.
- **`make test` is FAIL-FAST.** Stops at first failure. Never `--no-fail-fast`.
- **`make test` ALWAYS computes coverage AND enforces it.** Threshold lives in `coverage-thresholds.json` at the repo root — NOT env vars, NOT GH repo variables, NOT CI YAML. Below threshold = pipeline fails. Ratchet only.
- **Aim for 100% coverage.** LOTS OF ASSERTIONS PER TEST.
- **Never delete a failing test. Never skip a test.** Never remove assertions. Reducing assertiveness = ⛔️ ILLEGAL.
- **Meaningful assertions only.** `assert.ok(true)` is illegal.
- **No try/catch in tests that swallows errors and asserts success.**
- **Deterministic.** No `sleep`, no timing dependencies, no random state.
- **E2E tests: black-box only.** Drive the extension through `vscode.commands.executeCommand`, real VSCode UI surfaces, and assertions against `vscode.window.tabGroups.all`. Never call provider methods directly. Never call `provider.refresh()`. Never reach into internal state. Never invoke commands that should only fire from user gestures.
- **NEVER KILL VSCODE PROCESSES.**
- Separate E2E (`src/test/suite/`) from unit (`src/test/unit/`) by directory.
- Unit tests = no VSCode instance needed = isolation only (parsers, URI codec, Result combinators).
- Tests must prove **user interactions** work end-to-end.
- E2E tests should bundle **many user interactions and loads of assertions** per file — prefer extending an existing test over adding a new one.
- **FAILING TEST = OK. TEST THAT DOESN'T ENFORCE BEHAVIOR = ⛔️ ILLEGAL.**

### Test-First Process

1. Write a test that fails because of the bug / missing feature.
2. Run tests; verify the failure is for that reason.
3. Adjust until the failure mode matches.
4. Implement the fix / feature.
5. Run tests; verify the test passes without modification.

### Assertion style (human-readable)

Do not write assertions that guard against AI / taxonomy strings. Assert on **positive, human-readable values** that the user would actually see.

⛔️ BAD

```typescript
assert.doesNotMatch(label, /\[diffy-internal-tag\]/);
```

✅ GOOD

```typescript
const tabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
const diffTab = tabs.find((t) => t.input instanceof vscode.TabInputTextDiff);
assert.ok(diffTab, "a diff tab opened");
assert.match(diffTab.label, /a1b2c3 ↔ Working Copy/);
```

## Human vs. AI Readability

Two audiences. Write for the right one.

- **Code comments:** humans first, AI second. Only when the WHY is non-obvious.
- **UI (QuickPick labels, diff titles, OutputChannel):** humans. Always. Include a "Copy Context For AI" menu item where context-sharing is genuinely useful.
- **Diff titles** must be human-scannable: `${shortShaA} ↔ ${shortShaB} — ${basename}` or `${shortSha} ↔ Working Copy — ${basename}`. No internal labels, no enum names, no debug strings.

## Repo Structure

```
Diffy/
├── .github/workflows/{ci.yml, release.yml}
├── .vscode-test.mjs
├── Makefile                       # 7 standard targets + `package`
├── package.json                   # extension manifest
├── tsconfig.json                  # strict: true
├── eslint.config.mjs
├── .prettierrc.json
├── coverage-thresholds.json       # single source of truth for coverage
├── cspell.json
├── icon.png
├── README.md
├── CHANGELOG.md
├── CLAUDE.md                      # this file
├── spec.md                        # full design + execution plan
├── src/
│   ├── extension.ts               # activate/deactivate; registration ONLY
│   ├── constants.ts               # command IDs, scheme name, context keys
│   ├── result.ts                  # Result<T,E>
│   ├── logger.ts                  # pino + OutputChannel sink
│   ├── state.ts                   # Memento wrapper (single global-state file)
│   ├── git/                       # ZERO vscode imports
│   │   ├── GitRunner.ts
│   │   ├── GitRepo.ts
│   │   ├── parsers.ts             # NUL-delimited porcelain parsers
│   │   └── types.ts
│   ├── providers/
│   │   └── DiffyContentProvider.ts
│   ├── ui/
│   │   ├── CommitPicker.ts
│   │   ├── RefPicker.ts
│   │   ├── SideBPicker.ts
│   │   ├── FilePicker.ts
│   │   └── uri.ts                 # pure; ZERO vscode imports
│   ├── commands/
│   │   ├── compareWith.ts
│   │   ├── compareWithWorkingCopy.ts
│   │   ├── compareWithPrevious.ts
│   │   ├── compareTwoCommits.ts
│   │   ├── compareFileWithCommit.ts
│   │   └── reopenLast.ts
│   └── test/
│       ├── unit/                  # mocha, no VSCode
│       └── suite/                 # @vscode/test-electron, black-box only
└── test-fixtures/
    └── repo-seed/                 # script-built throwaway git repo for E2E
```

## Too Many Cooks (Multi-Agent Coordination)

If the TMC server is available: register on start (name, intent, files), lock files before editing, broadcast your plan and message others frequently, check messages periodically, release locks when done. Never edit a locked file — wait or take another approach.

## VSCode SDK References

- [VSCode Extension API](https://code.visualstudio.com/api/)
- [VSCode Extension Testing API](https://code.visualstudio.com/api/extension-guides/testing)
- [Built-in `vscode.diff` command](https://code.visualstudio.com/api/references/commands)
- [Git Extension API (`vscode.git`)](https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts)
