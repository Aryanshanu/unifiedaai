import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Scorecard {
  id: string;
  model_name: string;
  overall_score: number;
  overall_status: 'compliant' | 'warning' | 'non-compliant';
  sections: any[];
  generated_at: string;
  hash: string;
}

export function ScorecardExporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);

  const { data: models, isLoading: modelsLoading } = useModels();

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error('Please select a model');
      return;
    }

    setIsGenerating(true);
    setScorecard(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-scorecard', {
        body: { modelId: selectedModel, format: 'json' },
      });

      if (error) throw error;

      if (data?.success) {
        setScorecard(data.scorecard);
        toast.success('Scorecard generated');
      }
    } catch (error: any) {
      toast.error('Generation failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedModel) {
      toast.error('Please select a model first');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Call the edge function directly via fetch to get raw HTML
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scorecard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ modelId: selectedModel, format: 'pdf' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate scorecard');
      }

      // Get the raw HTML text
      const htmlContent = await response.text();
      
      // Open in new window and write the HTML directly
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
      
      // Also generate JSON scorecard for display
      const jsonResponse = await supabase.functions.invoke('generate-scorecard', {
        body: { modelId: selectedModel, format: 'json' },
      });
      
      if (jsonResponse.data?.success) {
        setScorecard(jsonResponse.data.scorecard);
      }
      
      toast.success('Scorecard exported — ready for print to PDF');
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.error('PDF generation failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!scorecard) return;

    const blob = new Blob([JSON.stringify(scorecard, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scorecard-${scorecard.model_name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusColors = {
    compliant: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    'non-compliant': 'text-danger bg-danger/10',
  };

  const hasNoModels = !modelsLoading && (!models || models.length === 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Export Scorecard (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            RAI Scorecard Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {hasNoModels ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No models registered yet</p>
              <p className="text-sm text-muted-foreground">
                Register a model first to generate scorecards
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Select Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.model_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="gradient" onClick={handleDownloadPDF} disabled={isGenerating || !selectedModel}>
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Generate 6-Page PDF Scorecard
                </Button>
              </div>
              
              {scorecard && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{scorecard.model_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Generated {new Date(scorecard.generated_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{scorecard.overall_score}%</div>
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full uppercase",
                          statusColors[scorecard.overall_status]
                        )}>
                          {scorecard.overall_status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Section Summary */}
                    {scorecard.sections && scorecard.sections.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 mt-4">
                        {scorecard.sections.map((section, i) => (
                          <div key={i} className="text-center p-2 rounded bg-background">
                            <div className="text-xs text-muted-foreground mb-1 truncate">{section.title?.split(' ')[0] || `Section ${i + 1}`}</div>
                            <div className={cn(
                              "font-bold",
                              section.score >= 80 ? 'text-success' :
                              section.score >= 60 ? 'text-warning' : 'text-danger'
                            )}>
                              {section.score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Integrity Hash */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Integrity Hash:</span>
                    <code className="bg-secondary px-2 py-1 rounded text-xs font-mono">
                      {scorecard.hash}
                    </code>
                  </div>
                  
                  {/* Download Options */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleDownloadJSON}>
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </Button>
                    <Button variant="gradient" className="flex-1" onClick={handleDownloadPDF}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}