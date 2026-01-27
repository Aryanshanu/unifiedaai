import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Database, FileUp, Cloud, Globe, Plus, RefreshCw, 
  CheckCircle, XCircle, Clock, Loader2, Trash2, Settings
} from "lucide-react";
import { format } from "date-fns";

interface DataSource {
  id: string;
  name: string;
  source_type: string;
  connection_config: Record<string, unknown>;
  auth_type: string | null;
  status: string;
  last_sync_at: string | null;
  row_count: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

const sourceTypeConfig = {
  database: { icon: Database, label: "Database", description: "PostgreSQL, MySQL, etc." },
  file: { icon: FileUp, label: "File Upload", description: "CSV, JSON, Excel" },
  s3: { icon: Cloud, label: "AWS S3", description: "S3 bucket connection" },
  gcs: { icon: Cloud, label: "Google Cloud Storage", description: "GCS bucket" },
  api: { icon: Globe, label: "REST API", description: "External API endpoint" },
  manual: { icon: FileUp, label: "Manual Upload", description: "Direct file upload" },
};

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  connected: { color: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  error: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  pending: { color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  syncing: { color: "bg-primary/10 text-primary border-primary/20", icon: RefreshCw },
};

export function DataSourceConnectors() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    source_type: "manual",
    auth_type: "none",
  });
  const queryClient = useQueryClient();

  const { data: sources, isLoading } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DataSource[];
    },
  });

  const createSource = useMutation({
    mutationFn: async (source: typeof newSource) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("data_sources")
        .insert({
          name: source.name,
          source_type: source.source_type,
          auth_type: source.auth_type,
          owner_id: user?.id,
          status: "pending",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
      toast.success("Data source created");
      setIsAddDialogOpen(false);
      setNewSource({ name: "", source_type: "manual", auth_type: "none" });
    },
    onError: (error: Error) => {
      toast.error("Failed to create data source", { description: error.message });
    },
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("data_sources")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
      toast.success("Data source deleted");
    },
  });

  const syncSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("data_sources")
        .update({ status: "syncing" })
        .eq("id", id);
      
      if (error) throw error;
      
      // Simulate sync completion after 2 seconds
      setTimeout(async () => {
        await supabase
          .from("data_sources")
          .update({ 
            status: "connected", 
            last_sync_at: new Date().toISOString(),
            row_count: Math.floor(Math.random() * 10000) + 100
          })
          .eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["data-sources"] });
      }, 2000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
      toast.info("Sync started...");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Sources</h3>
          <p className="text-sm text-muted-foreground">
            Configure connections to your data repositories
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Data Source</DialogTitle>
              <DialogDescription>
                Configure a new data source connection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Source Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production Database"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select
                  value={newSource.source_type}
                  onValueChange={(value) => setNewSource({ ...newSource, source_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Authentication</Label>
                <Select
                  value={newSource.auth_type}
                  onValueChange={(value) => setNewSource({ ...newSource, auth_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Authentication</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth 2.0</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createSource.mutate(newSource)}
                disabled={!newSource.name || createSource.isPending}
                className="w-full"
              >
                {createSource.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Source"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Source Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(sourceTypeConfig).map(([key, config]) => {
          const count = sources?.filter(s => s.source_type === key).length || 0;
          return (
            <Card key={key} className="p-3 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary">
                  <config.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{count} connected</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sources List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Sources</CardTitle>
          <CardDescription>
            Manage your data source connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !sources?.length ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No data sources configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a data source to start ingesting data
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => {
                const typeConfig = sourceTypeConfig[source.source_type as keyof typeof sourceTypeConfig];
                const status = statusConfig[source.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-secondary">
                        {typeConfig && <typeConfig.icon className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{source.name}</p>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${source.status === 'syncing' ? 'animate-spin' : ''}`} />
                            {source.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeConfig?.label} • {source.row_count.toLocaleString()} rows
                          {source.last_sync_at && (
                            <span className="ml-2">
                              • Last sync: {format(new Date(source.last_sync_at), "MMM d, HH:mm")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncSource.mutate(source.id)}
                        disabled={source.status === "syncing"}
                      >
                        <RefreshCw className={`h-4 w-4 ${source.status === 'syncing' ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSource.mutate(source.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
