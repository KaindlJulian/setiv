import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

function git(args: string) {
    try {
        return execSync(`git ${args}`, { encoding: "utf8" }).trim();
    } catch {
        return "";
    }
}

function commitDate() {
    const iso = git("log -1 --pretty=%cI");
    if (!iso) return "";
    return new Date(iso).toLocaleString("at", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

export default defineConfig({
    plugins: [preact(), tailwindcss()],
    define: {
        __GIT_COMMIT__: JSON.stringify(git("rev-parse --short HEAD")),
        __GIT_SUBJECT__: JSON.stringify(git("log -1 --pretty=%s")),
        __GIT_DATE__: JSON.stringify(commitDate()),
    },
});
