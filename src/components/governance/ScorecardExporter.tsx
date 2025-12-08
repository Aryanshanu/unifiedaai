import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
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

  const { data: models } = useModels();

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
      const { data, error } = await supabase.functions.invoke('generate-scorecard', {
        body: { modelId: selectedModel, format: 'pdf' },
      });

      if (error) throw error;

      // Open HTML in new window for PDF printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data);
        printWindow.document.close();
        printWindow.focus();
      }
      
      toast.success('Legal-grade EU AI Act Scorecard exported — ready for regulators');
    } catch (error: any) {
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
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {scorecard.sections.map((section, i) => (
                    <div key={i} className="text-center p-2 rounded bg-background">
                      <div className="text-xs text-muted-foreground mb-1 truncate">{section.title.split(' ')[0]}</div>
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
