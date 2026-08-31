import { useSource } from "@/state/context";
import { CircleAlert } from "lucide-preact";

export function LoadDiagnostics() {
    const error = useSource().loadError.value;

    if (!error) {
        return null;
    }

    return (
        <div class="flex shrink-0 flex-col gap-2 px-3 pt-3">
            <div
                role="alert"
                class="alert alert-error alert-soft items-start py-2"
            >
                <CircleAlert size={16} class="mt-0.5 shrink-0" />
                <div class="min-w-0 text-sm">
                    <p>{error.message}</p>
                    {error.line && (
                        <pre class="bg-base-300/50 mt-1.5 overflow-x-auto rounded p-1.5 font-mono text-xs">
                            {error.line.text}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}
