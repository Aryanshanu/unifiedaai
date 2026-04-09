import React, { useState } from "react";
import { UploadCloud, Database, ShieldAlert, CheckCircle, FileText, AlertTriangle, Info, UserRound } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ColumnMeta {
  name: string;
  type: string;
  definition: string;
  isVerified: boolean;
  sensitivity: "None" | "PII" | "PHI" | "Sensitive";
}

interface DatasetAnalysis {
  filename: string;
  totalRows: number;
  totalCols: number;
  qualityScore: number;
  missingValuesPct: number;
  columns: ColumnMeta[];
}

export interface SavedDataset extends DatasetAnalysis {
  ownerName: string;
  ownerEmail: string;
  registeredAt: Date;
}

export default function Inventory() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [history, setHistory] = useState<SavedDataset[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      startAnalysis(selectedFile);
    }
  };

  const startAnalysis = (uploadedFile: File) => {
    setIsScanning(true);
    setScanProgress(0);
    setAnalysis(null);

    // Simulate progress
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 500);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0] || "";
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const heuristicSensitivity = (col: string): "None" | "PII" | "PHI" | "Sensitive" => {
        const lower = col.toLowerCase();
        
        // PHI - Protected Health Information (HIPAA Safe Harbor)
        if (/(medical|health|doctor|hospital|clinic|medication|test|condition|disease|diagnosis|icd|patient|treatment|admission|discharge|blood|surgery|therapy|prescription)/.test(lower)) return "PHI";
        if (/(mrn|health_plan|beneficiary|device_id)/.test(lower)) return "PHI";

        // PII - Personally Identifiable Information (NIST)
        if (/(name|first_name|last_name|full_name|ssn|social_security|passport|driver.*license|license_plate|dob|date_of_birth|birth|religion|ethnicity|gender|sex|age)/.test(lower)) return "PII";
        if (/(email|phone|address|street|city|state|zip|postal|geo|location|ip_address|mac_address|url)/.test(lower)) return "PII";

        // Sensitive / PCI / Financial
        if (/(password|secret|token|credential|credit.*card|bank.*account|routing|financial|billing|transaction|salary|wage|income)/.test(lower)) return "Sensitive";

        return "None";
      };

      const columns: ColumnMeta[] = headers.filter(h => h).map((h) => ({
        name: h,
        type: "string", // defaulting to string since we don't infer it yet
        definition: `Auto-extracted column: ${h}`,
        isVerified: false,
        sensitivity: heuristicSensitivity(h)
      }));

      // Simulate AI parsing after a delay
      setTimeout(() => {
        setIsScanning(false);
        
        const mockResult: DatasetAnalysis = {
          filename: uploadedFile.name,
          totalRows: Math.floor(Math.random() * 50000) + 1000,
          totalCols: columns.length,
          qualityScore: 92,
          missingValuesPct: 4.5,
          columns: columns,
        };

        setAnalysis(mockResult);

        // Simulate defaulting the business owner if it's not present (we leave it empty or partially filled)
        setOwnerName("");
        setOwnerEmail("");
        
        toast({
          title: "Scan Complete",
          description: `Successfully analyzed ${uploadedFile.name} with ${columns.length} columns.`,
        });
      }, 3000);
    };
    reader.readAsText(uploadedFile);
  };

  const saveInventory = () => {
    if (!ownerEmail || !ownerName) {
      toast({
        title: "Validation Error",
        description: "Please provide Business Owner details.",
        variant: "destructive"
      });
      return;
    }

    if (analysis) {
      setHistory(prev => [{
        ...analysis,
        ownerName,
        ownerEmail,
        registeredAt: new Date()
      }, ...prev]);
    }

    toast({
      title: "Inventory Saved",
      description: "Dataset metadata and ownership have been recorded.",
    });

    setFile(null);
    setAnalysis(null);
    setOwnerName("");
    setOwnerEmail("");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dataset Inventory</h1>
        <p className="text-muted-foreground">
          Upload datasets to automatically extract schemas, identify sensitive information (PII/PHI), and evaluate data quality.
        </p>
      </div>

      {!file && !isScanning && !analysis && (
        <div className="space-y-8 animate-in fade-in">
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Upload Dataset</h3>
                <p className="text-sm text-muted-foreground mt-1">Drag and drop or browse to upload a CSV file</p>
              </div>
              <div className="relative">
                <Input 
                  type="file" 
                  accept=".csv,.json,.xlsx" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button>Select File</Button>
              </div>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" /> Registered Datasets History
                </CardTitle>
                <CardDescription>A complete log of datasets that have been analyzed and registered in your workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Rows / Cols</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead className="text-right">Registered On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((ds, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {ds.filename}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{ds.ownerName}</span>
                            <span className="text-xs text-muted-foreground">{ds.ownerEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ds.totalRows.toLocaleString()} / {ds.totalCols}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ds.qualityScore >= 90 ? "text-emerald-500 border-emerald-500/50 bg-emerald-500/10" : "text-amber-500 border-amber-500/50 bg-amber-500/10"}>
                            {ds.qualityScore}% 
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {ds.registeredAt.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isScanning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-6">
            <Database className="w-12 h-12 text-primary animate-pulse" />
            <div className="text-center space-y-2 w-full max-w-md">
              <h3 className="text-lg font-semibold animate-pulse">Running AI Discovery...</h3>
              <p className="text-sm text-muted-foreground text-center">
                Extracting metadata, classifying sensitive columns, and generating glossary definitions.
              </p>
              <Progress value={scanProgress} className="h-2 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && !isScanning && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Profile Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.filename}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.totalRows.toLocaleString()} rows • {analysis.totalCols} columns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Data Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{analysis.qualityScore}/100</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Missing values: {analysis.missingValuesPct}% 
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                  <UserRound className="w-4 h-4" />
                  Business Owner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input 
                      placeholder="Jane Doe" 
                      className="h-8 text-sm" 
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input 
                      placeholder="owner@company.com" 
                      className="h-8 text-sm" 
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Glossary & Sensitivity Analysis</CardTitle>
              <CardDescription>AI-generated schema definitions and privacy hazard detection.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Definition (Auto-generated)</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Sensitivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.columns.map((col, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{col.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                          {col.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={col.definition}>
                        {col.definition}
                      </TableCell>
                      <TableCell>
                        {col.isVerified ? (
                          <span className="flex items-center text-xs text-emerald-500 gap-1">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center text-xs text-amber-500 gap-1">
                            <AlertTriangle className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {col.sensitivity === "None" ? (
                          <span className="text-xs text-muted-foreground">Standard</span>
                        ) : col.sensitivity === "PII" ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                            PII
                          </Badge>
                        ) : col.sensitivity === "PHI" ? (
                          <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20">
                            <ShieldAlert className="w-3 h-3 mr-1" /> PHI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-purple-500/50 text-purple-500 bg-purple-500/10 hover:bg-purple-500/20">
                            Sensitive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setFile(null); setAnalysis(null); }}>
              Cancel
            </Button>
            <Button onClick={saveInventory}>
              Register Dataset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
