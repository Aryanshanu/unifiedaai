import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
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
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
            <Route path="/evaluation" element={<ProtectedRoute><Evaluation /></ProtectedRoute>} />
            <Route path="/observability" element={<ProtectedRoute><Observability /></ProtectedRoute>} />
            <Route path="/governance" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
            <Route path="/hitl" element={<ProtectedRoute requiredRoles={['admin', 'reviewer']}><HITL /></ProtectedRoute>} />
            <Route path="/lineage" element={<ProtectedRoute><Lineage /></ProtectedRoute>} />
            <Route path="/policy" element={<ProtectedRoute requiredRoles={['admin']}><Policy /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
