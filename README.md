# Instagram Clean

One readable [userscript](instagram-clean.user.js) for Instagram in iPhone Safari. Reels and Explore are blocked by default. Stories, photos, ordinary videos, profiles, DMs and account search remain available. There is no build, backend, runtime dependency, telemetry or account setup outside Instagram.

**Use a Home Screen bookmark that opens Safari, with “Open as Web App” OFF.** Standalone Home Screen apps are not a reliable Userscripts target. This project cannot guarantee removal of every future Instagram surface: URL blocking is deterministic, while feed recognition depends on the markup Instagram exposes. No authenticated Instagram session or physical iPhone was available for validation.

## Host it once on GitHub

Create a **public, empty** GitHub repository (for example `instagram-clean`), without generating a README or license. In this folder's VS Code PowerShell terminal, replace `YOUR_USERNAME` and `YOUR_REPO` below:

```powershell
npm install
npm test
npm run check
git init -b main
git add .
git commit -m "Add Instagram Clean userscript"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Git may ask you to sign into GitHub or set your commit name/email on first use. These are development credentials, unrelated to Instagram. The repository does not contain credentials.

Your install URL is immediately available after pushing:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/instagram-clean.user.js
```

Open that exact URL in Safari. Do not use GitHub's `/blob/` source viewer. The URL's **path** ends in `.user.js`, which is what Userscripts requires. Raw GitHub serves text directly; JavaScript MIME type is not a documented installer requirement. Raw is the recommended choice because it needs no Pages configuration or deployment job. It has not been physically tested on this iPhone; if Safari downloads rather than displays it, use the Files fallback below.

GitHub Pages is also a zero-cost option for a public repository, but there is no established MIME/update reliability advantage for this installer. If you prefer it: repository **Settings → Pages → Deploy from a branch → main → /(root) → Save**. Wait for deployment, then use `https://YOUR_USERNAME.github.io/YOUR_REPO/instagram-clean.user.js`. No generated site is needed. The supplied Actions workflow runs tests; it does not publish anything. [GitHub publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

# 5-Minute iPhone Setup

Have your hosted install URL ready before starting.

1. Install the free **Userscripts**, by **Justin Wasack**, from the [App Store](https://apps.apple.com/app/userscripts/id1463298887). Its open-source project is `quoid/userscripts`.
2. Open the Userscripts app once. Keep its default local scripts directory. Modern releases choose one automatically. If asked, tap **Set Userscripts Directory** and select a dedicated folder in **On My iPhone**. Remember that folder; do not select your whole Downloads folder. Avoid iCloud syncing complexity unless you need it.
3. Open iPhone **Settings → Apps → Safari → Extensions → Userscripts → Allow Extension**. Enable it for the Safari profile you will use, if profiles are configured.
4. In **Safari**, paste your raw GitHub install URL into the address bar. The page should show JavaScript starting with `// ==UserScript==`.
5. Tap Safari's **Page Menu** button beside the address field (older layouts show **aA**). If necessary, tap **Manage Extensions** and turn on Userscripts. Open **Userscripts** from this menu.
6. If Safari requests website access on `raw.githubusercontent.com`, allow this visit/day for installation. You do not need permanent access to all websites. Tap the Userscripts installation prompt, then **Install** and confirm if prompted. Labels can vary between app releases.
7. Open `https://www.instagram.com/` in Safari. Open **Page Menu → Userscripts**. When asked, choose **Always Allow on This Website** for Instagram. Leave other websites at **Ask** or **Deny**. If you use the bare `instagram.com` host and it does not redirect, allow that host too. The script itself matches only these two HTTPS hosts.
8. Check that **Instagram Clean** appears and is enabled in the Userscripts popup. Reload Instagram after installation/permission changes.
9. Log into Instagram using Instagram's own login page, including its normal two-factor prompt if applicable. Never enter your password or session token into the script, GitHub, or Userscripts.
10. Verify that Reels and Explore navigation are gone. Type `https://www.instagram.com/reels/` in the Safari address bar: it should return to Instagram home. Check a profile, an ordinary photo, account search and a Story. DMs/likes/comments should retain their normal web behavior.
11. While on Instagram home, tap **Share → Add to Home Screen**. In the compact Safari layout, **More (…) → Share** may be needed. If the action is missing, scroll to **Edit Actions** and add it. Turn **Open as Web App OFF**, name it **Instagram Clean**, then tap **Add**.
12. Tap the new Home Screen icon and verify that it opens **Safari** and Reels are still absent. Optionally remove the native Instagram app to avoid its notifications and links pulling you back in: touch and hold its icon → **Remove App → Delete App**. Removing it from the Home Screen alone does not uninstall it.

Apple documents extension activation under [Safari extension settings](https://support.apple.com/guide/iphone/iphab0432bf6/ios). Userscripts documents direct URL installation, its default directory, and refreshing the popup after file changes in its [usage guide](https://github.com/quoid/userscripts#usage). The extension may offer broad access, but this setup only needs Instagram and temporary access to your script host.

**Files fallback:** if the installer does not appear, save `instagram-clean.user.js` into the directory shown in the Userscripts app using Files. Ensure the filename has not acquired `.txt` or a duplicate suffix. Open the Userscripts popup once to rescan, enable Instagram Clean, then reload Instagram. No cable or development tooling is involved.

## Home Screen: the two modes

**Recommended — Safari bookmark:** Safari → Instagram → Share → Add to Home Screen → **Open as Web App OFF** → Add. Keep Safari as your default browser if the shortcut otherwise opens a different browser. This keeps the Safari extension available. Recreate an existing standalone icon; installing the script does not change that icon's mode.

**Standalone — Open as Web App ON:** the same steps with the switch **ON** create a separate app-like window. Apple explains this flow in [Turn a website into an app](https://support.apple.com/guide/iphone/iphea86e5236/ios); WebKit explains the [Home Screen toggle introduced in Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/). This does **not** establish that Safari web extensions run there. Userscripts' [PWA compatibility issue #251](https://github.com/quoid/userscripts/issues/251) reports the limitation. No current authoritative guarantee of iPhone standalone injection was found. Do not rely on this mode to block Reels; use the Safari bookmark above. If your iOS version has no toggle, use Instagram directly in Safari until you can create a bookmark that launches Safari.

## Configuration

Edit `CONFIG` near the top of `instagram-clean.user.js` on Windows, push and reinstall. The downloaded file contains your settings; an update replaces them. Keep your preferred settings in your repository.

```js
const CONFIG = {
    blockReels: true,
    blockExplore: true,
    removeSuggestedPosts: false,
    removeSuggestedAccounts: false,
    removeStories: false,
    feedPostLimit: null,
    debug: false,
    showToast: false
};
```

| Option | Behavior |
| --- | --- |
| `blockReels` | Hide and block recognized Reel links, buttons, posts and shelves. |
| `blockExplore` | Block `/explore/` recommendation routes; preserve `/explore/search/` account search. Tag/location Explore pages are also blocked. |
| `removeSuggestedPosts` | Hide a home-feed unit with an explicit suggested/recommended-post heading. Plain caption text is ignored. |
| `removeSuggestedAccounts` | Hide semantic account shelves with exact recommendation headings; ambiguous post containers survive. |
| `removeStories` | Block Stories links/routes and recognized labeled Stories shelves. |
| `feedPostLimit` | `null` is unlimited. A positive integer such as `25` caps recognized posts during a feed visit. Invalid values disable it. |
| `debug` | Tagged diagnostic messages only; never logs URLs, post text, usernames or messages. |
| `showToast` | Optional brief blocked-navigation notice; off by default. |

The finite feed counts unique `/p/` permalinks in semantic articles inside the home/following feed. It excludes recognized blocked units and navigation. It hides later recognized posts and displays “You’re caught up here.” It resets on URL changes/reload, uses only bounded in-memory IDs, and restores visibility outside the feed. Instagram can virtualize/reorder posts, so the count is approximate. Unknown structures are left visible. It does not stop Instagram's network loading or forcibly lock scrolling.

## Updates

Edit the userscript `@version` from `1.0.0` to `1.0.1` for a patch release. Optionally keep the development package version aligned with `npm version patch --no-git-tag-version` (this does **not** edit userscript metadata). Run checks, commit and push.

On iPhone: **open the same install URL → Page Menu → Userscripts → install/update/replace the existing script → reload Instagram**. Confirm the new version in the installer. If your release refuses a duplicate instead of offering replacement, use Files to replace the existing file in the Userscripts directory, reopen the popup, and reload. Keep only one enabled copy. Host caches can take a few minutes; append `?v=1.0.1` if necessary — the path still ends in `.user.js`.

`@version` is supported, but `@updateURL`/`@downloadURL` are deliberately omitted. The [metadata documentation](https://github.com/quoid/userscripts#metadata) warns of incomplete updating, tracked by [#248](https://github.com/quoid/userscripts/issues/248); [#895](https://github.com/quoid/userscripts/pull/895) disabled automatic update checks. Hosting on Pages would not fix extension-side update behavior. Manual replacement is the supported workflow here.

# Development on Windows

Install Node.js 22 or newer (24 recommended) and Git for Windows. Open this folder in VS Code. There is one development dependency, jsdom, for representative DOM tests; it is never loaded by the phone.

```powershell
npm install
npm test
npm run check
```

For subsequent development:

```powershell
# Edit instagram-clean.user.js and its @version in VS Code first.
npm test
npm run check
git add .
git commit -m "Improve Instagram surface detection"
git push
```

Then reopen the install URL on iPhone and replace the installed script. There is **no production compile step**. CI uses `npm ci`, syntax checks and the same tests on pushes and pull requests. Raw GitHub reflects a push independently of CI, so run tests before pushing.

## Detection and maintenance

- `instagramURL`, `normalizedPath`, `isReelURL`, `isExploreURL`, and `blockedURL` centralize navigation rules. Root `/reel/`, `/reels/`, profile Reels paths and defensive `/share/reel/` variants are covered. URL parsing handles queries, fragments, relative URLs, case and encoded paths. Non-Instagram origins are ignored.
- `RULES`, `labelKind` and `controlKind` centralize semantics. Safe explicit hrefs take precedence over labels. SVG titles and accessibility labels supplement URLs. English text is an exact, short fallback; a video tag alone is never evidence of a Reel.
- `findRemovableFeedContainer` picks only the nearest semantic unit, never an arbitrary chain of parent divs. Containers with nested articles or feed/navigation roots are rejected. An ordinary `/p/` post with a Reel link in its caption keeps its post body; only the link is hidden. Shared Reel links in DMs are blocked without hiding the message container.
- Nodes are hidden with owned attributes rather than detached from React. Hidden media are paused. Markers are reconsidered when hrefs/labels/children change so recycled elements can reappear.
- Capture handlers cover click, touch, pointer and keyboard activation. History wrappers reject blocked URLs; popstate, pageshow, mutation and focus checks recover to home using `location.replace`. One visible-tab URL comparison every two seconds covers isolated-world hooks or cached History functions. There is no periodic DOM scan. Direct navigation cannot be stopped before Safari requests the destination; recovery happens after injection.
- A MutationObserver batches changed subtrees into animation frames, coalesces overlapping roots and budgets work between roots. It ignores its own marker attributes. Full scans occur at startup and route changes; a very large initial subtree is still processed as one unit. No layout measurements or scrolling hooks are used.

**Research/validation boundary (2026-09-07):** the live public `/reels/` fetch returned HTTP 429. Authenticated mobile DOM, localization, Instagram experiments and iPhone battery/scroll performance were not observed. Fixtures model plausible semantic structures, not captured production markup. Unknown unlabeled buttons, div-only shelves, video posts exposed solely as `/p/`, and new redirect/share formats may escape detection. Preserving ordinary posts takes priority over guessing. The script is a local distraction aid, not an unbypassable content filter.

Userscripts supports `document-start`, `@grant none`, and `@inject-into auto`; auto allows its normal page/content context choice. In content scope, wrapping History does not necessarily intercept page-world calls, hence independent URL recovery. A strict site CSP or extension failure can prevent injection entirely. No userscript can enforce blocking while it is not running.

To refine a missed surface, provide a **sanitized minimal DOM snippet**, route shape, language, expected result, and iOS/Userscripts versions. Remove messages, account names and private content first. Add the smallest rule in the centralized layer and a fixture proving both the target and an adjacent legitimate post. Do not add generated CSS classes or broadly remove every video.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Script does not appear | Check the selected directory in Userscripts, `.user.js` filename and enabled toggle. Open its popup once after changing files, then reload. Use the Files fallback if direct installation fails. |
| “No matching script” | Confirm you are in Safari on `https://www.instagram.com/`, not a GitHub page, another browser or a standalone app. Check Instagram site permission and the active Safari profile. |
| Instagram changed its DOM / Reels button remains | Update/reinstall, reload, confirm config and permissions. If direct `/reels/` redirects but a button remains, its semantics are new; report a sanitized snippet. Unknown surfaces intentionally fail open. |
| Direct Reel URL still works | Verify script enabled and Instagram website permission, reopen popup and reload. Ensure you are in Safari. Wait up to two seconds for isolated-world SPA fallback. If even a fresh direct URL stays, injection may have failed (including CSP); DOM rules cannot fix disabled injection. |
| Home Screen web app does not run extension | Delete that icon and re-add from Safari with **Open as Web App OFF**. Confirm Safari's address bar and extension menu appear. |
| Update is not detected | Automatic updates are not used. Reopen hosted URL, confirm `@version`, replace manually, and reopen popup. Wait for host cache or add `?v=VERSION`. Remove duplicate enabled copies. |
| Feed limit misses posts | It requires unique `/p/` links in semantic articles. Unknown feed structures are not hidden speculatively. |
| A useful surface disappears | Disable the relevant config option and reinstall, or toggle off Instagram Clean and reload. Send a sanitized reproduction fixture. |
| Login, posting or search unavailable | Compare with the script disabled. Instagram web availability varies by account/browser; this script does not add native-app capabilities. If search opens only through Explore in your UI, set `blockExplore: false`. |

## Verification before relying on it

Automated tests cover URL normalization/classification, flags, headings, ancestor safety, dynamic links, recycling, capture blocking, History behavior, direct/popstate recovery, approximate feed limits and observer settling. `npm run check` checks syntax. jsdom does not emulate iOS Safari, Instagram React, actual navigation downloads or autoplay.

On your phone, also check: home/following scroll and loading; photo and carousel viewing; a normal video; profiles and follow controls; DMs; notifications; opening/closing comments; likes; account search; Stories; and whatever posting controls Instagram web exposes. Test Reel nav/profile links, a shared Reel link, a pasted Reel URL, SPA transitions, back/forward, and the Home Screen shortcut. With all optional settings off, these normal interactions should be unchanged. Test optional flags separately before keeping them enabled.

## Privacy and license

All script operations are local DOM/navigation changes. It does not read password fields, cookies, session tokens or browser storage, call Instagram APIs, send network requests, automate interactions, or use external code. Optional feed IDs exist only in memory during the current visit; debug output omits private content. Instagram itself continues its normal network activity. The Userscripts extension fetches the public script only when you install/replace it through its UI.

MIT licensed; see [LICENSE](LICENSE). Unaffiliated with Instagram, Meta or Userscripts.
