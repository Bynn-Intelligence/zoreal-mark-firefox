# addons.mozilla.org listing

What the developer hub asks for, kept here so a listing is a copy and paste and every
version says the same thing. The first version can go up through the release workflow
(`web-ext sign --channel listed` creates the listing from `amo-metadata.json`) or by hand
in the developer hub; every later version goes through `.github/workflows/release.yml`.

## Account

A Firefox Add-ons developer account under the company. Free. On the account's API keys
page, generate a JWT issuer and secret; they are `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` in
the repository's secrets:

```sh
gh secret set AMO_JWT_ISSUER
gh secret set AMO_JWT_SECRET
```

## Package

The release workflow uploads two files: `zoreal-mark-firefox-<version>.zip`, the
extension, and `zoreal-mark-firefox-<version>-source.zip`, the source tree, because the
package is bundled and Mozilla's reviewers rebuild it from source and compare. The
README's Development section is the build instruction the archive carries: Node 22 or
later, `npm ci`, `npm run build`.

The add-on id is `mark@zoreal.com`, in the manifest. Firefox 140 or later on desktop.

## Metadata sent with the upload

`amo-metadata.json`: categories Social & Communication and Privacy & Security, the
summary (250 characters at most), the homepage, the support URL, the tags, the MIT licence,
and the notes to the reviewer. Fields set on the listing by hand are not overwritten by
later uploads unless they appear in the file.

## Description

The plain-text description in the Chrome listing (`store/chrome-web-store.md` in
zoreal-mark-chrome) is the description here too; the developer hub accepts light
Markdown, so the section headings may be made bold. Firefox users install from the store
only, so the "by hand" paragraph does not apply.

## Privacy

- **Privacy policy:** the developer hub takes the policy as text. Paste: "The ZOREAL Mark
  privacy notice is at https://zoreal.com/privacy/mark-extension. In short: verifying a
  Mark fetches a public record by its code and sends nothing about you or the pages you
  read; signing sends the text you chose to sign, sealed so that ZOREAL cannot read it,
  and the address of the page it is for; sighting reports are off by default. No
  analytics, no advertising, no sale of data."
- **Data collection:** declared in the manifest under
  `browser_specific_settings.gecko.data_collection_permissions` as website content and
  browsing activity, both required, because signing sends the sealed text and the page
  address. Firefox shows this at install. Verifying sends nothing about the reader.
- **Permissions:** all sites (the content script and host access), storage, scripting,
  contextMenus, alarms. The justifications in the Chrome listing apply word for word.

## Store listing

- **Name:** ZOREAL Mark (from the manifest).
- **Icon:** `store/icon-128.png`, 128 x 128.
- **Screenshots:** the three in `store/screenshots/`, 1280 x 800, in order. They were
  taken in Chrome; the pages, the badges, the card and the popup render the same in
  Firefox, and a Firefox set replaces them when the listing is made.
- **Homepage:** `https://zoreal.com/product/mark`
- **Support:** the repository's issues page.

## Review

Listed versions are reviewed by Mozilla, usually within days for a first version and
faster for updates; automated checks run at upload and `npm run lint` runs the same
checks locally. The remaining warnings are about `innerHTML` assignments in the content
script and the popup; every one writes markup the extension built from escaped text or
its own templates, never from a page or a record, and the reviewer notes say so.
