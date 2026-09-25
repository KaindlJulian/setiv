import { useLocation } from "preact-iso";
import { FileInput } from "./Input/FileInput";

export function EmptyState() {
    const location = useLocation();
    return (
        <div class="hero bg-base-200 min-h-0 flex-1 overflow-y-auto p-6">
            <div class="hero-content w-full max-w-xl flex-col items-stretch">
                <div class="card card-border border-base-300 bg-base-100 w-full">
                    <div class="card-body p-4">
                        <FileInput onSettled={() => location.route("/chart")} />
                    </div>
                </div>
            </div>
        </div>
    );
}
