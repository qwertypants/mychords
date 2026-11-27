export function ChordToneLegend() {
  return (
    <div className="chord-tone-key" role="note" aria-label="Fretboard legend">
      <span data-tone="root">Root</span>
      <span data-tone="third">Third</span>
      <span data-tone="fifth">Fifth</span>
    </div>
  );
}
