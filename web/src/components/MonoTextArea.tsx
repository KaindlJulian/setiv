export function MonoTextArea({ value }: { value: string }) {
    return (
        <textarea
            readOnly
            value={value}
            spellcheck={false}
            class="block h-80 max-h-[70vh] w-full resize-y overflow-auto bg-white p-3 font-mono text-xs leading-relaxed whitespace-pre text-gray-700 focus:outline-none"
        />
    );
}
