# One-time setup

Everything on this page is done once. Sections degrade gracefully — missing pieces mean
a notice or a fallback, not a broken build.

The GitHub repository (`LocalSME/cloudflare-blog`) is created, public and
pushed. Cloudflare's dashboard is connected to it and deploying automatically.

| Step | Status |
| --- | --- |
| Repository created and pushed | ✅ done |
| Cloudflare Git integration connected | ✅ done |
| Fine-grained PAT for the CMS | ❌ not created |
| Giscus comments | ❌ not configured |
| Contact form endpoint | ❌ not set |
| Author identity in `src/consts.ts` | ❌ still placeholder text |

---

## 1. Cloudflare Git integration ✅

Done. This is a manual, one-time action taken directly in the Cloudflare dashboard — not
something a future reader needs to redo — recorded here so it's clear what exists and
where to find it.

Cloudflare's dashboard is connected directly to `LocalSME/cloudflare-blog`:
**Workers & Pages → Create → Connect to Git → `LocalSME/cloudflare-blog`**. That flow
created this as a **Worker**, not a classic Pages project — the connection installs a
Cloudflare-owned GitHub App with read access to this repo, and from then on Cloudflare
watches `main` itself and rebuilds on every push — no GitHub Actions workflow, no
repository secrets involved anywhere. Wrangler *is* involved, but only inside
Cloudflare's own build environment (`npx wrangler deploy`, using
[`wrangler.jsonc`](../wrangler.jsonc)), never locally.

Build command, deploy command, root directory and Node version are all set in the
Cloudflare dashboard, on this connected project's **Settings** page — not in any file in
this repo except `wrangler.jsonc`. See
[deployment.md](deployment.md#whats-configurable-and-where) for the current values.

The live URL is <https://localsme.supernovasearch-localseo.workers.dev> — the standard
`<worker-name>.<account-subdomain>.workers.dev` domain Cloudflare assigns to a Worker.
That domain does not appear automatically even after a successful deploy: the
`workers.dev` subdomain toggle (**Domains tab → Worker URL → Production**) has to be
switched on once. A custom domain can be attached later from the same dashboard
project; see [§7 below](#7-optional-custom-domain).

## 2. Access token for the CMS

The CMS signs in with a GitHub Personal Access Token. There is no OAuth backend, no
serverless function and no client secret anywhere in this repository.

Two kinds of token work, and which one you can use depends on **who owns the repo**.

### Fine-grained (tighter — use it if you can)

<https://github.com/settings/personal-access-tokens/new>

| Field | Value |
| --- | --- |
| Resource owner | `LocalSME` |
| Repository access | **Only select repositories → `cloudflare-blog`** |
| Repository permissions → **Contents** | **Read and write** |
| Repository permissions → Metadata | Read-only (added automatically) |
| Expiration | Set one. 90 days is a reasonable default |

Two defaults catch people out: *Repository access* starts on **Public repositories**,
which is read-only, and *Contents* starts on **No access** — read-only there passes the
login check but makes every save fail.

> **The catch.** A fine-grained token can only be scoped to repositories owned by its
> **resource owner**. Collaborator access does not count: if you are signed in as an
> account that merely *collaborates* on this repo, it will not appear in the list and no
> permission setting will help. Sign in as the owner, or use a classic token below.

### Classic (the fallback that always works)

<https://github.com/settings/tokens> → **Generate new token (classic)** → tick
**`public_repo`** only.

Because this repository is public, `public_repo` is enough — do not grant full `repo`.
This works from any account with push access, regardless of who owns the repo, which is
why it is the reliable option when the fine-grained route refuses.

The trade-off is real: `public_repo` grants write access to **every public repository
you can push to**, not just this one. A fine-grained token scoped to a single repo is
strictly tighter. Prefer fine-grained when the owner account is available to you.

**Pull requests access is not needed either way** — `publish_mode: simple` in
`public/admin/config.yml` commits straight to `main`.

Whichever you use, commits are authored by the account that issued the token.

Then open <https://localsme.supernovasearch-localseo.workers.dev/admin/>, choose
**"Sign In Using Access Token"** and paste it.

> There is no "Sign In with GitHub" button on the login screen. It starts an OAuth flow
> that needs a server to hold a client secret, which a static site cannot have, so it
> hung on "Signing in…" forever. Sveltia offers no config option to disable it, so a
> small fail-open script in `public/admin/index.html` hides it. See
> [troubleshooting.md](troubleshooting.md#cms-sign-in-with-github-hangs-on-signing-in).

**Treat the token like a password.** It can read and write everything in this
repository. Do not paste it anywhere else, do not commit it, and revoke it from the
same settings page the moment you suspect it has leaked. See [SECURITY.md](../SECURITY.md).

## 3. Giscus comments

Comments are GitHub Discussions rendered by [Giscus](https://giscus.app). Until it is
configured, post pages show a one-line notice instead of the widget — nothing breaks.

1. **Settings → General → Features → ✅ Discussions**
2. Open the **Discussions** tab and make sure a category exists. The default expected by
   `src/consts.ts` is **Announcements**; any category works as long as the names match.
3. Install the app at <https://github.com/apps/giscus> and grant it access to
   `LocalSME/cloudflare-blog` **only**.
4. Go to <https://giscus.app>, enter `LocalSME/cloudflare-blog`, pick the
   category, and choose *Discussion title contains page pathname* for the mapping.
5. Copy the generated `data-repo-id` and `data-category-id` into `src/consts.ts`:

```ts
export const GISCUS = {
  repo: 'LocalSME/cloudflare-blog',
  repoId: 'R_kg...',        // ← paste
  category: 'Announcements',
  categoryId: 'DIC_kw...',  // ← paste
  // ...
} as const;
```

Because comments are public Discussions, consider whether
[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) says what you want it to say.

## 4. Contact form endpoint

Cloudflare Pages serves static files by default, so a working form still needs a
third-party endpoint — this project does not use Pages Functions (Cloudflare's
serverless option for Pages, which could handle form submission directly; it just isn't
what's wired up here). `CONTACT_FORM_ENDPOINT` in `src/consts.ts` is deliberately empty
— no endpoint was invented for you.

Create a form at <https://formspree.io> (or any equivalent), then:

```ts
export const CONTACT_FORM_ENDPOINT = 'https://formspree.io/f/xxxxxxxx';
```

The form markup — including a honeypot field — is already written in
`src/pages/contact.astro` and appears automatically once the value is set. Until then
`/contact/` shows the mailto link instead.

## 5. Author identity

All in [`src/consts.ts`](../src/consts.ts). Nothing else hardcodes these:

```ts
export const SITE_TITLE = 'Field Notes';          // ← yours
export const SITE_DESCRIPTION = '...';            // ← yours
export const AUTHOR_NAME = 'Your Name';           // ← yours
export const AUTHOR_BIO = '...';                  // ← yours
export const AUTHOR_EMAIL = 'you@example.com';    // ← yours
export const SOCIAL_LINKS = [ ... ];              // ← yours
```

Also worth replacing: the About page prose in `src/pages/about.astro`, the three sample
posts in `src/content/blog/`, and `public/social-card.png` (the default Open Graph
image, 1200×630).

## 6. Optional: licensing

No licence file is included, because the choice is yours to make and it is a legally
meaningful one. Without a licence, the content is "all rights reserved" by default.

Blogs commonly split the two: a permissive code licence (MIT) plus a content licence
(e.g. CC BY 4.0) for the posts. If you want that, say so and it can be added.

## 7. Optional: custom domain

A custom domain needs `site` in `astro.config.mjs`, `site_url`/`display_url` in
`public/admin/config.yml`, and the `Sitemap:` line in `public/robots.txt` all updated to
the new domain, plus adding the domain on the Cloudflare side: **Workers & Pages → the
connected project → Custom domains → Set up a custom domain**. If the domain's
nameservers are already on Cloudflare, Cloudflare provisions the certificate and DNS
automatically; otherwise it walks through the CNAME record to add at your registrar.

Because this is already a root-served project, no base path has to change. See
[architecture.md](architecture.md#base-paths).
