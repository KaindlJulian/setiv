import { FileInput } from "./FileInput";

export function EmptyState() {
    return (
        <div class="hero bg-base-200 min-h-0 flex-1 overflow-y-auto p-6">
            <div class="hero-content w-full max-w-lg flex-col items-stretch">
                <div class="card card-border border-base-300 bg-base-100 w-full">
                    <div class="card-body p-4">
                        <FileInput />
                    </div>
                </div>
            </div>
        </div>
    );
}
