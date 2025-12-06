import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/hooks/useProjects";
import { useSystems } from "@/hooks/useSystems";
import { SystemCard } from "@/components/registry/SystemCard";
import { ProjectModelsTab } from "@/components/project/ProjectModelsTab";
import { ModelRegistrationForm } from "@/components/models/ModelRegistrationForm";
import { 
  ArrowLeft, Plus, FolderOpen, Server, Shield, Database, 
  Gauge, Building2, Calendar, Cpu, AlertTriangle, Activity, FileText, Brain 
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddModel, setShowAddModel] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(id ?? "");
  const { data: systems, isLoading: systemsLoading } = useSystems(id);

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case "low": return "bg-success/10 text-success border-success/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "critical": return "bg-danger/10 text-danger border-danger/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "development": return "bg-primary/10 text-primary border-primary/20";
      case "staging": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "production": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCriticalityColor = (score: number) => {
    if (score <= 3) return "text-success";
    if (score <= 5) return "text-warning";
    if (score <= 7) return "text-orange-500";
    return "text-danger";
  };

  if (projectLoading) {
    return (
      <MainLayout title="Loading..." subtitle="Please wait">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout title="Project Not Found">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">Project Not Found</h2>
          <p className="text-muted-foreground mt-2">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/projects")} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={project.name} subtitle={project.organization || "Project Details"}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/projects")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        {/* Project Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              {project.organization && (
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />
                  {project.organization}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className={getEnvironmentColor(project.environment)}>
                  <Server className="h-3 w-3 mr-1" />
                  {project.environment}
                </Badge>
                <Badge variant="outline" className={getSensitivityColor(project.business_sensitivity)}>
                  <Shield className="h-3 w-3 mr-1" />
                  Business: {project.business_sensitivity}
                </Badge>
                <Badge variant="outline" className={getSensitivityColor(project.data_sensitivity)}>
                  <Database className="h-3 w-3 mr-1" />
                  Data: {project.data_sensitivity}
                </Badge>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowAddModel(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Model
          </Button>
        </div>

        {/* Project Description */}
        {project.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{systems?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Systems</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Gauge className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${getCriticalityColor(project.criticality)}`}>
                    {project.criticality}/10
                  </p>
                  <p className="text-sm text-muted-foreground">Criticality</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">--</p>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{format(new Date(project.created_at), "MMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="systems" className="space-y-6">
          <TabsList>
            <TabsTrigger value="systems" className="gap-2">
              <Cpu className="h-4 w-4" />
              Systems ({systems?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Brain className="h-4 w-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Assessment
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <FileText className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="systems" className="space-y-6">
            {systemsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : systems?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Cpu className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">No Systems Yet</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    Add AI models to this project to start monitoring and governance. Systems are created automatically when you add a model.
                  </p>
                  <Button onClick={() => setShowAddModel(true)} className="mt-6 gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Model
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {systems?.map((system) => (
                  <SystemCard key={system.id} system={system} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Project Models</h3>
                <p className="text-sm text-muted-foreground">AI models registered in this project</p>
              </div>
              <Button onClick={() => setShowAddModel(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Model
              </Button>
            </div>
            {id && <ProjectModelsTab projectId={id} onAddModel={() => setShowAddModel(true)} />}
          </TabsContent>

          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>
                  Static and runtime risk analysis for this project
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Risk Assessment Coming Soon</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  The Risk Assessment Engine will be available in Phase 2 of development.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  Recent changes and events for this project
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No activity recorded yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Project documentation and compliance artifacts
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Documentation Generation Coming Soon</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Auto-generated documentation, model cards, and compliance reports will be available in Phase 4.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {id && (
        <ModelRegistrationForm
          open={showAddModel}
          onOpenChange={setShowAddModel}
          defaultProjectId={id}
        />
      )}
    </MainLayout>
  );
}
