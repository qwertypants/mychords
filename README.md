# MyChords

A mobile-first guitar chord notebook. Browse exact fingerings across the neck, preview sampled acoustic guitar, arrange chords into named sections, and save songs in your browser.

## Run locally

Use Node.js 22.12+ and npm. Development was verified with Node 26.7.0 and npm 11.19.0.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open the Local URL printed by Vite. For a phone on the same Wi-Fi, open its Network URL. Browser storage is separate for each origin: localhost and a LAN address have separate libraries.

## Use the notebook

1. Choose **New song**, name it, and open **Add chord** in a section.
2. Choose a root, chord type and neck region. **Hear** previews the exact shape; **Add** inserts it into the active section. Close the library to see your song.
3. Drag a chord's handle to reorder it, or use its earlier/later arrows. The same voicing can appear several times.
4. Add and name sections such as Verse and Chorus. Use the play button beside a section or **Play song** to hear a simple sequence. **Stop** cancels playback, including a pending sample load.
5. Choose **Save**. The “Saved on this browser” message appears only after a successful write. Reopen songs from **My songs**.

Playback is a reference preview: one acoustic strum per chord at fixed spacing. There are no tempo, beat-count or strumming-pattern controls.

## Chord coverage

The bundled catalog contains 4,968 audited fingerings, 12 chromatic roots and 82 source suffixes, with positions through fret 22 in standard EADGBE tuning. It includes major, minor, power, suspended, diminished, augmented, added, seventh, extended, altered and slash chords. Different suffixes have different availability across roots and positions; this is not every theoretical chord or possible fingering.

The source dataset, notices and reviewed exclusions are in `vendor/chords/`. The importer normalizes relative source frets, verifies sounding notes, adds octave variants only for closed shapes, and supplements major/minor regional coverage with standard movable barre forms. It excludes 110 source records with incomplete fingerings, inconsistent tones or missing defining tones. The upstream `alt` triads are displayed as major flat-five rather than altered-dominant sevenths.

```sh
npm run catalog:import
npm run catalog:audit
npm run audio:import
```

Chord imports are reproducible from the checked-in source. Audio imports download nine pinned acoustic samples; there is no runtime third-party lookup. Changes to catalog exclusions require review against `vendor/chords/reviewed-rejections.json`. Counts and source hashes are in `docs/catalog-coverage.json` and `public/audio/manifest.json`.

## Saving and privacy

Songs use `localStorage` under `mychords.library.v1`. There is no account, server database or synchronization. Clearing browser data removes songs. A private browsing session may discard them when closed. Keep important ideas elsewhere too.

A damaged or unsupported saved library is preserved, with options to download its raw contents, retry, or explicitly replace it. Failed writes keep the draft in memory and mark it unsaved. Unsaved navigation offers Save, Discard and Cancel.

This version uses standard six-string tuning, no capo or alternate tunings. It does not include song deletion, chord editing, song import/export or offline-install support.

## Verification and production build

```sh
npm test
npm run lint
npm run catalog:audit
npx playwright install chromium webkit
npm run test:e2e
npm run build
npm run preview
```

The build uses relative asset paths and can be hosted in a directory such as `/mychords/`. Serve the contents of `dist/` at that directory; deployment is not configured. Vite currently reports a chunk-size advisory for the bundled catalog and app, about 195 KB gzipped for JavaScript. Samples load only when sound is requested.

See [verification notes](docs/verification.md) for actual checks and remaining physical-device/listening checks. The application exposes credits at `/credits.html`; complete notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
