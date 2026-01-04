import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useSystems } from '@/hooks/useSystems';
import { useModels } from '@/hooks/useModels';

interface RAIDashboardFiltersProps {
  selectedProjectId: string | null;
  selectedSystemId: string | null;
  selectedModelId: string | null;
  onProjectChange: (projectId: string | null) => void;
  onSystemChange: (systemId: string | null) => void;
  onModelChange: (modelId: string | null) => void;
}

export function RAIDashboardFilters({
  selectedProjectId,
  selectedSystemId,
  selectedModelId,
  onProjectChange,
  onSystemChange,
  onModelChange,
}: RAIDashboardFiltersProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: systems, isLoading: systemsLoading } = useSystems();
  const { data: models, isLoading: modelsLoading } = useModels();

  // Filter systems by selected project
  const filteredSystems = selectedProjectId
    ? systems?.filter((s) => s.project_id === selectedProjectId)
    : systems;

  // Filter models by selected system (and project)
  const filteredModels = selectedSystemId
    ? models?.filter((m) => m.system_id === selectedSystemId)
    : selectedProjectId
    ? models?.filter((m) => m.project_id === selectedProjectId)
    : models;

  const handleClearFilters = () => {
    onProjectChange(null);
    onSystemChange(null);
    onModelChange(null);
  };

  const hasActiveFilters = selectedProjectId || selectedSystemId || selectedModelId;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {/* Project Selector */}
      <Select
        value={selectedProjectId || 'all'}
        onValueChange={(value) => {
          onProjectChange(value === 'all' ? null : value);
          onSystemChange(null);
          onModelChange(null);
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={projectsLoading ? 'Loading...' : 'All Projects'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects?.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* System Selector */}
      <Select
        value={selectedSystemId || 'all'}
        onValueChange={(value) => {
          onSystemChange(value === 'all' ? null : value);
          onModelChange(null);
        }}
        disabled={!selectedProjectId}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={systemsLoading ? 'Loading...' : 'All Systems'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Systems</SelectItem>
          {filteredSystems?.map((system) => (
            <SelectItem key={system.id} value={system.id}>
              {system.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Model Selector */}
      <Select
        value={selectedModelId || 'all'}
        onValueChange={(value) => onModelChange(value === 'all' ? null : value)}
        disabled={!selectedProjectId}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={modelsLoading ? 'Loading...' : 'All Models'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Models</SelectItem>
          {filteredModels?.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
