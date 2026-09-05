import { Navbar } from "@/components/Navbar/Navbar";
import { AboutPage } from "@/pages/About";
import { ChartPage } from "@/pages/ChartPage";
import { SolverPage } from "@/pages/SolverPage";
import { Route, Router } from "preact-iso";

export function App() {
    return (
        <div class="bg-base-200 text-base-content flex h-screen flex-col overflow-hidden font-sans">
            <Navbar />

            <Router>
                <Route path="/" component={SolverPage} />
                <Route path="/chart" component={ChartPage} />
                <Route path="/about" component={AboutPage} />
                <Route default component={SolverPage} />
            </Router>
        </div>
    );
}
