# Working in this repository

A solo-author static blog: Astro 7 + TypeScript, deployed as a **Cloudflare Worker**
(Workers Static Assets, not a classic Pages project) by Cloudflare's dashboard Git
integration, served from the domain root. Independent from the sibling GitHub Pages
blog (`LocalSME/LocalSME.github.io`) and the sibling GitLab Pages blog
(`localsme.gitlab.io`) — not a mirror, no shared content, no shared git history. Full
detail in [`docs/architecture.md`](docs/architecture.md).

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

**The content repo (GitHub) and the host (Cloudflare) are two separate systems, bridged
by Cloudflare's own Git integration.** Sveltia CMS commits to the GitHub repo named in
`public/admin/config.yml`. Cloudflare's dashboard is connected directly to that repo via
its own GitHub App installation — it watches for pushes to `main` and builds and deploys
itself, server-side. There is no GitHub Actions workflow and no Wrangler step in this
project's pipeline. If a post is missing from the live site, check the Deployments tab
in the Cloudflare dashboard (build log and status) before suspecting anything else.

## Before calling a change done

```bash
npm run check    # expect 0 errors
npm run build
grep -rhoE 'https?://[^"< ]+' dist --include=*.html | grep -v 'localsme.supernovasearch-localseo.workers.dev' | sort -u
```

The grep must print only genuinely external URLs (giscus, google maps, unpkg). If the
change is visible in a browser, verify with `npm run preview` rather than `npm run dev`
— search, `/admin/` and draft exclusion all behave differently between the two.

## Deployment

Push to `main` → Cloudflare's dashboard Git integration (Workers & Pages → this project,
connected directly to `LocalSME/cloudflare-blog`) picks it up via its own
GitHub App installation and builds and deploys it itself — `npm run build` (which
triggers the `postbuild` Pagefind index), then `npx wrangler deploy` publishes `dist/`
as this Worker's static assets, per [`wrangler.jsonc`](wrangler.jsonc). Saving in the
CMS is a push, so publishing and deploying are the same action. There is no GitHub
Actions workflow in this pipeline, but Wrangler **is** involved (unlike the classic-Pages
sibling `cloudflare-blog`) — see [`docs/deployment.md`](docs/deployment.md).

No repository secrets exist or are needed — build authorization is entirely between
Cloudflare and its own GitHub App installation, not a token stored in this repo. That
token is scoped for Workers deploys specifically; if this project were ever reconnected
as a classic Pages project instead, `npx wrangler pages deploy` would fail
authentication against the Pages API even with a correct `--project-name` — Workers and
Pages tokens are not interchangeable. Learned the hard way setting this project up.

**Build command, output directory and Node version live in the Cloudflare dashboard
project settings, not in any file in this repository** (except `wrangler.jsonc`, which
declares the Worker's name and its static-assets directory — that file *is* required
here, unlike the classic-Pages sibling). This is the one real "where do I configure X"
gotcha coming from the sibling GitHub Pages blog, whose equivalent settings live in a
workflow file you can read in this repo — here, look in the dashboard instead. See
[`docs/setup.md`](docs/setup.md).

**A successful deploy alone does not make the site reachable.** This Worker's
`workers.dev` subdomain toggle (Domains tab → Worker URL → Production) must be on, or
there is no public URL at all even with a green build. Check that first if "the deploy
succeeded but there's no URL" ever comes up again.

Local git authenticates as `LocalSME`, the same account used for the sibling
GitHub Pages blog. The repository exists on GitHub, is public, and is live at
`LocalSME/cloudflare-blog`.

## Documentation

Full docs: https://docs.astro.build

- [Routing and dynamic routes](https://docs.astro.build/en/guides/routing/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Images](https://docs.astro.build/en/guides/images/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)

Cloudflare-specific: https://developers.cloudflare.com/pages/ and
https://developers.cloudflare.com/pages/configuration/git-integration/
