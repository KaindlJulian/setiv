import type { VarNames } from "@/lib/compile";
import { computed, signal } from "@preact/signals";

export type NamingMode = "names" | "dimacs";

const storageKey = "setiv-naming";

/** variable names mappings for the run */
export const varNames = signal<VarNames | null>(null);

export const namingMode = signal<NamingMode>(
    localStorage.getItem(storageKey) === "dimacs" ? "dimacs" : "names",
);

export function setNamingMode(mode: NamingMode) {
    localStorage.setItem(storageKey, mode);
    namingMode.value = mode;
}

/** The names to render with, or null when literals should stay numeric. */
export const activeNames = computed(() =>
    namingMode.value === "names" ? varNames.value : null,
);

export function varLabel(v: number): string {
    const active = activeNames.value;

    if (active === null) {
        return String(v);
    }

    return active[v] ?? `aux`;
}

/** Longest active name, for charts that must reserve room for a label. */
export const longestName = computed(() => {
    const active = activeNames.value;

    return active
        ? active.reduce((n, name) => Math.max(n, name?.length ?? 0), 0)
        : 0;
});
