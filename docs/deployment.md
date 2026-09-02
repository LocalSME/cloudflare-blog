# Deployment

**Target URL:** <https://cloudflare-blog.pages.dev> — not live yet; see
[setup.md](setup.md) for what's outstanding.
**GitHub repo:** `CreativeDigitalGrowth/cloudflare-blog` — what the CMS commits to and
what Actions checks out. Does not exist yet; nothing has been pushed.
**Cloudflare Pages project:** `cloudflare-blog` — the separate hosting target Wrangler
deploys to. Not created yet.

## How it works

Every push to `main` triggers [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

```
push to main
  └─ build   actions/checkout@v7 → actions/setup-node@v4 (Node 22)
     │         runs `npm ci` then `npm run build`
     │         `postbuild` runs Pagefind over dist/
     └─ deploy cloudflare/wrangler-action@v3
               `wrangler pages deploy dist --project-name=cloudflare-blog --branch=main`
               authenticated with the CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
               repository secrets
```

Saving a post in the CMS **is** a push to `main`, so publishing and deploying are the
same action — build plus a Wrangler upload, normally on the order of a minute once the
one-time setup below is in place.

The workflow requests only `contents: read`; deploy authorization comes entirely from
the `CLOUDFLARE_API_TOKEN` secret, not a GitHub token. It uses `concurrency: pages` with
`cancel-in-progress: false`, so an in-flight deploy is left to finish rather than
cancelled mid-publish.

### Why the npm `postbuild` hook matters

The workflow runs `npm run build` directly rather than `astro build`, so the
`postbuild` script fires automatically: npm runs `pagefind --site dist` right after
Astro finishes, and the search index ends up inside `dist/` before the Wrangler step
uploads it. No extra workflow step, and no way to deploy a site whose search index is
stale.

## Required one-time Cloudflare setup

Cloudflare Pages has no GitHub-Pages-style "build source" dashboard setting, and no
legacy build system running alongside this one — every deploy is exactly what the
Wrangler step above uploads, full stop. What has to exist instead, before the first
deploy can succeed:

1. **The Cloudflare Pages project**, created up front:

   ```bash
   wrangler pages project create cloudflare-blog --production-branch=main
   ```

   (needs `wrangler login`, or `CLOUDFLARE_API_TOKEN` set locally), or once via the
   dashboard: **Workers & Pages → Create → Pages → Direct Upload**. The name must match
   `--project-name=cloudflare-blog` exactly — a mismatch fails the deploy step. See
   [troubleshooting.md](troubleshooting.md#deploy-fails-with-project-not-found).

2. **Two repository secrets** — **Settings → Secrets and variables → Actions** on
   `CreativeDigitalGrowth/cloudflare-blog`:

   | Secret | Where to get it |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom Token, scoped to `Account.Cloudflare Pages: Edit` for this account only |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard sidebar on any account overview page, or `wrangler whoami` |

Full walkthrough, including why the scoped-token template matters:
[setup.md](setup.md#1-cloudflare-pages-project-and-deploy-secrets). Neither the project
nor the secrets exist yet on this repo — see the status table there.

## Verifying a deployment

```bash
wrangler pages deployment list --project-name=cloudflare-blog
```

or the dashboard: **Pages project → Deployments**, which shows the build log, status,
and a preview URL per deployment. GitHub Actions run status is a separate, useful check
— the Actions checkout-and-build steps can succeed while the Wrangler step still fails
(wrong secret, project not created yet), so check both:

```bash
gh run list --repo CreativeDigitalGrowth/cloudflare-blog --limit 5
gh run view <run-id> --repo CreativeDigitalGrowth/cloudflare-blog --log-failed
```

A smoke test against the live site, once one exists, is the check that actually matters
— it tests what visitors get rather than what the local build produced:

```bash
B=https://cloudflare-blog.pages.dev
for p in "" "blog/" "about/" "contact/" "search/" "admin/" "rss.xml" "sitemap-index.xml" "pagefind/pagefind-ui.js"; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L "$B/$p")  /$p"
done
```

All should return `200`. Then confirm nothing leaked:

```bash
# drafts must be absent — swap in the slug of an actual draft post once one exists
curl -s -o /dev/null -w '%{http_code}\n' -L "$B/blog/<draft-slug>/"   # expect 404

# no root-absolute internal references
curl -s -L "$B/" | grep -ohE 'https?://[^"]+' | grep -v 'cloudflare-blog.pages.dev' | sort -u
```

None of this has been run yet — the project hasn't been deployed once. This is the
checklist to work through the first time it is, not a record of a passed check.

## Rollback

A failed build never reaches the deploy step, so the previous version stays live — the
build is the safety net.

To undo a bad *successful* deploy, the fast path needs no rebuild: **Cloudflare
dashboard → Pages project (`cloudflare-blog`) → Deployments → pick an older successful
deployment → "Rollback to this deployment"**. Instant.

The from-source alternative — revert the commit and let Actions redeploy, or re-run an
older workflow run from the Actions tab — is slower but keeps GitHub history and the
live deployment in sync:

```bash
git revert <sha>
git push
```

Re-running an older workflow run also works from the Actions tab, and is faster if the
problem is content rather than code.

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
Changing repository settings — secrets, Discussions, collaborators — requires
**admin**, held by `CreativeDigitalGrowth`. The `mohiseen-aumni` account has Write only
— same pattern as the sibling GitHub Pages repo.

```bash
gh api repos/CreativeDigitalGrowth/cloudflare-blog --jq '.permissions'
```

**Cloudflare.** Deploying also requires whoever holds `CLOUDFLARE_API_TOKEN` to have
scoped it correctly and set it — along with `CLOUDFLARE_ACCOUNT_ID` — as a repository
secret. GitHub write access alone cannot make a deploy happen; Cloudflare account access
alone cannot get code deployed either. Both are required, independently.
