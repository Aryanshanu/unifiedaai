import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalBanner } from "@/components/layout/GlobalBanner";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const Error = lazy(() => import("./pages/Error"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const SystemDetail = lazy(() => import("./pages/SystemDetail"));
const Models = lazy(() => import("./pages/Models"));
const ModelDetail = lazy(() => import("./pages/ModelDetail"));
const Approvals = lazy(() => import("./pages/Approvals"));
const HITL = lazy(() => import("./pages/HITL"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Lineage = lazy(() => import("./pages/Lineage"));
const Observability = lazy(() => import("./pages/Observability"));
const Alerts = lazy(() => import("./pages/Alerts"));

const FairnessEngine = lazy(() => import("./pages/engines/FairnessEngine"));
const HallucinationEngine = lazy(() => import("./pages/engines/HallucinationEngine"));
const ToxicityEngine = lazy(() => import("./pages/engines/ToxicityEngine"));
const PrivacyEngine = lazy(() => import("./pages/engines/PrivacyEngine"));
const ExplainabilityEngine = lazy(() => import("./pages/engines/ExplainabilityEngine"));
const DataQualityEngine = lazy(() => import("./pages/engines/DataQualityEngine"));
const DataContracts = lazy(() => import("./pages/DataContracts"));
const SemanticDefinitions = lazy(() => import("./pages/SemanticDefinitions"));
const SecurityDashboard = lazy(() => import("./pages/security/SecurityDashboard"));
const SecurityPentest = lazy(() => import("./pages/security/SecurityPentest"));
const SecurityJailbreak = lazy(() => import("./pages/security/SecurityJailbreak"));
const SecurityThreatModel = lazy(() => import("./pages/security/SecurityThreatModel"));
const Settings = lazy(() => import("./pages/Settings"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Governance = lazy(() => import("./pages/Governance"));
const Evaluation = lazy(() => import("./pages/Evaluation"));
const DecisionLedger = lazy(() => import("./pages/DecisionLedger"));
const AuditCenter = lazy(() => import("./pages/AuditCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="fractal-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SidebarProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GlobalBanner />
              <Suspense fallback={<PageFallback />}>
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
                <Route path="/decision-ledger" element={<ProtectedRoute><DecisionLedger /></ProtectedRoute>} />
                <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
                {/* Knowledge Graph */}
                <Route path="/lineage" element={<ProtectedRoute><Lineage /></ProtectedRoute>} />
                {/* Monitoring */}
                <Route path="/observability" element={<ProtectedRoute><Observability /></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                <Route path="/evaluation" element={<ProtectedRoute><Evaluation /></ProtectedRoute>} />
                {/* Semantic Layer */}
                <Route path="/semantic-definitions" element={<ProtectedRoute><SemanticDefinitions /></ProtectedRoute>} />
                {/* Core RAI Engines */}
                <Route path="/engine/fairness" element={<ProtectedRoute><FairnessEngine /></ProtectedRoute>} />
                <Route path="/engine/hallucination" element={<ProtectedRoute><HallucinationEngine /></ProtectedRoute>} />
                <Route path="/engine/toxicity" element={<ProtectedRoute><ToxicityEngine /></ProtectedRoute>} />
                <Route path="/engine/privacy" element={<ProtectedRoute><PrivacyEngine /></ProtectedRoute>} />
                <Route path="/engine/explainability" element={<ProtectedRoute><ExplainabilityEngine /></ProtectedRoute>} />
                <Route path="/engine/data-quality" element={<ProtectedRoute><DataQualityEngine /></ProtectedRoute>} />
                {/* Core Security */}
                <Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
                <Route path="/security/pentest" element={<ProtectedRoute><SecurityPentest /></ProtectedRoute>} />
                <Route path="/security/jailbreak" element={<ProtectedRoute><SecurityJailbreak /></ProtectedRoute>} />
                <Route path="/security/threats" element={<ProtectedRoute><SecurityThreatModel /></ProtectedRoute>} />
                {/* Data Governance */}
                <Route path="/data-contracts" element={<ProtectedRoute><DataContracts /></ProtectedRoute>} />
                {/* Settings & Docs */}
                <Route path="/settings" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                {/* Audit */}
                {/* Audit */}
                <Route path="/audit-center" element={<ProtectedRoute><AuditCenter /></ProtectedRoute>} />
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
            </TooltipProvider>
          </SidebarProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
