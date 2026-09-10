#!/usr/bin/env node
/**
 * Builds data/activity.json for the Proof of Work on Solana page.
 *
 * Sources, all public:
 *   - https://github.com/users/<user>/contributions   the contribution calendar
 *   - https://api.github.com/users/<user>/repos       repo list, to find the Solana ones
 *   - https://api.github.com/repos/<r>/commits        recent commits per Solana repo
 *   - https://api.github.com/users/<user>/events/public  recent push events
 *
 * Runs unauthenticated, but uses GITHUB_TOKEN when the workflow provides one
 * so the per-repo commit fetches do not eat the 60/hour anonymous budget.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER = process.env.GH_USER || 'Hijanhv';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/activity.json');

// The clock the hour histogram is reported in.
const TZ_LABEL = 'IST (UTC+5:30)';
const TZ_OFFSET_MINUTES = 5 * 60 + 30;

// Repos that are Solana work but whose name and description do not say so.
const FORCE_INCLUDE = new Set([
  'Favorites', 'cliff-chain-submission', 'phantom-lottery', 'talent-pool',
  'charisma', 'PayCrew', 'noctex', 'cardon', 'Catenaccio', 'FORESIGHT',
  'turbine3-hw', 'SPL-NFT---ASSIGNMENT2', 'anchor_vault', 'Anchor-Escrow',
  'AMM-Turbine3', 'NFT-Staking', 'NFT-Marketplace', 'Instruction-Introspection',
  'capstone-user-stories-onchain', 'raydium--Architecture-Design-',
  'cardon--Architecture-Design-', 'solana-basics-', 'solscan-enhanced',
  'pow-solana-janhavichavada',
]);

// Repos that mention Solana in passing but are built for another chain.
const FORCE_EXCLUDE = new Set([
  'veyra', 'stride', 'skateflow', 'AgentMart', 'knot-hook', 'knot', 'KNOT-hook-',
  'lobster-hook', 'lambda-protocol', 'VolatilityFeeHook', 'hook', 'malus-hook',
  'NeuralHook', 'contango', 'Voltaire', 'tenor', 'PARIAH', 'PITBOSS', 'stardrop',
  'HALO-', 'StakeFlow', 'StakeFlux', 'land-registry-Dapp',
]);

const SOLANA_WORDS = /\b(solana|anchor|turbin3|turbine3|spl[- ]?token|metaplex|helius|squads|pda|svm|phantom)\b/i;

const headers = {
  'User-Agent': `${USER}-proof-of-work`,
  Accept: 'application/vnd.github+json',
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function api(path, { raw = false } = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { headers: raw ? { 'User-Agent': headers['User-Agent'] } : headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return raw ? res.text() : res.json();
}

/* ---------- contribution calendar ---------- */

async function calendar() {
  const html = await api(`https://github.com/users/${USER}/contributions`, { raw: true });

  // Each day is a <td> carrying its date and level; the exact count lives in the
  // matching <tool-tip> keyed by the cell's id.
  const counts = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*for="(contribution-day-component-[^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^(\d+|No)/.exec(m[2].trim());
    counts.set(m[1], n && n[1] !== 'No' ? Number(n[1]) : 0);
  }

  const days = [];
  for (const m of html.matchAll(/<td[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="([^"]+)"/.exec(tag);
    const level = /data-level="(\d+)"/.exec(tag);
    const id = /id="(contribution-day-component-[^"]+)"/.exec(tag);
    if (!date) continue;
    days.push({
      date: date[1],
      level: level ? Number(level[1]) : 0,
      count: id && counts.has(id[1]) ? counts.get(id[1]) : 0,
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

function streaks(days) {
  const today = new Date().toISOString().slice(0, 10);
  const past = days.filter((d) => d.date <= today);

  let longest = 0;
  let run = 0;
  for (const d of past) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  // The current streak may legitimately not include today yet.
  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].count > 0) current++;
    else if (i === past.length - 1) continue;
    else break;
  }

  return { longest, current };
}

/* ---------- which repos are Solana ---------- */

function isSolana(repo) {
  if (FORCE_EXCLUDE.has(repo.name)) return false;
  if (FORCE_INCLUDE.has(repo.name)) return true;
  const haystack = [repo.name, repo.description || '', (repo.topics || []).join(' ')].join(' ');
  return SOLANA_WORDS.test(haystack);
}

async function solanaRepos() {
  const all = [];
  for (let page = 1; page <= 4; page++) {
    const batch = await api(`/users/${USER}/repos?per_page=100&sort=pushed&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all
    .filter((r) => !r.fork && isSolana(r))
    .map((r) => ({
      name: r.name,
      full: r.full_name,
      description: r.description,
      language: r.language,
      pushedAt: r.pushed_at,
      url: r.html_url,
      homepage: r.homepage,
    }));
}

/* ---------- recent Solana commits ---------- */

async function recentCommits(repos) {
  const out = [];
  // Newest-pushed repos first, so a shallow scan still catches the latest work.
  for (const repo of repos.slice(0, 30)) {
    try {
      const commits = await api(`/repos/${repo.full}/commits?per_page=5`);
      for (const c of commits) {
        out.push({
          repo: repo.name,
          repoUrl: repo.url,
          sha: c.sha.slice(0, 7),
          url: c.html_url,
          message: (c.commit.message || '').split('\n')[0].slice(0, 140),
          date: c.commit.author?.date || c.commit.committer?.date,
        });
      }
    } catch (err) {
      console.warn(`skipped ${repo.full}: ${err.message}`);
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}

/* ---------- when the work actually happens ---------- */

function clockBuckets(commits, previous) {
  const hours = previous?.hours?.length === 24 ? [...previous.hours] : new Array(24).fill(0);
  const weekdays = previous?.weekdays?.length === 7 ? [...previous.weekdays] : new Array(7).fill(0);
  const seen = new Set(previous?.seen || []);

  for (const c of commits) {
    const key = `${c.repo}@${c.sha}`;
    if (seen.has(key) || !c.date) continue;
    seen.add(key);
    const local = new Date(new Date(c.date).getTime() + TZ_OFFSET_MINUTES * 60_000);
    hours[local.getUTCHours()]++;
    weekdays[local.getUTCDay()]++;
  }

  // Keep the seen-set bounded; it only exists to stop double counting.
  const trimmed = [...seen].slice(-4000);
  return { hours, weekdays, seen: trimmed, sampled: trimmed.length };
}

/* ---------- go ---------- */

async function main() {
  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    /* first run */
  }

  const days = await calendar();
  const repos = await solanaRepos();
  const commits = await recentCommits(repos);
  const clock = clockBuckets(commits, previous?.clock);

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;
  const busiest = days.reduce((best, d) => (d.count > (best?.count || 0) ? d : best), null);

  const payload = {
    user: USER,
    generatedAt: new Date().toISOString(),
    calendar: {
      days,
      total,
      activeDays,
      busiest,
      ...streaks(days),
    },
    clock: { ...clock, timezone: TZ_LABEL },
    repos: repos.map(({ name, full, description, language, pushedAt, url, homepage }) => ({
      name, full, description, language, pushedAt, url, homepage,
    })),
    commits: commits.slice(0, 24),
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 1) + '\n');

  console.log(
    `calendar ${days.length} days, ${total} contributions, ${activeDays} active`,
    `\nsolana repos ${repos.length}`,
    `\ncommits ${commits.length} (${payload.commits.length} kept)`,
    `\nclock sample ${clock.sampled}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
