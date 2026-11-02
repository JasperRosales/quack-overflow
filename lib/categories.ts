import categories from "@/data/bug-categories.json";

export interface BugCategory {
  id: string;
  label: string;
}

export const BUG_CATEGORIES: BugCategory[] = categories;
export const CATEGORY_IDS = BUG_CATEGORIES.map((c) => c.id) as [string, ...string[]];

export function categoryLabel(id: string | undefined): string {
  return BUG_CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}
