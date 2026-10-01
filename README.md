# Roulette ni snowi

A random website brief generator for indecisive developers and designers. Spin the reels, get a brief, and build it.

> **Build Hoshi, a Luxury website. Mood: Calm.**

No account, no backend. Everything runs in the browser.

## Features

- **Slot-machine reels** for Brand, Category, and (optionally) Mood.
- **Lock a reel** to keep its value while the others spin.
- **Extra reels** toggle to add the Mood reel.
- **Custom entries**: add and remove your own brands, categories, and moods. Up to 30 per reel, saved in this browser.
- **Today's brief**: one brief that is the same for everyone on a given day.
- **Shuffle bag**: an item doesn't repeat until every item has come up.
- **Category notes**: a short, beginner-friendly explanation ("What it is" / "Think of") for each category.
- **Copy brief / Copy link**: share the brief as text or as a link. The URL always matches the current brief.
- **Save brief**: keep briefs in a list, tick them off when built, and remove them.
- **Earlier spins**: shows your last 7 spins.
- **Sound** toggle, off by default.
- **Keyboard**: press `Space` to spin.
- Respects `prefers-reduced-motion`.

## Share links

The current brief is stored in the URL:

```
?brand=Hoshi&category=Luxury&mood=Calm
```

`brand` and `category` are required, `mood` is optional. Opening a link with `mood` turns Extra reels on automatically. Values must match a built-in entry or a custom entry saved in the receiving browser. Use **Copy brief** to share custom briefs with someone who has different entries.

## Tech stack

- [React](https://react.dev) + TypeScript, built with [Vite](https://vite.dev)
- [Motion](https://motion.dev) for animation
- Native browser scrolling for touch, keyboard, and embedded browsers
- `localStorage` for saved briefs and settings (Extra reels, Sound)

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL Vite prints. Build for production with `npm run build`.

## Project structure

```
src/
├── App.tsx                  # main page: spin logic, controls, result, history
├── main.tsx                 # entry point
├── types.ts                 # Key, Brief, Plan types
├── index.css                # all styles
├── components/
│   ├── Header.tsx           # animated header ball
│   ├── PokeButton.tsx       # header easter egg
│   ├── Reel.tsx             # one slot-machine reel
│   ├── CategoryNote.tsx     # "What it is / Think of" note
│   └── SavedBriefs.tsx      # saved briefs list
├── data/
│   ├── brands.ts            # fake brand names
│   ├── categories.ts        # categories + explanations
│   ├── moods.ts             # moods
│   └── reels.ts             # reel definitions and merged item lists
├── hooks/
│   ├── usePersistentState.ts
│   ├── useSavedBriefs.ts
│   └── useCustomEntries.ts
└── lib/
    ├── brief.ts             # brief sentence, share link read/write
    ├── random.ts            # shuffle bag, daily seeded pick, spin plans
    ├── saved.ts             # saved brief model and storage cleanup
    ├── sound.ts             # sound effects
    └── storage.ts           # safe localStorage helpers
```

## Customizing the content

- **In the app**: open **Add your own entries**, choose a reel, and add an idea (up to 40 characters). Entries join the normal spin pool; Mood needs **Extra reels** enabled. Duplicate entries are rejected. Remove entries to exclude them from future spins; existing results and saved briefs stay available. Today's brief still uses only built-in entries.
- **Brands**: edit `src/data/brands.ts`. They are fake on purpose, so you're free to design anything.
- **Categories**: edit `src/data/categories.ts`. Each one has a `name`, a `what`, and a `think`. Keep the spelling of existing names, because saved briefs and share links use them.
- **Moods**: edit `src/data/moods.ts`.

## Data and privacy

Saved briefs, custom entries, and settings live only in your browser's `localStorage`. These are not sent anywhere, and clearing your browser data removes them.

Fonts are requested from Google Fonts with local font fallbacks. The optional Poke Snowi counter contacts `abacus.jasoncameron.dev`; it does not receive your briefs. Counter outages do not block the generator.

The shared poke count updates live using Abacus's [Server-Sent Events endpoint](https://v2.jasoncameron.dev/abacus). Open, visible pages receive changes from other visitors without a reload. If streaming is unavailable, the app refreshes every 10 seconds, backing off up to 60 seconds on read failures. Hidden pages close the stream and pause refreshes; returning reconnects and fetches the latest count. Pokes are shown in the count only after the server confirms them; the button waits for each increment request to finish so clicks are not silently dropped during background reads.

## Search and sharing

The static HTML includes Google site verification, a descriptive title and summary, Open Graph and Twitter previews, and WebApplication structured data. The canonical URL is `https://roulette-ni-snowi.vercel.app/`; shared brief query parameters canonicalize to the home page.

After deploying, verify the URL-prefix property in Google Search Console and submit `https://roulette-ni-snowi.vercel.app/sitemap.xml`. The verification tag must be present on the deployed page before Google can verify ownership. If the production domain changes, update `index.html`, `public/robots.txt`, and `public/sitemap.xml` together.

SEO references: [Google's developer guide](https://developers.google.com/search/docs/fundamentals/get-started-developers) and [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## Credits

Made by [snowi](https://snowi-cambronero.vercel.app/).

## Reliability and browser checks

Sound files load only after enabling sound or spinning with a saved sound preference. One Web Audio context is unlocked by that click or keypress, and the four decoded effects are cached. Muting or hiding the page stops active effects, cancels pending effects, and suspends the audio context. Slow downloads and missing files remain silent. Sound is optional; the app still works when audio APIs are unavailable. Device silent mode and embedded-browser policies still need device testing.

Reels complete through transition events, with a timeout fallback. Backgrounding completes the current spin without leaving the controls stuck. Reduced-motion spins finish immediately. Native scrolling avoids a continuous smooth-scroll animation loop. The decorative header uses transforms and pauses its main loop while hidden.

Production output explicitly targets Chrome/Edge 87, Firefox 78, and Safari 14 syntax instead of inheriting newer Vite defaults. This is a compilation target, not certification of every browser version: runtime APIs, Motion, and the host webview also determine compatibility. See [Vite browser compatibility](https://vite.dev/guide/build#browser-compatibility) and [WebKit media gesture policies](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/).

Run the production-browser regression suite:

```sh
npm ci
npx playwright install chromium firefox webkit
npm test
```

On this Windows machine, installed Chrome, Edge, and Brave can be tested without downloading Playwright browsers:

```powershell
$env:PLAYWRIGHT_LOCAL_BROWSERS = '1'
npm test
Remove-Item Env:PLAYWRIGHT_LOCAL_BROWSERS
```

The local Brave path is configured in `playwright.config.ts`; adjust it on another machine. Default projects remain Chromium, Firefox, and WebKit. Tests cover 280–1280px layouts, 40-character entries, normal and reduced motion, locking, daily picks, history, saving/reloading, custom entries, blocked storage/clipboard/audio, failed sound requests, audio reuse/muting, transition fallback, backgrounding, and touch portrait/landscape emulation. Counter requests are mocked, so tests do not change the shared counter.

Touch emulation and an altered user-agent string do not reproduce Messenger itself. Before release, check the deployed HTTPS site in real Messenger browsers on Android and iPhone, Safari on iPhone/iPad, and Firefox. Enable sound, spin several times, mute midway, switch apps/lock the phone, return and spin again. Verify Copy brief/Copy link (including manual fallback), save/reload, extra reels, custom entries with the keyboard open, portrait/landscape, and enlarged text. A blocked audio policy must leave the generator usable.

Local audit on October 1, 2026: all 66 tests passed across installed Chrome, Edge, and Brave. Lint and production build passed; the production dependency audit reported zero vulnerabilities. Firefox and WebKit browser downloads timed out, so those engines and real Messenger devices remain unverified. The three tested desktop browsers all use Chromium; they do not establish Safari or Firefox compatibility.

Storage being blocked or full keeps the app usable in memory, but settings and briefs may not survive reloading. A full saved list disables saving until an entry is removed. Today's brief uses the user's local calendar date; people on the same date get the same built-in choices.
