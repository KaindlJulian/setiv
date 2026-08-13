import { CircleAlert, TriangleAlert } from "lucide-preact";
import { useSource } from "@/state/context";

export function LoadDiagnostics() {
    const source = useSource();
    const error = source.loadError.value;
    const issues = source.parseIssues.value;

    if (!error && issues.length === 0) {
        return null;
    }

    return (
        <div class="flex shrink-0 flex-col gap-2 px-3 pt-3">
            {error && (
                <div role="alert" class="alert alert-error alert-soft py-2">
                    <CircleAlert size={16} class="shrink-0" />
                    <span class="text-sm">{error}</span>
                </div>
            )}

            {issues.length > 0 && (
                <div
                    role="alert"
                    class="alert alert-warning alert-soft items-start py-2"
                >
                    <TriangleAlert size={16} class="mt-0.5 shrink-0" />
                    <div class="min-w-0 text-sm">
                        <p>Skipped {issues.length} unreadable lines</p>
                        <ul class="mt-1 list-inside list-disc font-mono text-xs opacity-80">
                            {issues.slice(0, 5).map((issue) => (
                                <li key={issue.line}>
                                    line {issue.line}: {issue.reason}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
