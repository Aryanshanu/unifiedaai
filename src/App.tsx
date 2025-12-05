import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Models from "./pages/Models";
import Evaluation from "./pages/Evaluation";
import Observability from "./pages/Observability";
import Governance from "./pages/Governance";
import HITL from "./pages/HITL";
import Lineage from "./pages/Lineage";
import Policy from "./pages/Policy";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/models" element={<Models />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/observability" element={<Observability />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/hitl" element={<HITL />} />
          <Route path="/lineage" element={<Lineage />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
