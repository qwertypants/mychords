import definitions from "./extended-definitions.json";

export function extendedDefinition(suffix: string) {
  return definitions.find(definition => definition.suffix === suffix);
}

export function normalizeChordSymbol(text: string): string {
  return text.trim().replace(/♯/g, "#").replace(/♭/g, "b")
    .replace(/\s+/g, "").replace(/\(add(\d+)\)/gi, "add$1").toLowerCase();
}
