import { formatBytes } from "@/lib/format";
import { useSource } from "@/state/context";
import { X } from "lucide-preact";

export function RunStatus() {
    const source = useSource();
    const status = source.status.value;

    if (status === "idle") {
        return null;
    }

    const solving = status === "solving";

    return (
        <div class="flex min-w-0 shrink-0 items-center gap-2 text-xs">
            <span class="loading loading-spinner loading-xs" />
            <span class="truncate">
                {solving ? "Solving" : "Reading"}{" "}
                <span class="font-mono">{source.fileName.value} </span>
                <span class="font-mono tabular-nums">
                    {formatBytes(source.bytesRead.value)}
                </span>
            </span>
            {solving && (
                <button
                    type="button"
                    onClick={() => source.cancel()}
                    class="btn btn-xs btn-ghost gap-1"
                    title="Stop the solver and keep what it has produced"
                >
                    <X size={13} />
                    Stop
                </button>
            )}
        </div>
    );
}
