import { useSolverStore } from "../state/context";

export function LoadDiagnostics() {
    const store = useSolverStore();
    const error = store.loadError.value;
    const issues = store.parseIssues.value;

    if (!error && issues.length === 0) {
        return null;
    }

    return (
        <div class="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error && <p class="font-medium">{error}</p>}
            {issues.length > 0 && (
                <>
                    <p>
                        Skipped {issues.length} unreadable line
                        {issues.length === 1 ? "" : "s"}:
                    </p>
                    <ul class="mt-1 list-inside list-disc font-mono text-xs">
                        {issues.slice(0, 5).map((issue) => (
                            <li key={issue.line}>
                                line {issue.line}: {issue.reason}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
