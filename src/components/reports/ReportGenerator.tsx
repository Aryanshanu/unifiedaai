import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  X, 
  RefreshCw,
  Shield,
  Database,
  FileCode
} from "lucide-react";
import { useState } from "react";

interface System {
  id: string;
  name: string;
}

interface ReportGeneratorProps {
  systems: System[];
  onGenerate: (systemId: string, reportType: string) => void;
  onClose: () => void;
  isGenerating: boolean;
}

export function ReportGenerator({ systems, onGenerate, onClose, isGenerating }: ReportGeneratorProps) {
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [reportType, setReportType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const reportTypes = [
    {
      id: 'eu_ai_act',
      name: 'EU AI Act Compliance',
      description: 'Risk classification, transparency requirements, and human oversight documentation per EU AI Act Articles',
      icon: Shield,
    },
    {
      id: 'model_card',
      name: 'Model Card',
      description: 'Standardized documentation including performance metrics, intended use, limitations, and ethical considerations',
      icon: FileCode,
    },
    {
      id: 'data_card',
      name: 'Data Card',
      description: 'Data provenance, quality metrics, bias assessment, and consent documentation',
      icon: Database,
    },
    {
      id: 'audit_report',
      name: 'Full Audit Report',
      description: 'Comprehensive audit trail including all governance events, decisions, and compliance status',
      icon: FileText,
    },
  ];

  const handleGenerate = () => {
    if (selectedSystem && reportType) {
      onGenerate(selectedSystem, reportType);
    }
  };

  return (
    <Card className="fixed inset-4 md:inset-auto md:fixed md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] z-50 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Generate Report
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Selection */}
        <div className="space-y-2">
          <Label>Target System</Label>
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger>
              <SelectValue placeholder="Select a system..." />
            </SelectTrigger>
            <SelectContent>
              {systems.map((sys) => (
                <SelectItem key={sys.id} value={sys.id}>{sys.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Report Type Selection */}
        <div className="space-y-2">
          <Label>Report Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = reportType === type.id;
              return (
                <div
                  key={type.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setReportType(type.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{type.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {type.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Additional Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific requirements or context for this report..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={!selectedSystem || !reportType || isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
