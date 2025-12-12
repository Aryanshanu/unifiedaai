import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Calendar, User, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProjectDocumentationTabProps {
  projectId: string;
}

export function ProjectDocumentationTab({ projectId }: ProjectDocumentationTabProps) {
  const navigate = useNavigate();
  
  // Fetch systems for this project
  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ["project-systems-docs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("systems")
        .select("id, name")
        .eq("project_id", projectId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch documents for all systems in this project
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      if (!systems?.length) return [];
      
      const systemIds = systems.map(s => s.id);
      const { data, error } = await supabase
        .from("system_documents")
        .select("*")
        .in("system_id", systemIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!systems?.length,
  });

  // Fetch attestations
  const { data: attestations, isLoading: attestationsLoading } = useQuery({
    queryKey: ["project-attestations", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attestations")
        .select("*, models!inner(project_id)")
        .eq("models.project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const isLoading = systemsLoading || docsLoading || attestationsLoading;

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case "model_card": return "bg-primary/10 text-primary border-primary/20";
      case "compliance_report": return "bg-success/10 text-success border-success/20";
      case "risk_assessment": return "bg-warning/10 text-warning border-warning/20";
      case "attestation": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case "model_card": return "Model Card";
      case "compliance_report": return "Compliance Report";
      case "risk_assessment": return "Risk Assessment";
      case "attestation": return "Attestation";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDocuments = (documents?.length || 0) > 0;
  const hasAttestations = (attestations?.length || 0) > 0;
  const hasContent = hasDocuments || hasAttestations;

  if (!hasContent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No Documentation Yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Documentation is generated automatically when you run evaluations, create attestations, or export scorecards for your models.
          </p>
          <Button 
            onClick={() => navigate("/governance")} 
            className="mt-6 gap-2"
          >
            <Plus className="h-4 w-4" />
            Go to Governance
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attestations */}
      {hasAttestations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Signed Attestations
            </CardTitle>
            <CardDescription>
              Regulatory attestations and compliance certifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attestations?.map(attestation => (
                <div 
                  key={attestation.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">{attestation.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(attestation.created_at), "MMM d, yyyy")}
                        </span>
                        <Badge variant="outline" className={
                          attestation.status === "approved" ? "bg-success/10 text-success" :
                          attestation.status === "pending" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }>
                          {attestation.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {attestation.document_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={attestation.document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Documents */}
      {hasDocuments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              System Documentation
            </CardTitle>
            <CardDescription>
              Auto-generated documentation, model cards, and reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents?.map(doc => {
                const systemName = systems?.find(s => s.id === doc.system_id)?.name || "Unknown System";
                
                return (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{systemName}</span>
                          <Badge variant="outline" className={getDocTypeColor(doc.document_type)}>
                            {getDocTypeLabel(doc.document_type)}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.created_at || ""), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Documentation</CardTitle>
          <CardDescription>Create new documentation for this project's systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/governance")}>
              <FileText className="h-6 w-6" />
              <span>Create Attestation</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/reports")}>
              <Download className="h-6 w-6" />
              <span>Export Scorecard</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
              <FileText className="h-6 w-6" />
              <span>Generate Model Card</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
