import { render } from "preact";
import { App } from "./app";
import "./index.css";

import { SolverProvider } from "./state/context";

render(
    <SolverProvider>
        <App />
    </SolverProvider>,
    document.getElementById("app")!,
);
