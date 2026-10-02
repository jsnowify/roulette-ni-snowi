# Roulette ni snowi

**One spin. One brand. One week.** Whatever the roulette gives you becomes the brand you have to build from scratch in seven days.

The challenge is to make the entire brand: concept and positioning, brand name, logo and visual identity, color palette, typography, graphic direction, UI design system, website design and development, brand assets, mockups, and a final presentation or showcase.

No account or backend. Everything runs in your browser.

## The challenge

1. **Spin.** Draw a brand name and creative category, with an optional mood. The result is saved immediately, including during the reel animation. Refreshing keeps the same assignment.
2. **Accept.** Commit to the assigned brand and start the seven-day clock. Acceptance also saves the brief when the archive has room.
3. **Build.** Work through seven suggested daily milestones. Progress and the original deadline survive reloads and sync across open tabs in this browser.
4. **Finish.** Complete all milestones, then finish the challenge. A finished challenge stays visible until you explicitly start your next one.

An overdue challenge keeps its brief and progress so you can finish the work. The checklist is self-reported; there is no upload requirement or judging system. Completion can happen earlier than the deadline.

Reel locks and repeated spins have been replaced by one fixed assignment. You cannot change its category or remove its mood after drawing. Shape the custom entry pool before a draw or for a future challenge. The assigned name is the starting point for developing the complete identity.

## Supporting tools

- **Extra reels** adds a Mood reel before you draw.
- **Today's challenge** draws the same built-in assignment for everyone on the same local calendar date. It also counts as your one draw.
- **Custom entries** adds up to 30 entries per reel, with a 40-character limit and duplicate checks. Removing an entry does not remove an existing assignment.
- **Design workbench** suggests editable palettes and font pairings for your category and mood. Explore other visual expressions while keeping the brand constraint.
- **Live preview** supports custom text, Google Fonts, two to four palette colors, contrast checks, contrast correction, and CSS export.
- **Copy brief / Copy link** shares the assignment. Manual text selection is offered when the browser blocks clipboard access.
- **Project archive** preserves existing saved briefs, completion checks, and removals, up to 200 entries. Finishing a challenge marks its matching archived brief complete.
- **Sound** is optional and off by default. Press `Space` while the page body is focused to draw once.
- **Previous assignments** keeps the last seven assignments in the current session.

Space Grotesk leads the typography, paired with IBM Plex Mono for labels and controls. The monochrome identity, angular reel bands, rolling-eye header, and optional Poke Snowi counter remain. The layout uses consistent spacing, compact reels, a project cover for the result, and responsive build milestones. Keyboard focus follows the draw and acceptance. Reduced motion is respected.

## Share links

```text
?brand=Hoshi&category=Luxury&mood=Calm
```

Brand and category are required; mood is optional. A shared assignment can be accepted without another spin. An existing challenge takes precedence over a different shared link until you finish it.

URL values must match built-in entries or custom entries stored in the receiving browser. Use Copy brief to share custom assignments with someone who has different entries. Once drawn or accepted, custom assignments remain available even if their entries are later removed.

## Run locally

```sh
npm install
npm run dev
```

```sh
npm run lint
npm run build
```

The app uses React, TypeScript, Vite, Motion, and Lenis. Touch and reduced-motion scrolling remain native; Lenis eases desktop wheel scrolling. Production syntax targets Chrome/Edge 87, Firefox 78, and Safari 14; runtime support still depends on the browser and host webview.

## Structure

```text
src/
  App.tsx                       # draw lifecycle, sharing, sound, and page composition
  index.css                     # shared layout, typography, controls, and breakpoints
  components/
    ChallengeIntro.tsx          # challenge introduction, process, and scope
    ChallengePlan.tsx           # seven-day deadline, milestones, and completion
    Reel.tsx                    # animated reels with transition/timeout completion
    UiStyleGuide.tsx            # palette, typography, preview, and CSS tools
    Header.tsx                  # wordmark, rolling eye, and Poke Snowi
    SavedBriefs.tsx             # saved project archive
    CustomEntries.tsx           # custom draw pools
  hooks/
    useChallenge.ts             # immediate persistence and cross-tab synchronization
    useSavedBriefs.ts           # saved briefs and legacy migration
    useCustomEntries.ts         # validated custom entries
  lib/
    challenge.ts                # challenge model, validation, and seven-day build plan
    brief.ts                    # brief text and URL handling
    random.ts                   # shuffle bag, daily seeded draw, and animation plans
```

## Data and privacy

Assignments, progress, saved briefs, entries, and settings live only in this browser's localStorage. Clearing browser data removes them. If storage is blocked or full, the app works in memory but cannot guarantee persistence. A full project archive does not prevent accepting or tracking a challenge.

Google Fonts requests use system fallbacks if unavailable. Sound files load only after sound is enabled and reuse one cached Web Audio context. Muting or hiding the page stops playback. Missing files and blocked audio APIs do not block the challenge.

The optional Poke Snowi counter contacts `abacus.jasoncameron.dev`; it does not receive your brief. Visible pages follow the shared count through Server-Sent Events, with a polling fallback. Hidden pages pause the connection, and failed increments do not invent count changes. Counter failures do not block the challenge.

## Browser checks

```sh
npx playwright install chromium firefox webkit
npm test
```

On this Windows machine, installed Chrome, Edge, and Brave can be used:

```powershell
$env:PLAYWRIGHT_LOCAL_BROWSERS = '1'
npm test
Remove-Item Env:PLAYWRIGHT_LOCAL_BROWSERS
```

The Brave executable path is configured in `playwright.config.ts`. Tests mock the counter and external fonts. Coverage includes the full challenge lifecycle, reloads during a draw, cross-tab progress, overdue assignments, corrupt or blocked storage, a full archive, clipboard fallback, sound caching/muting, transition timeout, backgrounding, long custom text, keyboard interaction, short viewports, and layouts from 280 to 2560 pixels.

Touch emulation does not establish real Messenger or mobile-device compatibility. Real iPhone/iPad, Android, and embedded-browser checks remain useful for audio policies, viewport changes when the keyboard opens, and clipboard restrictions.

## Search and sharing

Static HTML, Open Graph/Twitter summaries, the no-JavaScript introduction, and WebApplication structured data communicate the seven-day brand challenge. The canonical URL is `https://roulette-ni-snowi.vercel.app/`. Google site verification, robots.txt, and sitemap.xml are retained. If the production domain changes, update these together.

## Credits

Made by [snowi](https://snowi-cambronero.vercel.app/).
