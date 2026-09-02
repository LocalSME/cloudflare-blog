# Working in this repository

A solo-author static blog: Astro 7 + TypeScript, deployed to **Cloudflare Pages** via a
GitHub Actions workflow that runs Wrangler, served from the domain root. Independent
from the sibling GitHub Pages blog (`CreativeDigitalGrowth/CreativeDigitalGrowth.github.io`)
and the sibling GitLab Pages blog (`creativedigitalgrowth.gitlab.io`) — not a mirror, no
shared content, no shared git history. Full detail in
[`docs/architecture.md`](docs/architecture.md).

## Development

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.

```bash
npm run dev      # localhost:4321/ — drafts visible
npm run build    # production build + Pagefind index
npm run preview  # serves dist/ — the only faithful test of search and base paths
npm run check    # TypeScript + Astro diagnostics; keep this at 0 errors
npm run deploy   # local one-off: wrangler pages deploy dist — CI does this on push
```

**On this Windows machine**, Smart App Control blocks Astro's native compiler binary.
After every `npm install` or `npm ci`:

```bash
npm install --no-save --force @astrojs/compiler-binding-wasm32-wasi
```

## Rules that are easy to get wrong

**Never write a root-absolute internal path.** It happens to work today — this is a
root-served site with `base: '/'` — but that is hosting, not design. Use the helpers in
`src/lib/url.ts` so the site can move again without a rewrite:

| Helper | For |
| --- | --- |
| `withBase(p)` | paths you author — `/about/` → `/about/` here, `/blog/about/` under a base |
| `absFromBuiltPath(p, site)` | paths Astro produced (`Astro.url.pathname`, `ImageMetadata.src`, `paginate()` URLs) — **already based** |
| `absUrl(p, site)` | absolute URL from a path you author |

Do not try to collapse these into one function that detects whether a path "already has
the base". That was tried on a sibling project and shipped two bugs: `/blog/my-post/`
is genuinely ambiguous because a `/blog/` route sits under a `/blog/` base.

**`paginate()` URLs already include the base.** Passing them through `withBase()`
doubles it the moment a base is configured. `Pagination.astro` takes them raw.

**Query posts through `getPosts()`** in `src/lib/posts.ts`, never `getCollection`
directly. That single call is where drafts are filtered out of production builds and
where date ordering happens.

**Frontmatter image paths are relative to the Markdown file** —
`../../assets/images/uploads/…` — because `image()` resolves them that way and the CMS
is configured to write exactly that. Both `media_folder` and `public_folder` in
`public/admin/config.yml` must stay in sync with wherever posts live.

**Site-wide settings live in `src/consts.ts` and nowhere else.** If you find yourself
hardcoding a title, an author name or a page size, put it there instead.

**The CMS schema and the Zod schema must match.** `public/admin/config.yml` field names
and `src/content.config.ts` are one contract; changing either alone breaks editing or
breaks the build.

**`public/admin/config.yml` is YAML.** Quote any string containing `: ` — an unquoted
colon-space silently breaks the whole CMS.

**The content repo (GitHub) and the host (Cloudflare Pages) are two separate systems.**
Sveltia CMS commits to the GitHub repo named in `public/admin/config.yml`; Cloudflare
never sees a commit directly. The GitHub Actions workflow is what bridges the two — it
builds on every push to `main` and uploads `dist/` to the Cloudflare Pages project via
Wrangler. If a post is missing from the live site, check the Actions run before
suspecting Cloudflare.

## Before calling a change done

```bash
npm run check    # expect 0 errors
npm run build
grep -rhoE 'https?://[^"< ]+' dist --include=*.html | grep -v 'cloudflare-blog.pages.dev' | sort -u
```

The grep must print only genuinely external URLs (giscus, google maps, unpkg). If the
change is visible in a browser, verify with `npm run preview` rather than `npm run dev`
— search, `/admin/` and draft exclusion all behave differently between the two.

## Deployment

Push to `main` → `.github/workflows/deploy.yml` builds with `npm run build` (which
triggers the `postbuild` Pagefind index) and deploys `dist/` with
`wrangler pages deploy` under `cloudflare/wrangler-action@v3`. Saving in the CMS is a
push, so publishing and deploying are the same action. See
[`docs/deployment.md`](docs/deployment.md).

That workflow needs two repository secrets that do not exist until someone sets them —
**Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — scoped to `Cloudflare Pages: Edit` for the account
- `CLOUDFLARE_ACCOUNT_ID`

And the Cloudflare Pages project itself (`cloudflare-blog`) must exist before the first
deploy — `wrangler pages project create cloudflare-blog --production-branch=main`, or
create it once from the Cloudflare dashboard. See [`docs/setup.md`](docs/setup.md).

There is no GitHub-Pages-style "build source" setting and no Jekyll-alongside-the-build
problem here — that is a GitHub Pages legacy quirk that does not exist on Cloudflare
Pages. Every deploy is exactly what this workflow uploads.

Local git authenticates as `mohiseen-aumni`, the same account used for the sibling
GitHub Pages blog. **This repository does not exist on GitHub yet** — it has not been
created or pushed. Do not assume it is live until that has actually happened.

## Documentation

Full docs: https://docs.astro.build

- [Routing and dynamic routes](https://docs.astro.build/en/guides/routing/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Images](https://docs.astro.build/en/guides/images/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)

Cloudflare-specific: https://developers.cloudflare.com/pages/ and
https://developers.cloudflare.com/workers/wrangler/
