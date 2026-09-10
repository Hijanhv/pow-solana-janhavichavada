# Proof of Work on Solana

A single-page record of everything I have built on Solana, from my first Anchor program in
November 2024 through the Turbin3 Builders cohort and four hackathon submissions.

**Live site:** https://hijanhv.github.io/pow-solana-janhavichavada/

## What is in it

| Section | Contents |
|---|---|
| Shipped builds | 10 public projects with a live deployment: Favorites, Cliff Chain, Phantom Lottery, TalentPool, Charisma, PayCrew, Noctex, Cardon, Catenaccio, Foresight |
| Turbin3 Builders cohort | The assignment set, written from scratch: environment, SPL + MPL Core, vault, escrow, constant-product AMM, NFT staking, NFT marketplace, instruction introspection, capstone user stories, Raydium and Cardon architecture studies |
| Teaching and tooling | Solana Basics (a 30-lesson teaching deck) and the Solscan Enhanced explorer teardown |
| Ledger | The whole run in date order |

Each entry carries the account layout, PDA seeds, CPI pattern or design decision that made
the project worth building, plus the devnet program IDs where one was deployed. Program IDs
are click-to-copy.

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
index.html    all content and structure
styles.css    the design system
script.js     filtering, copy-to-clipboard, scroll reveal
```

## Elsewhere

- Superteam Earn: https://superteam.fun/earn/t/janu
- GitHub: https://github.com/Hijanhv
- Twitter / X: https://x.com/JanhaviChavada
- Everything else: https://linktr.ee/findjanhv
