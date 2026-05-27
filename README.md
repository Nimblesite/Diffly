# Diffy

Pick two things and diff them — context-menu git diffing in VSCode.

Diffy adds **no panels, no sidebars, no activity-bar icons**. Every feature hangs off the menus VSCode already has (SCM history, SCM changes, editor tab, file explorer) and a handful of palette commands. Pick a commit on the left, pick anything (another commit, a branch/tag, the index, the working copy) on the right, then drill through changed files with a QuickPick that stays open for as long as you need it.

---

## How to access every command

There are **seven** commands. Three are reachable from the Command Palette, four are reachable only from a right-click menu (because they need a target — a commit, a file — that the menu provides).

### From the SCM **History view** (right-click a commit)

Open the **Source Control** view (Ctrl/Cmd+Shift+G), expand a repository's **History** section, and **right-click any commit**. Three Diffy entries appear:

| Menu label                           | Command ID                     | What it does                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Diffy: Compare with…**             | `diffy.compareWith`            | The right-clicked commit is Side A. A QuickPick asks what Side B is: **Working Copy**, **Index**, **Pick a commit…**, or **Pick a branch or tag…**. Then a file QuickPick lists every changed file; selecting one opens `vscode.diff`. The picker stays open so you can open many files in a row. |
| **Diffy: Compare with Working Copy** | `diffy.compareWithWorkingCopy` | Same as above, but Side B is hardcoded to your on-disk working copy. Skips the Side B prompt.                                                                                                                                                                                                     |
| **Diffy: Compare with Previous**     | `diffy.compareWithPrevious`    | Side A is the right-clicked commit, Side B is its first parent (`<sha>^1`). Use this for a classic "what changed in this commit?" view.                                                                                                                                                           |

> These three are intentionally **hidden from the Command Palette** — they only make sense when invoked against a specific commit, which the right-click target provides.

### From the SCM **Changes** view (right-click a changed file)

In the Source Control view, **right-click any file** under **Changes**, **Staged Changes**, or **Merge Changes**:

| Menu label                      | Command ID                    | What it does                                                                                                      |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Diffy: Compare with Commit…** | `diffy.compareFileWithCommit` | Pick a commit from a log QuickPick. Opens a single-file diff: that file at the chosen commit ↔ your working copy. |

### From the **editor tab title** (right-click the file's tab)

**Right-click the tab** of any open text file:

| Menu label                      | Command ID                    | What it does                                                               |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| **Diffy: Compare with Commit…** | `diffy.compareFileWithCommit` | Same as above, but the target file is the one whose tab you right-clicked. |

### From the **File Explorer** (right-click a file in the tree)

**Right-click any file** (not a folder) in the Explorer:

| Menu label                      | Command ID                    | What it does                                                 |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| **Diffy: Compare with Commit…** | `diffy.compareFileWithCommit` | Same again — the target is the file you clicked in the tree. |

### From the **Command Palette** (Ctrl/Cmd+Shift+P)

Type `Diffy:` to filter. Three entries are listed:

| Palette label                     | Command ID                    | What it does                                                                                                                                                         |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Diffy: Compare Two Commits**    | `diffy.compareTwoCommits`     | No target needed. QuickPick chain: pick repo → pick Side A commit → pick Side B (working copy / index / commit / ref) → pick files.                                  |
| **Diffy: Compare with Commit…**   | `diffy.compareFileWithCommit` | Uses the **currently focused editor's file** as the target. Same flow as the right-click version. If no editor is focused, Diffy will tell you to open a file first. |
| **Diffy: Reopen Last Comparison** | `diffy.reopenLast`            | Reopens the file picker for the last A↔B comparison you made (stored per-workspace). Handy after closing the picker mid-review.                                      |

> **`Diffy: Show Logs`** (`diffy.showLogs`) exists but is hidden from the palette; it's reserved for the extension to surface its OutputChannel programmatically. Open it manually via **View → Output → "Diffy"**.

---

## Quick visual reference

```
Source Control (Ctrl/Cmd+Shift+G)
└── History
    └── <right-click a commit>
        ├── Diffy: Compare with…              ← pick anything for Side B
        ├── Diffy: Compare with Working Copy  ← Side B = on-disk
        └── Diffy: Compare with Previous      ← Side B = parent commit

Source Control → Changes / Staged Changes
└── <right-click a file>
    └── Diffy: Compare with Commit…           ← pick commit; diff vs working copy

Editor tab (right-click)         ──┐
File Explorer (right-click file) ──┼──► Diffy: Compare with Commit…
                                   └──   (uses that file as the target)

Command Palette (Ctrl/Cmd+Shift+P)
├── Diffy: Compare Two Commits
├── Diffy: Compare with Commit…              ← uses focused editor's file
└── Diffy: Reopen Last Comparison
```

---

## What Side B can be

Whenever Diffy asks you to pick Side B, you get four choices:

- **Working Copy** — the on-disk files in the repo (uncommitted changes included).
- **Index** — the staging area (what `git diff --cached` would compare against).
- **Pick a commit…** — choose from a QuickPick of recent log entries.
- **Pick a branch or tag…** — choose from all refs; resolved to its tip commit.

## Diff titles

Tabs that Diffy opens are titled human-first, e.g. `a1b2c3d ↔ Working Copy — src/foo.ts` or `a1b2c3d ↔ 9f8e7d6 — src/foo.ts`. No internal labels, no debug strings.

## Requirements

- VSCode `^1.85.0`
- Node `>=20` (for local development)
- Git on `PATH`
- The built-in **Git** extension (Diffy depends on it via `extensionDependencies`)

## Development

Standard make targets:

```sh
make setup     # install deps
make build     # tsc
make test      # fail-fast unit + e2e, enforces coverage threshold
make lint
make fmt
make ci        # what CI runs
make package   # build .vsix
```

See [CLAUDE.md](CLAUDE.md) for the full architecture and contributor rules.

## License

MIT
