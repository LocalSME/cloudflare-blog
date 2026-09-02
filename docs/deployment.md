# Deployment

**Live URL:** <https://creativedigitalgrowth.pages.dev> — a classic Cloudflare Pages
project, created via Cloudflare's dashboard Git integration connected to this repo.
**GitHub repo:** `CreativeDigitalGrowth/cloudflare-blog` — public, pushed, what the CMS
commits to and what Cloudflare's Git integration watches.
**Cloudflare project:** connected directly to that repo from the Cloudflare dashboard
(**Workers & Pages**) — see [setup.md](setup.md#1-cloudflare-git-integration) for how
that connection was made.

## How it works

```
push to main (including a CMS save)
  └─ Cloudflare's dashboard-connected Git integration picks it up via webhook,
     through its own GitHub App installation
     └─ Cloudflare builds it server-side: `npm run build`
        │  `postbuild` runs Pagefind over dist/ automatically — same npm lifecycle
        │  hook as before, it just runs on Cloudflare's build machine now
        └─ Cloudflare publishes the output directory (`dist`)
```

Saving a post in the CMS **is** a push to `main`, so publishing and deploying are the
same action. There is no GitHub Actions workflow and no Wrangler CLI anywhere in this
pipeline — Cloudflare authenticates to GitHub through its own GitHub App installation,
not a token stored in this repo, and there are no repository secrets involved at all.

### Why the npm `postbuild` hook matters

Cloudflare runs `npm run build` directly rather than `astro build`, so the `postbuild`
script fires automatically: npm runs `pagefind --site dist` right after Astro finishes,
and the search index ends up inside `dist/` before Cloudflare publishes it. No extra
build step to configure, and no way to deploy a site whose search index is stale.

## What's configurable, and where

There is no project-creation step and no repository secrets — the one-time setup was
connecting the Cloudflare dashboard to this GitHub repo (**Workers & Pages → Create →
Connect to Git**, done already; see [setup.md](setup.md#1-cloudflare-git-integration)).

What *is* configurable lives entirely in the Cloudflare dashboard, not in any file in
this repo — there is no `wrangler.toml`:

**Project → Settings → Build**, or the equivalent in the newer Workers & Pages settings
UI:

| Setting | Value here |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22 (matches `engines.node` in `package.json`) |
| Environment variables | none required by this project today |

Anyone used to the sibling GitHub Pages blog's GitHub-Actions-based flow should look
here, not in this repo, for anything that would otherwise be a workflow-file setting —
that's the real "where do I configure X" gotcha moving between the two.

## Verifying a deployment

Check the Cloudflare dashboard: **Workers & Pages → the connected project →
Deployments**, which shows the build log, status, and a preview URL per deployment.
There is no GitHub Actions run to check alongside it — a build either succeeds or fails
entirely on Cloudflare's side, and its log is the only place to see why.

A smoke test against the live site is the check that actually matters — it tests what
visitors get rather than what the local build produced. This should actually be run for
real now, since the site is live:

```bash
B=https://creativedigitalgrowth.pages.dev
for p in "" "blog/" "about/" "contact/" "search/" "admin/" "rss.xml" "sitemap-index.xml" "pagefind/pagefind-ui.js"; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L "$B/$p")  /$p"
done
```

All should return `200`. Then confirm nothing leaked:

```bash
# drafts must be absent — swap in the slug of an actual draft post once one exists
curl -s -o /dev/null -w '%{http_code}\n' -L "$B/blog/<draft-slug>/"   # expect 404

# no root-absolute internal references
curl -s -L "$B/" | grep -ohE 'https?://[^"]+' | grep -v 'creativedigitalgrowth.pages.dev' | sort -u
```

## Rollback

A failed build never reaches the deploy step, so the previous version stays live — the
build is the safety net.

To undo a bad *successful* deploy, the fast path needs no rebuild: **Cloudflare
dashboard → the connected project → Deployments → pick an older successful deployment →
"Rollback to this deployment"**. Instant.

The from-source alternative is slower but keeps GitHub history and the live deployment
in sync — revert the commit and push; Cloudflare rebuilds automatically:

```bash
git revert <sha>
git push
```

There is no workflow run to re-run instead, the way there would be with GitHub Actions
— reverting and pushing is the only from-source path here.

## Local equivalents

```bash
npm run build     # what CI runs, including Pagefind
npm run preview   # serves dist/ — the only faithful local test of search and base paths
```

`npm run dev` does **not** exercise search (no index), the `/admin/` directory index, or
draft exclusion. Use `preview` before assuming a deploy will behave.

## Access

Two independent access paths, not one.

**GitHub.** Pushing requires write access to `CreativeDigitalGrowth/cloudflare-blog`.
Changing repository settings — Discussions, collaborators, and which GitHub Apps are
installed — requires **admin**, held by `CreativeDigitalGrowth`. The `mohiseen-aumni`
account has Write only — same pattern as the sibling GitHub Pages repo.

```bash
gh api repos/CreativeDigitalGrowth/cloudflare-blog --jq '.permissions'
```

**Cloudflare.** Separately, whoever has login access to the Cloudflare account/dashboard
controls what's actually deployed and how it's built — build settings, environment
variables, custom domains, rollbacks — and also controls whether Cloudflare's GitHub App
can even see this repo in the first place. GitHub write access alone cannot make a
deploy happen if the Git integration were ever disconnected; Cloudflare account access
alone cannot change what code exists in the repo. Both matter, independently.
