import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import SystemDetail from "./pages/SystemDetail";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import Approvals from "./pages/Approvals";
import HITL from "./pages/HITL";
import Lineage from "./pages/Lineage";
import Observability from "./pages/Observability";
import Alerts from "./pages/Alerts";
import Policy from "./pages/Policy";
import FairnessEngine from "./pages/engines/FairnessEngine";
import HallucinationEngine from "./pages/engines/HallucinationEngine";
import ToxicityEngine from "./pages/engines/ToxicityEngine";
import PrivacyEngine from "./pages/engines/PrivacyEngine";
import ExplainabilityEngine from "./pages/engines/ExplainabilityEngine";
import Settings from "./pages/Settings";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            {/* Project & System Registry */}
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/systems/:id" element={<ProtectedRoute><SystemDetail /></ProtectedRoute>} />
            <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
            <Route path="/models/:id" element={<ProtectedRoute><ModelDetail /></ProtectedRoute>} />
            {/* Governance */}
            <Route path="/governance/approvals" element={
              <ProtectedRoute requiredRoles={['admin', 'reviewer']}>
                <Approvals />
              </ProtectedRoute>
            } />
            <Route path="/hitl" element={<ProtectedRoute><HITL /></ProtectedRoute>} />
            {/* Knowledge Graph */}
            <Route path="/lineage" element={<ProtectedRoute><Lineage /></ProtectedRoute>} />
            {/* Monitoring */}
            <Route path="/observability" element={<ProtectedRoute><Observability /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            {/* Core RAI Engines */}
            <Route path="/engine/fairness" element={<ProtectedRoute><FairnessEngine /></ProtectedRoute>} />
            <Route path="/engine/hallucination" element={<ProtectedRoute><HallucinationEngine /></ProtectedRoute>} />
            <Route path="/engine/toxicity" element={<ProtectedRoute><ToxicityEngine /></ProtectedRoute>} />
            <Route path="/engine/privacy" element={<ProtectedRoute><PrivacyEngine /></ProtectedRoute>} />
            <Route path="/engine/explainability" element={<ProtectedRoute><ExplainabilityEngine /></ProtectedRoute>} />
            {/* Policy */}
            <Route path="/policy" element={<ProtectedRoute><Policy /></ProtectedRoute>} />
            {/* Settings & Docs */}
            <Route path="/settings" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
