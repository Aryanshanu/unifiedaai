import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/useProjects";
import { useSystems } from "@/hooks/useSystems";
import { CreateProjectForm } from "@/components/registry/CreateProjectForm";
import { ProjectCard } from "@/components/registry/ProjectCard";
import { Search, Plus, FolderOpen, Filter } from "lucide-react";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const { data: projects, isLoading, error } = useProjects();
  const { data: allSystems } = useSystems();

  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.description?.toLowerCase().includes(search.toLowerCase()) ||
    project.organization?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getSystemCount = (projectId: string) => {
    return allSystems?.filter(s => s.project_id === projectId).length ?? 0;
  };

  return (
    <MainLayout title="Project Registry" subtitle="Manage AI projects and their associated systems">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Project Registry</h1>
            <p className="text-muted-foreground mt-1">
              Manage AI projects and their associated systems
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
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
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-destructive">Failed to load projects</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No Projects Yet</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                Create your first AI project to start managing systems, running risk assessments, and monitoring governance.
              </p>
              <Button onClick={() => setShowCreateForm(true)} className="mt-6 gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {filteredProjects.length} of {projects?.length ?? 0} projects
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  systemCount={getSystemCount(project.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <CreateProjectForm 
        open={showCreateForm} 
        onOpenChange={setShowCreateForm} 
      />
    </MainLayout>
  );
}
