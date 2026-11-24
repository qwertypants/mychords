# Verification record

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
