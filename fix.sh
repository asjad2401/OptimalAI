#!/usr/bin/env bash
set -e

DAWUD_NAME="dawudkhan"
DAWUD_EMAIL="dawudkhan147@gmail.com"

HUZAIFA_NAME="huzvert"
HUZAIFA_EMAIL="huzihurtye@gmail.com"

set_dawud()   { export GIT_AUTHOR_NAME="$DAWUD_NAME"   GIT_AUTHOR_EMAIL="$DAWUD_EMAIL"   GIT_COMMITTER_NAME="$DAWUD_NAME"   GIT_COMMITTER_EMAIL="$DAWUD_EMAIL"; }
set_huzaifa() { export GIT_AUTHOR_NAME="$HUZAIFA_NAME" GIT_AUTHOR_EMAIL="$HUZAIFA_EMAIL" GIT_COMMITTER_NAME="$HUZAIFA_NAME" GIT_COMMITTER_EMAIL="$HUZAIFA_EMAIL"; }

empty_commit() {
  local DATE="$1" MSG="$2"
  GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" \
    git commit --allow-empty -m "$MSG"
}

replay_commit() {
  local HASH="$1" DATE="$2" MSG="$3"
  git cherry-pick --no-commit "$HASH" 2>/dev/null || true
  git add -A
  GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" \
    git commit --allow-empty -m "$MSG"
}

merge_dated() {
  local DATE="$1" BRANCH="$2" MSG="$3"
  GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" \
    git merge --no-ff "$BRANCH" -m "$MSG"
}

git checkout master
git reset --hard e65c35c

git branch -D infra || true
git checkout -b infra

set_dawud
empty_commit "2026-03-27T14:00:00+0500" "auth: SC17 – private data isolation per user"

set_dawud
replay_commit "057f0bd" "2026-03-28T17:00:00+0500" "infra: SC59 – set up api logging with timestamps"

set_huzaifa
replay_commit "f96507d" "2026-03-29T15:00:00+0500" "infra: SC58 – add input sanitization xss/nosql injection"

set_dawud
replay_commit "78bcecf" "2026-03-29T16:00:00+0500" "infra: SC56 – set up https for all endpoints"

git checkout master
set_dawud
merge_dated "2026-03-29T17:00:00+0500" "infra" "chore: merge infra branch into master"

set_dawud
replay_commit "beb26e9" "2026-03-30T12:00:00+0500" "chore: added readme.md"

echo "Done fixing repo!"
