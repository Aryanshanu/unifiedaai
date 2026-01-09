import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TestRunnerOverlay } from "@/components/tests/TestRunner";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Error from "./pages/Error";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import SystemDetail from "./pages/SystemDetail";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import Approvals from "./pages/Approvals";
import HITL from "./pages/HITL";
import Incidents from "./pages/Incidents";
import Lineage from "./pages/Lineage";
import Observability from "./pages/Observability";
import Alerts from "./pages/Alerts";
import Policy from "./pages/Policy";
import FairnessEngine from "./pages/engines/FairnessEngine";
import HallucinationEngine from "./pages/engines/HallucinationEngine";
import ToxicityEngine from "./pages/engines/ToxicityEngine";
import PrivacyEngine from "./pages/engines/PrivacyEngine";
import ExplainabilityEngine from "./pages/engines/ExplainabilityEngine";
import DataQualityEngine from "./pages/engines/DataQualityEngine";
import DataContracts from "./pages/DataContracts";
import Settings from "./pages/Settings";
import Documentation from "./pages/Documentation";
import Governance from "./pages/Governance";
import Evaluation from "./pages/Evaluation";
import GoldenDemoV2 from "./pages/GoldenDemoV2";
import GoldenDemoLegacy from "./pages/GoldenDemo";
import RunTests from "./pages/RunTests";
import GapsClosed from "./pages/GapsClosed";
import Architecture from "./pages/Architecture";
import LiveLogs from "./pages/LiveLogs";
import Truth from "./pages/Truth";
import RAIDashboard from "./pages/RAIDashboard";
import NotFound from "./pages/NotFound";
import { GlobalBanner } from "./components/layout/GlobalBanner";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GlobalBanner />
            <TestRunnerOverlay />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/error" element={<Error />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              {/* Project & System Registry */}
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/systems/:id" element={<ProtectedRoute><SystemDetail /></ProtectedRoute>} />
              <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
              <Route path="/models/:id" element={<ProtectedRoute><ModelDetail /></ProtectedRoute>} />
              {/* Governance */}
              <Route path="/governance" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
              <Route path="/governance/approvals" element={
                <ProtectedRoute requiredRoles={['admin', 'reviewer']}>
                  <Approvals />
                </ProtectedRoute>
              } />
              <Route path="/hitl" element={<ProtectedRoute><HITL /></ProtectedRoute>} />
              <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
              {/* Knowledge Graph */}
              <Route path="/lineage" element={<ProtectedRoute><Lineage /></ProtectedRoute>} />
              {/* Monitoring */}
              <Route path="/observability" element={<ProtectedRoute><Observability /></ProtectedRoute>} />
              <Route path="/live-logs" element={<ProtectedRoute><LiveLogs /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/evaluation" element={<ProtectedRoute><Evaluation /></ProtectedRoute>} />
              <Route path="/rai-dashboard" element={<ProtectedRoute><RAIDashboard /></ProtectedRoute>} />
              {/* Core RAI Engines */}
              <Route path="/engine/fairness" element={<ProtectedRoute><FairnessEngine /></ProtectedRoute>} />
              <Route path="/engine/hallucination" element={<ProtectedRoute><HallucinationEngine /></ProtectedRoute>} />
              <Route path="/engine/toxicity" element={<ProtectedRoute><ToxicityEngine /></ProtectedRoute>} />
              <Route path="/engine/privacy" element={<ProtectedRoute><PrivacyEngine /></ProtectedRoute>} />
              <Route path="/engine/explainability" element={<ProtectedRoute><ExplainabilityEngine /></ProtectedRoute>} />
              <Route path="/engine/data-quality" element={<ProtectedRoute><DataQualityEngine /></ProtectedRoute>} />
              {/* Data Governance */}
              <Route path="/data-contracts" element={<ProtectedRoute><DataContracts /></ProtectedRoute>} />
              {/* Policy */}
              <Route path="/policy" element={<ProtectedRoute><Policy /></ProtectedRoute>} />
              {/* Settings & Docs */}
              <Route path="/settings" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
              {/* Test & Demo Routes */}
              <Route path="/golden" element={<ProtectedRoute><GoldenDemoV2 /></ProtectedRoute>} />
              <Route path="/golden-legacy" element={<GoldenDemoLegacy />} />
              <Route path="/run-tests" element={<RunTests />} />
              <Route path="/gaps-closed" element={<GapsClosed />} />
              <Route path="/truth" element={<Truth />} />
              <Route path="/architecture" element={<ProtectedRoute><Architecture /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
