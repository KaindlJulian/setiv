import { cn } from "../lib/cn";

const scopes = [
    {
        cone: false,
        label: "Full",
        title: "The whole trail, including decision levels this conflict never touched",
    },
    {
        cone: true,
        label: "Cone",
        title: "Only the ancestors of κ — the sub-DAG conflict analysis reads",
    },
];

interface Props {
    cone: boolean;
    onChange(cone: boolean): void;
}

export function GraphScopeToggle({ cone, onChange }: Props) {
    return (
        <div class="flex flex-wrap items-center gap-1">
            {scopes.map((s) => (
                <button
                    key={s.label}
                    onClick={() => onChange(s.cone)}
                    title={s.title}
                    class={cn(
                        "cursor-pointer rounded border px-2 py-1 text-xs",
                        s.cone === cone
                            ? "border-gray-700 bg-gray-700 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                    )}
                >
                    {s.label}
                </button>
            ))}
        </div>
    );
}
