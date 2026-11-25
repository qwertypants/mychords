# Verification record

## Offline PWA — 2026-11-25

Verified locally with Node 26.7.0 and npm 11.19.0. This change has not been pushed or deployed.

- `npm test`: 29 passing tests, including install availability, dismissal/re-offer, standalone mode, installation errors and iPhone instructions with focus return.
- `npm run test:e2e`: 31 passing checks, two intentional skips for Chromium-only touch protocol coverage.
- `npm run test:pwa`: 23 passing checks, one intentional skip for the Chromium-only installability protocol. Production files run at both `/` and `/mychords/`, in desktop/mobile Chromium and iPhone-emulated WebKit.
- Lint, catalog audit, TypeScript/build and diff whitespace checks pass. The existing app/catalog chunk-size advisory remains.

The PWA suite waits for a complete installation, disconnects, and opens a fresh page before playing any sound. It verifies a nonzero Web Audio analyser signal from the cached samples, browses/adds a chord, saves and reopens a song, and opens credits and a font license offline. It checks manifest icons, scope and mobile overflow. Screenshots from all three browser projects are under ignored `artifacts/pwa-*.png`; the mobile editor and maskable icon were visually inspected.

Lifecycle tests serve changed production release manifests and resources through a local fixture server. They prove that an update waits while another window remains open, an unsaved draft stays present, saved songs survive activation and an offline reload, and another app's precache stays intact. Failed update downloads leave the active release and guitar playback usable offline. An incomplete first installation never announces readiness. The fixture server reports activation so tests can reopen only after the browser has activated the waiting worker; it does not force activation. These test controls are not part of the shipped build.

The generated precache reports approximately 2.8 MiB and includes all nine samples, fonts, chord data, credits and licenses. Cache entries are revised at build time. Activation prunes obsolete entries only in the current scoped MyChords cache; broad legacy-cache cleanup is disabled to protect neighboring PWAs. Service workers are disabled in development.

`npm audit` reports four moderate advisories through the new build-only Workbox/glob/minimatch dependency chain. The suggested automatic fix downgrades the PWA plugin; no forced downgrade or incompatible transitive override was applied. These dependencies run during builds and are not shipped as application runtime code.

Physical iPhone/Android installation, OS launch/splash behavior and human listening remain unverified. For those checks, use HTTPS, install via the browser or Safari Share menu, wait for **Ready offline**, then close and reopen in airplane mode. Test saving and sound. Save work before closing every app window to activate an available update. Browser storage eviction or clearing site data removes offline resources and may remove songs; installed and browser storage may be separate.

## Original app verification

Verified locally on 2026-11-24. No push or deployment was performed.

## Automated checks

- `npm test`: 21 passing tests. Covers literal guitar MIDI registers, catalog filters, independent Hear/Add actions, immutable editing of repeated chord occurrences, storage roundtrips and errors, save/reopen UI, unsaved navigation, scheduling and cancelled loads.
- `npm run lint`: passes without warnings.
- `npm run catalog:audit`: 4,968 unique voicings, 12 roots, 82 suffixes, 110 documented source exclusions. Validates fret/finger ranges, pitch-class rules and major/minor coverage in low/middle/high neck regions. Import checks every original shape against its source MIDI pitches.
- `npm run build`: TypeScript and Vite pass. Vite gives a size advisory for the bundled app/catalog chunk (approximately 195 KB gzipped JavaScript). No build errors.
- `npm run test:e2e`: 22 passing checks and two intentional skips. The touch-protocol test runs on Chromium mobile only; its duplicate desktop/WebKit invocations are skipped.
- Browsers: Chromium 159.0.8154.6, mobile Chromium emulation and WebKit 27.2 with an iPhone viewport. Runtime: Node 26.7.0, npm 11.19.0.

Browser coverage includes exact selected voicings, independent duplicate occurrences, sections and saved-song isolation; corrupted-storage preservation; failed-save draft retention; modal focus return; desktop pointer dragging; touch dragging and page scrolling outside handles; live sample fetch/decode; sequence highlighting; failed audio load/retry; and Stop.

A real AudioContext, decoded bundled MP3s and an analyser confirm nonzero output during the preview and silence after Stop in both engines. The 400 ms measured window remains below digital full-scale. This proves the tested signal path, not human listening quality or every possible chord's loudness.

## Production artifact and visuals

The built `dist/` was served under `/mychords/` on a temporary local HTTP server. Chromium and WebKit loaded the actual production assets, previewed real guitar sound, saved/reopened a two-voicing song, and produced no browser console or network errors.

Home, editor and picker were checked at 320, 390, 768 and 1280 CSS pixels without horizontal overflow. Desktop, phone, picker and editor screenshots were inspected. Native modal focus behavior differed on WebKit; explicit opener focus and return focus fixed it. Route changes focus the new main content.

Nine bundled sample files match their SHA-256 manifest. Fonts and samples are self-hosted, with notices and license files included. No third-party runtime requests are needed.

Local screenshots are under ignored `artifacts/`; they are evidence from this workstation, not deployed assets.

## Remaining manual checks

Physical iPhone/Android operation and human listening have not been verified. WebKit emulation is not a physical iPhone test. To check:

1. Open the dev server's Network URL on a phone sharing the same Wi-Fi, with the phone's media volume audible.
2. Tap Hear on open C and a high-position C. Confirm an acoustic guitar timbre, the intended register differences and comfortable volume.
3. Add both voicings, including a repeat, to Verse. Add chords to Chorus. Play each section and the whole song; confirm the order and simple strum transitions.
4. Press Stop during playback and immediately after requesting sound. Rapidly switch between individual chord previews and check that old previews do not resume later.
5. Drag by a handle, scroll outside it, and use the alternate arrow buttons. Save, reload and reopen.

## Scope and implementation notes

The catalog adapter is `src/chords/catalog.ts`; generated data is `src/chords/voicings.json` to avoid module/JSON basename ambiguity. Styles are split into shell, editor, picker and responsive files. `src/songs/preview.ts` contains section/song flattening. These are small file-map refinements to the implementation plan.

Storage recovery requires explicit confirmation before replacing unreadable data. Save failures never report success. There is no cloud sync or rhythm sequencer. No formal WCAG compliance audit or human screen-reader audit is claimed.
