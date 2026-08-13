import { cn } from "@/lib/cn";

export interface ScopeOption<T> {
    value: T;
    label: string;
    title: string;
}

interface Props<T> {
    scopes: readonly ScopeOption<T>[];
    value: T;
    onChange(value: T): void;
}

export function ScopeToggle<T>({ scopes, value, onChange }: Props<T>) {
    return (
        <div class="join">
            {scopes.map((s) => (
                <button
                    key={s.label}
                    type="button"
                    onClick={() => onChange(s.value)}
                    title={s.title}
                    aria-pressed={s.value === value}
                    class={cn(
                        "btn join-item btn-xs",
                        s.value === value && "btn-active",
                    )}
                >
                    {s.label}
                </button>
            ))}
        </div>
    );
}
