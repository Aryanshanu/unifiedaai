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
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import FairnessEngine from "./pages/engines/FairnessEngine";
import HallucinationEngine from "./pages/engines/HallucinationEngine";
import ToxicityEngine from "./pages/engines/ToxicityEngine";
import PrivacyEngine from "./pages/engines/PrivacyEngine";
import ExplainabilityEngine from "./pages/engines/ExplainabilityEngine";
import Settings from "./pages/Settings";
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
            <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
            <Route path="/models/:id" element={<ProtectedRoute><ModelDetail /></ProtectedRoute>} />
            {/* Core RAI Engines - Each has unique page */}
            <Route path="/engine/fairness" element={<ProtectedRoute><FairnessEngine /></ProtectedRoute>} />
            <Route path="/engine/hallucination" element={<ProtectedRoute><HallucinationEngine /></ProtectedRoute>} />
            <Route path="/engine/toxicity" element={<ProtectedRoute><ToxicityEngine /></ProtectedRoute>} />
            <Route path="/engine/privacy" element={<ProtectedRoute><PrivacyEngine /></ProtectedRoute>} />
            <Route path="/engine/explainability" element={<ProtectedRoute><ExplainabilityEngine /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
