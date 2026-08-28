# 2027

Site for **A²S² 2027** — the first edition of the *AI Auditing of
Sociotechnical Systems* workshop, proposed for CHI 2027.

Served at <https://a2s2-workshop.github.io/2027/>. The workshop's landing site
lives in [`a2s2-workshop.github.io`](https://github.com/a2s2-workshop/a2s2-workshop.github.io).

## Running locally

The page loads its content from `data/*.json` with `fetch()`, which browsers
block over `file://`. **Opening `index.html` by double-clicking it will show
empty sections.** Serve it instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Layout

```
index.html            the entire site — one page, anchor-navigated
css/style.css         all styling; theme tokens live in the :root block at the top
js/main.js            renders Organizers, Important Dates, and Program from JSON
data/organizers.json  organizer cards
data/dates.json       important dates      (feature-flagged, see below)
data/program.json     workshop schedule    (feature-flagged, see below)
assets/img/organizers/  headshots
favicon.svg
```

There is no build step, no framework, and no CI. Deploying is `git push` to
`main`; GitHub Pages serves the repo root.

Two invariants worth protecting:

- **All paths inside the site are relative.** That is what lets the site work
  from the `/2027/` subpath. The single absolute URL on the page is the nav
  brand's link back to the landing site.
- **`css/style.css` is identical to the landing repo's copy.** If you change
  theming, copy the file across so the editions do not drift apart.

## Publishing dates and the program

`data/dates.json` and `data/program.json` each carry an `enabled` flag. While
it is `false`, the rows are ignored and an "announced soon" notice renders
instead — so the real content can be committed and reviewed ahead of time,
then published by flipping one boolean.

## Editing organizers

```json
{
  "name": "Full Name",
  "affiliation": "Institution",
  "email_user": "someone",
  "email_domain": "institution.edu",
  "photo": "assets/img/organizers/lastname.jpg",
  "website": "https://example.com/",
  "links": [
    { "label": "Bluesky", "url": "https://bsky.app/profile/..." }
  ]
}
```

Array order is display order. Email is split across two fields deliberately and
reassembled at render time, so naive scrapers cannot lift addresses out of the
raw JSON; keep it split. `photo` and `website` are optional, and a missing
image fails soft (the card renders text-only). Each `links[].label` must be a
key in the `ICONS` map in `js/main.js` — currently `X`, `Bluesky`, `Mastodon`,
`LinkedIn`, `GitHub`, `Google Scholar`, `ORCID`. **Any other label is silently
dropped**, so add the icon first.

## TODO

- `data/organizers.json` holds six placeholders (`Organizer One` … `Organizer
  Six`). For each, replace `name`, `affiliation`, `email_user`, `email_domain`,
  `website`, and every `links[].url` — all currently `#`. Delete any social
  link an organizer does not have rather than leaving it as `#`.
- Drop headshots into `assets/img/organizers/` and point `photo` at them,
  replacing `placeholder.svg`. Compress them first; these load on every visit.
- Fill in the CHI 2027 venue and dates, then flip `enabled` in `data/dates.json`.
