import { cn } from "../lib/cn";
import { useSolverStore } from "../state/context";
import { resultClass } from "../view/theme";

export function StatsBar() {
    const store = useSolverStore();
    const run = store.run.value;
    if (!run) {
        return null;
    }

    const { stats, result } = run;

    return (
        <div class="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
                <b>{store.fileName.value}</b>
            </span>
            <span>{stats.events} events</span>
            <span>{stats.variables} vars</span>
            <span>{stats.clauses} clauses</span>
            <span>{stats.decisions} decisions</span>
            <span>{stats.conflicts} conflicts</span>
            <span>{stats.backtracks} backtracks</span>
            <span>{stats.restarts} restarts</span>
            {result && (
                <span>
                    result:
                    <b class={cn("ml-1", resultClass[result.result])}>
                        {result.result.toUpperCase()}
                    </b>
                </span>
            )}
        </div>
    );
}
