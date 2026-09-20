import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { useDismiss } from "@/hooks/useDismiss";
import { namingMode, setNamingMode, type NamingMode } from "@/lib/naming";
import { Settings } from "lucide-preact";
import { useRef, useState } from "preact/hooks";

const namingModes: ScopeOption<NamingMode>[] = [
    {
        value: "names",
        label: "Names",
        title: "Show the variable names from the input formula",
    },
    {
        value: "dimacs",
        label: "DIMACS",
        title: "Show variables a the DIMACS integers",
    },
];

export function SettingsMenu() {
    const ref = useRef<HTMLDetailsElement>(null);
    const [open, setOpen] = useState(false);

    useDismiss(ref, open, () => setOpen(false));

    return (
        <details ref={ref} open={open} class="dropdown dropdown-end">
            <summary
                onClick={(e) => {
                    e.preventDefault();
                    setOpen(!open);
                }}
                title="Settings"
                class="btn btn-square btn-ghost btn-sm"
            >
                <Settings size={16} />
            </summary>
            <div class="dropdown-content rounded-box border-base-300 bg-base-100 z-20 mt-1 w-64 border p-4 shadow-lg">
                <div class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Variable labels</span>
                    <ScopeToggle
                        scopes={namingModes}
                        value={namingMode.value}
                        onChange={setNamingMode}
                    />
                </div>
            </div>
        </details>
    );
}
