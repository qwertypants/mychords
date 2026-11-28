# Third-party notices

Chord fingerings derive from David Rubert's chords-db, MIT licensed.
Source: https://github.com/tombatossals/chords-db
Pinned commit: df06fa7b425cf5fd29485ff6591236b3557e3fac.
The full MIT license is in vendor/chords/LICENSE. Input hash, exclusions and standard movable-shape additions are recorded in docs/catalog-coverage.json.

Coordinates are normalized to absolute frets. Closed fingerings are octave-shifted within fret 22. Known incomplete finger assignments and shapes missing defining tones are excluded; exclusions are pinned in vendor/chords/reviewed-rejections.json. Fifth omissions are allowed in seventh and extended guitar grips. The upstream suffix `alt` describes major-flat-five triads, not conventional altered-dominant seventh chords; the UI labels it “Major ♭5” and `(b5)`.

Acoustic guitar samples: Nicholas Brosowsky, tonejs-instruments.
Source: https://github.com/nbrosowsky/tonejs-instruments
Pinned commit: 622c2f1c32c8cfce4158ddc3eb26e518ddef37e5.
Samples are licensed under Creative Commons Attribution 3.0 Unported:
https://creativecommons.org/licenses/by/3.0/ . Samples are redistributed unchanged, with playback pitch/rate and gain adjusted at runtime. File hashes are recorded in public/audio/manifest.json.

Supplemental extended-chord grips are original MyChords arrangements, licensed under MIT in vendor/chords/SUPPLEMENTAL-LICENSE. Provenance and fingering review are documented in docs/extended-chords.md and vendor/chords/supplemental.json; they are not derived from chords-db.

Tonal chord-type and interval packages are MIT-licensed development tools used to check formulas during catalog generation/audit. Source and license: https://github.com/tonaljs/tonal and https://github.com/tonaljs/tonal/blob/main/docs/LICENSE . Versions are pinned in package-lock.json. No Tonal code is bundled into the application. Open Music Theory is consulted as a notation/voicing reference; its prose and diagrams are not redistributed.
