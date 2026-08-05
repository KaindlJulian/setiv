import { cn } from "../lib/cn";

const scopes = [
    {
        cone: false,
        label: "Full",
        title: "The whole implication graph (including nodes not relevant for conflict analysis)",
    },
    {
        cone: true,
        label: "Cone",
        title: "Only the predecessors of the current conflict",
    },
];

interface Props {
    cone: boolean;
    onChange(cone: boolean): void;
}

export function GraphScopeToggle({ cone, onChange }: Props) {
    return (
        <div class="join">
            {scopes.map((s) => (
                <button
                    key={s.label}
                    type="button"
                    onClick={() => onChange(s.cone)}
                    title={s.title}
                    aria-pressed={s.cone === cone}
                    class={cn(
                        "btn join-item btn-xs",
                        s.cone === cone && "btn-active",
                    )}
                >
                    {s.label}
                </button>
            ))}
        </div>
    );
}
