import { Moon, Sun } from "lucide-preact";
import { useState } from "preact/hooks";

type Theme = "dark" | "light";

const storageKey = "setiv-theme";

function currentTheme(): Theme {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(currentTheme);

    const apply = (next: Theme) => {
        document.documentElement.dataset.theme = next;
        localStorage.setItem(storageKey, next);
        setTheme(next);
    };

    return (
        <label
            class="btn btn-square btn-ghost btn-sm swap swap-rotate"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
            <input
                type="checkbox"
                aria-label="Toggle dark theme"
                checked={theme === "dark"}
                onChange={(e) =>
                    apply(e.currentTarget.checked ? "dark" : "light")
                }
            />
            <Sun class="swap-off" size={16} />
            <Moon class="swap-on" size={16} />
        </label>
    );
}
