import { Route, Router } from "preact-iso";
import { Navbar } from "@/components/Navbar/Navbar";
import { ChartPage } from "@/pages/ChartPage";
import { HelpPage } from "@/pages/Help";
import { SolverPage } from "@/pages/SolverPage";

export function App() {
    return (
        <div class="bg-base-200 text-base-content flex h-screen flex-col overflow-hidden font-sans">
            <Navbar />

            <Router>
                <Route path="/" component={SolverPage} />
                <Route path="/chart" component={ChartPage} />
                <Route path="/help" component={HelpPage} />
                <Route default component={SolverPage} />
            </Router>
        </div>
    );
}
