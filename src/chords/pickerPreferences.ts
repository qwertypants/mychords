import { catalog, roots } from "./catalog";
import { extraCategories, primaryCategories, type Category } from "./browse";

const KEY = "mychords.pickerOptions.v1";
const categories: readonly string[] = [...primaryCategories, ...extraCategories];
const regions = ["all", "0", "5", "10", "15"];

export type PickerPreferences = {
  root: string;
  category: Category;
  region: string;
  text: string;
  selectedGroupId: string | null;
  more: boolean;
  filtersExpanded: boolean;
};

export function readPickerPreferences(): PickerPreferences {
  const defaults: PickerPreferences = {
    root: "C",
    category: "All",
    region: "all",
    text: "",
    selectedGroupId: null,
    more: false,
    filtersExpanded: !window.matchMedia("(max-width: 600px), (max-height: 600px)").matches,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return defaults;
    const value = saved as Record<string, unknown>;
    const text = typeof value.text === "string" && value.text.length <= 200 ? value.text : "";
    return {
      root: typeof value.root === "string" && (value.root === "" || roots.includes(value.root)) ? value.root : defaults.root,
      category: typeof value.category === "string" && categories.includes(value.category) ? value.category as Category : defaults.category,
      region: typeof value.region === "string" && regions.includes(value.region) ? value.region : defaults.region,
      text,
      selectedGroupId: text && typeof value.selectedGroupId === "string" && catalog.some(v => `${v.root}:${v.suffix}` === value.selectedGroupId) ? value.selectedGroupId : null,
      more: typeof value.more === "boolean" ? value.more : defaults.more,
      filtersExpanded: typeof value.filtersExpanded === "boolean" ? value.filtersExpanded : defaults.filtersExpanded,
    };
  } catch {
    return defaults;
  }
}

export function writePickerPreferences(value: PickerPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // The current picker still works when browser storage is unavailable.
  }
}
