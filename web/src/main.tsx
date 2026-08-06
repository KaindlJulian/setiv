import { render } from "preact";
import { LocationProvider } from "preact-iso";
import { App } from "./app";
import "./index.css";

import { SolverProvider } from "./state/context";

// The store sits below the location but above the router, so a loaded log
// survives navigation between pages.
render(
    <LocationProvider>
        <SolverProvider>
            <App />
        </SolverProvider>
    </LocationProvider>,
    document.getElementById("app")!,
);
