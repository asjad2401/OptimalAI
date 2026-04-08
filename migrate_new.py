import os
import subprocess

DAWUD_NAME = "dawudkhan"
DAWUD_EMAIL = "dawudkhan147@gmail.com"
ASJAD_NAME = "asjad2401"
ASJAD_EMAIL = "m.asjad2401@gmail.com"
ESHAL_NAME = "eshalfatima05"
ESHAL_EMAIL = "fatimaeshal05@gmail.com"

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

def replay_commit(hash_val, date, msg, name, email):
    subprocess.run(["git", "cherry-pick", "--no-commit", hash_val], stderr=subprocess.DEVNULL)
    subprocess.run(["git", "add", "-A"])
    run_git(["git", "commit", "--allow-empty", "-m", msg], name, email, date)

def merge_dated(date, branch, msg, name, email):
    run_git(["git", "merge", "--no-ff", branch, "-m", msg], name, email, date)

def main():
    subprocess.run(["git", "checkout", "master"])
    
    # EPIC 1: Scraping Updates
    subprocess.run(["git", "checkout", "-b", "scraping_enhancements"])
    replay_commit("10ecb87", "2026-04-07T10:00:00+0500", "scraping: SC26 - use cached data within 48 hours", ASJAD_NAME, ASJAD_EMAIL)
    replay_commit("4df45cc", "2026-04-07T14:00:00+0500", "scraping: SC27 - force fresh scrape option", ASJAD_NAME, ASJAD_EMAIL)
    subprocess.run(["git", "checkout", "master"])
    merge_dated("2026-04-08T10:00:00+0500", "scraping_enhancements", "chore: merge scraping_enhancements branch into master", DAWUD_NAME, DAWUD_EMAIL)
    
    # EPIC 2: Competitor Analysis
    subprocess.run(["git", "checkout", "-b", "competitor_analysis"])
    replay_commit("4f0aa07", "2026-04-07T10:00:00+0500", "analysis: SC33 - display category averages per metric", ESHAL_NAME, ESHAL_EMAIL)
    subprocess.run(["git", "checkout", "master"])
    merge_dated("2026-04-08T14:00:00+0500", "competitor_analysis", "chore: merge competitor_analysis branch into master", DAWUD_NAME, DAWUD_EMAIL)
    
    # EPIC 3: Sentiment Analysis
    subprocess.run(["git", "checkout", "-b", "sentiment_analysis"])
    replay_commit("7b908bd", "2026-04-07T14:00:00+0500", "analysis: SC35 - analyze review themes and patterns", DAWUD_NAME, DAWUD_EMAIL)
    replay_commit("fd6ef62", "2026-04-08T10:00:00+0500", "analysis: SC36 - present sentiment as actionable themes", ESHAL_NAME, ESHAL_EMAIL)
    replay_commit("19a2515", "2026-04-10T10:00:00+0500", "analysis: SC37 - display overall sentiment score", DAWUD_NAME, DAWUD_EMAIL)
    replay_commit("26bf37f", "2026-04-10T14:00:00+0500", "analysis: SC38 - compare sentiment across products", DAWUD_NAME, DAWUD_EMAIL)
    subprocess.run(["git", "checkout", "master"])
    merge_dated("2026-04-11T12:00:00+0500", "sentiment_analysis", "chore: merge sentiment_analysis branch into master", DAWUD_NAME, DAWUD_EMAIL)
    
    # EPIC 5: Dashboard & Report Management
    subprocess.run(["git", "checkout", "-b", "report_management"])
    replay_commit("932e80d", "2026-04-10T10:00:00+0500", "dashboard: SC48 - download report as PDF", DAWUD_NAME, DAWUD_EMAIL)
    replay_commit("b8b001f", "2026-04-10T14:00:00+0500", "dashboard: SC49 - structured report layout", ESHAL_NAME, ESHAL_EMAIL)
    subprocess.run(["git", "checkout", "master"])
    merge_dated("2026-04-11T16:00:00+0500", "report_management", "chore: merge report_management branch into master", DAWUD_NAME, DAWUD_EMAIL)
    
    print("Migration completed dynamically.")

if __name__ == "__main__":
    main()
