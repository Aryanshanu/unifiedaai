import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Eye,
  Shield
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystems } from "@/hooks/useSystems";
import { format } from "date-fns";
import { toast } from "sonner";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

interface RegulatoryReport {
  id: string;
  system_id: string;
  report_type: string;
  status: string;
  report_content: Record<string, unknown>;
  document_hash: string;
  approved_by: string | null;
  approved_at: string | null;
  generated_at: string;
}

export default function RegulatoryReports() {
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [previewReport, setPreviewReport] = useState<RegulatoryReport | null>(null);

  const queryClient = useQueryClient();
  const { data: systems } = useSystems();

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['regulatory-reports', selectedSystem, reportTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from("regulatory_reports")
        .select("*")
        .order("generated_at", { ascending: false });

      if (selectedSystem !== "all") {
        query = query.eq("system_id", selectedSystem);
      }

      if (reportTypeFilter !== "all") {
        query = query.eq("report_type", reportTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Map report_content to report_content for the interface
      return (data || []).map(r => ({
        ...r,
        report_content: r.report_content || {}
      })) as RegulatoryReport[];
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (params: { systemId: string; reportType: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-audit-report', {
        body: { 
          systemId: params.systemId,
          includeRawLogs: true
        }
      });
      if (error) throw error;
      
      // Store the generated report
      const { error: insertError } = await supabase
        .from("regulatory_reports")
        .insert({
          system_id: params.systemId,
          report_type: params.reportType,
          status: 'draft',
          content: data,
          content_hash: data.content_hash
        });

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      toast.success("Report generated successfully");
      queryClient.invalidateQueries({ queryKey: ['regulatory-reports'] });
      setShowGenerator(false);
    },
    onError: (error) => {
      toast.error("Failed to generate report: " + error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("regulatory_reports")
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report approved");
      queryClient.invalidateQueries({ queryKey: ['regulatory-reports'] });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending_review':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      eu_ai_act_conformity: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      model_card: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      data_card: 'bg-green-500/10 text-green-500 border-green-500/20',
      impact_assessment: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      bias_audit: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      transparency_report: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };

    const labels: Record<string, string> = {
      eu_ai_act_conformity: 'EU AI Act',
      model_card: 'Model Card',
      data_card: 'Data Card',
      impact_assessment: 'Impact Assessment',
      bias_audit: 'Bias Audit',
      transparency_report: 'Transparency Report',
    };

    return (
      <Badge className={colors[type] || 'bg-muted'}>
        {labels[type] || type}
      </Badge>
    );
  };

  const downloadReport = (report: RegulatoryReport) => {
    const blob = new Blob([JSON.stringify(report.report_content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_type}-${report.id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const approvedCount = reports?.filter(r => r.status === 'approved').length || 0;
  const draftCount = reports?.filter(r => r.status === 'draft').length || 0;

  return (
    <MainLayout title="Regulatory Reports" subtitle="Generate and manage compliance documentation">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{approvedCount}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{draftCount}</p>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowGenerator(true)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">New Report</p>
                  <p className="text-sm text-muted-foreground">Generate now</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {systems?.map((sys) => (
                    <SelectItem key={sys.id} value={sys.id}>{sys.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="eu_ai_act_conformity">EU AI Act</SelectItem>
                  <SelectItem value="model_card">Model Card</SelectItem>
                  <SelectItem value="data_card">Data Card</SelectItem>
                  <SelectItem value="impact_assessment">Impact Assessment</SelectItem>
                  <SelectItem value="bias_audit">Bias Audit</SelectItem>
                  <SelectItem value="transparency_report">Transparency Report</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Generated Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reports generated yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowGenerator(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate First Report
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports?.map((report) => {
                    const system = systems?.find(s => s.id === report.system_id);
                    return (
                      <TableRow key={report.id}>
                        <TableCell>{getReportTypeBadge(report.report_type)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{system?.name || 'Unknown'}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(report.generated_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {report.document_hash?.substring(0, 12)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setPreviewReport(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadReport(report)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {report.status === 'draft' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => approveMutation.mutate(report.id)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Report Generator Dialog */}
        {showGenerator && (
          <ReportGenerator
            systems={systems || []}
            onGenerate={(systemId, reportType) => generateMutation.mutate({ systemId, reportType })}
            onClose={() => setShowGenerator(false)}
            isGenerating={generateMutation.isPending}
          />
        )}

        {/* Report Preview */}
        {previewReport && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Report Preview</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPreviewReport(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-[400px]">
                {JSON.stringify(previewReport.report_content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
