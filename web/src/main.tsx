import { render } from "preact";
import { LocationProvider } from "preact-iso";
import { App } from "./app";
import "./index.css";

import { SolverProvider } from "@/state/context";

render(
    <LocationProvider>
        <SolverProvider>
            <App />
        </SolverProvider>
    </LocationProvider>,
    document.getElementById("app")!,
);
