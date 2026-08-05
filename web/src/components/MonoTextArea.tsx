import { cn } from "../lib/cn";

interface MonoTextAreaProps {
    value: string;
    fill?: boolean;
}

export function MonoTextArea({ value, fill = false }: MonoTextAreaProps) {
    return (
        <textarea
            readOnly
            value={value}
            spellcheck={false}
            class={cn(
                "textarea bg-base-100 text-base-content/80 block w-full rounded-none border-0 p-3 font-mono text-xs leading-relaxed whitespace-pre focus:outline-none",
                fill
                    ? "min-h-0 flex-1 resize-none"
                    : "h-80 max-h-[70vh] resize-y",
            )}
        />
    );
}
