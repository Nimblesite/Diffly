# Diffy

**Pick two things and diff them.** Context-menu git diffing for VS Code — no panels, no sidebars, no activity-bar icons. Just the menus that are already there.

> Right-click a commit. Pick what to compare it against (another commit, a branch, a tag, the index, the working copy). Walk through the changed files in a QuickPick that stays open. That's the whole product.

---

## Install

- **VS Code**: search _Diffy_ in the Extensions view, or
- **Command line**: `code --install-extension nimblesite.diffy`
- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=nimblesite.diffy

Diffy depends on the built-in **Git** extension and needs `git` on `PATH`.

---

## Why Diffy?

VS Code's built-in "Open Changes" only diffs a file against its parent commit. To compare _anything else_ — a commit against a branch tip, your working copy against three commits back, a single file across two arbitrary refs — you end up in `git diff` on the terminal or installing a heavy "git client" extension.

Diffy fills exactly that gap with the smallest possible surface area:

- **No new UI.** Every entry point hangs off menus VS Code already shows (SCM history, SCM resource state, editor tab, file explorer) plus a few palette commands.
- **No custom renderer.** Diffs open in `vscode.diff` — the same native diff editor as everything else.
- **One QuickPick per flow.** Browsing many changed files is a list, not a panel. The picker stays open after each diff so you can fly through a review.
- **Pure shells out to `git`.** No libgit2, no native binaries, no surprises about what's being compared.

---

## At a glance

```
Source Control (Ctrl/Cmd+Shift+G)
└── History
    └── <right-click a commit>
        ├── Diffy: Compare with…              ← pick anything for Side B
        ├── Diffy: Compare with Working Copy  ← Side B = on-disk
        └── Diffy: Compare with Previous      ← Side B = parent commit

Source Control → Changes / Staged Changes / Merge Changes
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

Diff tabs are titled human-first, e.g. `a1b2c3d ↔ Working Copy — src/foo.ts` or `a1b2c3d ↔ 9f8e7d6 — src/foo.ts`. No internal labels, no debug strings.

---

## Every command

There are **seven** commands. Three are reachable from the Command Palette; four are reachable only from a right-click menu (they need a target — a commit, a file — that the menu provides).

### From the SCM **History view** (right-click a commit)

Open **Source Control** (Ctrl/Cmd+Shift+G), expand a repository's **History** section, and right-click any commit:

| Menu label                           | Command ID                     | What it does                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Diffy: Compare with…**             | `diffy.compareWith`            | The right-clicked commit is Side A. A QuickPick asks what Side B is: **Working Copy**, **Index**, **Pick a commit…**, or **Pick a branch or tag…**. Then a file QuickPick lists every changed file; selecting one opens `vscode.diff`. The picker stays open so you can open many files in a row. |
| **Diffy: Compare with Working Copy** | `diffy.compareWithWorkingCopy` | Same as above, but Side B is hardcoded to your on-disk working copy. Skips the Side B prompt.                                                                                                                                                                                                     |
| **Diffy: Compare with Previous**     | `diffy.compareWithPrevious`    | Side A is the right-clicked commit, Side B is its first parent (`<sha>^1`). Classic "what changed in this commit?" view.                                                                                                                                                                          |

> These three are intentionally **hidden from the Command Palette** — they only make sense when invoked against a specific commit, which the right-click target provides.

### From the SCM **Changes** view (right-click a changed file)

Right-click any file under **Changes**, **Staged Changes**, or **Merge Changes**:

| Menu label                      | Command ID                    | What it does                                                                                                      |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Diffy: Compare with Commit…** | `diffy.compareFileWithCommit` | Pick a commit from a log QuickPick. Opens a single-file diff: that file at the chosen commit ↔ your working copy. |

### From the **editor tab title** (right-click the file's tab)

| Menu label                      | Command ID                    | What it does                                                               |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| **Diffy: Compare with Commit…** | `diffy.compareFileWithCommit` | Same as above; the target is the file whose tab you right-clicked. |

### From the **File Explorer** (right-click a file)

| Menu label                      | Command ID                    | What it does                                                 |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| **Diffy: Compare with Commit…** | `diffy.compareFileWithCommit` | Same again — the target is the file you clicked in the tree. |

### From the **Command Palette** (Ctrl/Cmd+Shift+P)

Type `Diffy:` to filter. Three entries appear:

| Palette label                     | Command ID                    | What it does                                                                                                                                                         |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Diffy: Compare Two Commits**    | `diffy.compareTwoCommits`     | No target needed. QuickPick chain: pick repo → pick Side A commit → pick Side B (working copy / index / commit / ref) → pick files.                                  |
| **Diffy: Compare with Commit…**   | `diffy.compareFileWithCommit` | Uses the **currently focused editor's file** as the target. Same flow as the right-click version. If no editor is focused, Diffy will tell you to open a file first. |
| **Diffy: Reopen Last Comparison** | `diffy.reopenLast`            | Reopens the file picker for the last A↔B comparison you made (stored per-workspace). Handy after closing the picker mid-review.                                      |

> **`Diffy: Show Logs`** (`diffy.showLogs`) exists but is hidden from the palette — it's reserved for the extension to surface its OutputChannel programmatically. Open it manually via **View → Output → "Diffy"**.

---

## What Side B can be

Whenever Diffy asks you to pick Side B, you get four choices:

- **Working Copy** — the on-disk files in the repo (uncommitted changes included).
- **Index** — the staging area (what `git diff --cached` would compare against).
- **Pick a commit…** — choose from a QuickPick of recent log entries.
- **Pick a branch or tag…** — choose from all refs; resolved to its tip commit.

---

## Requirements

- VS Code **^1.85.0**
- **Git** on `PATH`
- The built-in **Git** extension (Diffy depends on it via `extensionDependencies`)

## Troubleshooting

- **"No git repository found"** — Diffy uses the built-in Git extension's repo list. If VS Code doesn't see your repo, neither will Diffy. Open the Source Control view and confirm the repo appears there.
- **Diffy menus don't appear in the SCM History view** — make sure the workspace has commits and that you're right-clicking inside the **History** section (not Changes).
- **Anything else** — `View → Output → "Diffy"` shows structured logs for every operation. Or run **Diffy: Show Logs** to focus the channel.

## Issues & contributions

Bugs, feature requests, and PRs welcome at https://github.com/MelbourneDeveloper/Diffy/issues.

## Development

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
