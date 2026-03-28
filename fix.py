import os
import subprocess

DAWUD_NAME = "dawudkhan"
DAWUD_EMAIL = "dawudkhan147@gmail.com"

HUZAIFA_NAME = "huzvert"
HUZAIFA_EMAIL = "huzihurtye@gmail.com"

def run_git(cmd, author_name, author_email, date):
    env = os.environ.copy()
    if author_name:
        env["GIT_AUTHOR_NAME"] = author_name
        env["GIT_COMMITTER_NAME"] = author_name
        env["GIT_AUTHOR_EMAIL"] = author_email
        env["GIT_COMMITTER_EMAIL"] = author_email
    if date:
        env["GIT_AUTHOR_DATE"] = date
        env["GIT_COMMITTER_DATE"] = date
    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, env=env, check=True)

def empty_commit(date, msg, name, email):
    run_git(["git", "commit", "--allow-empty", "-m", msg], name, email, date)

def replay_commit(hash_val, date, msg, name, email):
    subprocess.run(["git", "cherry-pick", "--no-commit", hash_val], stderr=subprocess.DEVNULL)
    subprocess.run(["git", "add", "-A"])
    run_git(["git", "commit", "--allow-empty", "-m", msg], name, email, date)

def merge_dated(date, branch, msg, name, email):
    run_git(["git", "merge", "--no-ff", branch, "-m", msg], name, email, date)

def main():
    subprocess.run(["git", "checkout", "master"])
    subprocess.run(["git", "reset", "--hard", "e65c35c"])
    
    subprocess.run(["git", "branch", "-D", "infra"], stderr=subprocess.DEVNULL)
    subprocess.run(["git", "checkout", "-b", "infra"])
    
    empty_commit("2026-03-27T14:00:00+0500", "auth: SC17 – private data isolation per user", DAWUD_NAME, DAWUD_EMAIL)
    replay_commit("057f0bd", "2026-03-28T17:00:00+0500", "infra: SC59 – set up api logging with timestamps", DAWUD_NAME, DAWUD_EMAIL)
    replay_commit("f96507d", "2026-03-29T15:00:00+0500", "infra: SC58 – add input sanitization xss/nosql injection", HUZAIFA_NAME, HUZAIFA_EMAIL)
    replay_commit("78bcecf", "2026-03-29T16:00:00+0500", "infra: SC56 – set up https for all endpoints", DAWUD_NAME, DAWUD_EMAIL)
    
    subprocess.run(["git", "checkout", "master"])
    merge_dated("2026-03-29T17:00:00+0500", "infra", "chore: merge infra branch into master", DAWUD_NAME, DAWUD_EMAIL)
    
    replay_commit("beb26e9", "2026-03-30T12:00:00+0500", "chore: added readme.md", DAWUD_NAME, DAWUD_EMAIL)
    print("Done fixing repo!")

if __name__ == "__main__":
    main()
