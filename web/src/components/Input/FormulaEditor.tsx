import { CompileResult } from "@/lib/compile";

interface FormulaEditorProps {
    text: string;
    setText: (next: string) => void;
    compiled: CompileResult | null;
    showError: boolean;
    busy: boolean;
}

export function FormulaEditor({
    text,
    setText,
    compiled,
    showError,
    busy,
}: FormulaEditorProps) {
    const error = compiled && !compiled.ok ? compiled.error : null;

    return (
        <div class="flex flex-col gap-1.5">
            <textarea
                value={text}
                onInput={(e) => setText(e.currentTarget.value)}
                rows={5}
                spellcheck={false}
                disabled={busy}
                placeholder="(a | b) & (!a | c) & (b -> c)"
                aria-label="Formula in limboole syntax"
                class="textarea textarea-sm w-full resize-y font-mono text-xs"
            />

            {error && showError && (
                <div
                    role="alert"
                    class="alert alert-error alert-soft mt-1 items-start py-1.5"
                >
                    <div class="min-w-0 font-mono text-xs">
                        <p>
                            Line {error.line}: {error.message}
                        </p>
                        <pre class="mt-1 overflow-x-auto">
                            {error.lineText}
                            {"\n"}
                            {" ".repeat(error.column - 1)}^
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
