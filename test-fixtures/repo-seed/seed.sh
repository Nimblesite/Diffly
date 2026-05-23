#!/usr/bin/env bash
# Builds a deterministic git repo at <this-dir>/workspace for E2E tests.
# Re-run this script to rebuild; it nukes the existing workspace first.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HERE/workspace"

rm -rf "$WORKSPACE"
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

export GIT_AUTHOR_NAME="Test Author"
export GIT_AUTHOR_EMAIL="test@example.com"
export GIT_COMMITTER_NAME="Test Committer"
export GIT_COMMITTER_EMAIL="committer@example.com"
export GIT_AUTHOR_DATE="2024-01-01T00:00:00Z"
export GIT_COMMITTER_DATE="2024-01-01T00:00:00Z"

git init -q -b main

# --- commit 1: initial layout -----------------------------------------------
mkdir -p dir
printf 'a.txt v1\nsecond line v1\n' > a.txt
printf 'b.txt v1\n'                 > b.txt
printf 'c.txt v1\nsecond v1\n'       > dir/c.txt
printf 'd.txt v1\n'                 > d.txt
git add .
GIT_AUTHOR_DATE="2024-01-01T00:00:00Z" \
GIT_COMMITTER_DATE="2024-01-01T00:00:00Z" \
git commit -q -m "first: add a, b, dir/c, d"

# --- commit 2: edit a.txt, edit dir/c.txt, delete d.txt ----------------------
printf 'a.txt v2 edited\nsecond line v1\nthird line added\n' > a.txt
printf 'c.txt v2 edited\nsecond v1\n'                         > dir/c.txt
git rm -q d.txt
git add a.txt dir/c.txt
GIT_AUTHOR_DATE="2024-01-02T00:00:00Z" \
GIT_COMMITTER_DATE="2024-01-02T00:00:00Z" \
git commit -q -m "second: edit a and c, delete d"

# --- commit 3: rename b.txt -> b2.txt (with a small edit) -------------------
git mv b.txt b2.txt
printf 'b.txt v1\nrenamed and extended\n' > b2.txt
git add b2.txt
GIT_AUTHOR_DATE="2024-01-03T00:00:00Z" \
GIT_COMMITTER_DATE="2024-01-03T00:00:00Z" \
git commit -q -m "third: rename b -> b2 and extend"

# Tag commit 2 so RefPicker has at least one tag to pick from
git tag v0.1.0 HEAD~1

# Leave a working-copy edit on a.txt so 'compare with Working Copy' has content
printf 'a.txt v2 edited\nsecond line v1\nthird line added\nworking copy uncommitted\n' > a.txt

echo "Seeded $WORKSPACE"
git -C "$WORKSPACE" --no-pager log --oneline
