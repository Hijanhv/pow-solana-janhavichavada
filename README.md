# Proof of Work on Solana

A single-page record of everything I have built on Solana: 25 projects, from my first Anchor
program in November 2024 through the full Turbin3 Builders cohort and four hackathon
submissions. Every entry lists the technologies used, the cluster it runs on, the deployed
program or mint address where there is one, and links to the repository and the live app.

**Live site:** https://hijanhv.github.io/pow-solana-janhavichavada/

## What is in it

| Section | Contents |
|---|---|
| Shipped builds (10) | Favorites, Cliff Chain, Phantom Lottery, TalentPool, Charisma, PayCrew, Noctex, Cardon, Catenaccio, Foresight |
| Turbin3 Builders cohort (12) | Assignment 0, SPL + MPL Core, Anchor Vault, Anchor Escrow, constant-product AMM, NFT Staking, NFT Marketplace, Instruction Introspection, Capstone A1 (proposal and research), Capstone A2 (user stories), Raydium architecture study, Cardon architecture design |
| Teaching and tooling (3) | Solana Basics (a 30-lesson teaching deck), the Solscan Enhanced explorer teardown, and this page |
| Ledger | The whole run in date order |

Each entry carries the account layout, PDA seeds, CPI pattern or design decision that made
the project worth building, alongside a spec block naming the stack and the network. Program
and mint addresses are click-to-copy and link out to the explorer.

Filter the index by on-chain programs, dApps and frontends, hackathon submissions, Turbin3
work, or writing and architecture.

## Live activity

The page carries a live section fed by two layers:

1. **`data/activity.json`**, rebuilt by `.github/workflows/activity.yml` every three
   hours. It holds the contribution calendar, the streak and active-day figures, an
   hour-of-day histogram, and the most recent commits across every Solana repository.
   Because it is committed to the repo, the section renders instantly and still works
   if GitHub's API is rate limiting the viewer.
2. **A live read of `api.github.com/users/Hijanhv/events/public`** on page load. Any
   push to a tracked Solana repo that is newer than the JSON appears at the top of the
   feed with a LIVE tag, within seconds of the push.

Which repositories count as Solana is decided in `scripts/build-activity.mjs`: a
curated list, plus anything whose name, description or topics mention Solana, Anchor,
Turbin3, SPL, Metaplex and so on, minus an explicit exclude list for repos that mention
Solana but are built for another chain. A new Solana repo is picked up automatically on
the next refresh.

To force a refresh immediately after a push in another repo:

```bash
gh workflow run "Refresh GitHub activity" -R Hijanhv/pow-solana-janhavichavada
# or from any repo's own workflow:
gh api repos/Hijanhv/pow-solana-janhavichavada/dispatches -f event_type=refresh-activity
```

Rebuild the data locally:

```bash
node scripts/build-activity.mjs
```

## Running it

Static HTML, CSS and JavaScript. No build step and no dependencies.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

GitHub Pages, served from the repository root:

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder: `/ (root)`.

## Files

```
index.html                       all content and structure
styles.css                       the design system
script.js                        filtering, copy-to-clipboard, scroll reveal
activity.js                      renders the live GitHub section
data/activity.json               refreshed by the workflow, committed to the repo
scripts/build-activity.mjs       builds that JSON from public GitHub data
.github/workflows/activity.yml   runs it on a schedule
```

## Elsewhere

- Superteam Earn: https://superteam.fun/earn/t/janu
- GitHub: https://github.com/Hijanhv
- Twitter / X: https://x.com/JanhaviChavada
- Everything else: https://linktr.ee/findjanhv
