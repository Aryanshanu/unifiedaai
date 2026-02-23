import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Loader2, CheckCircle, Copy, Download, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface AttestationSignerProps {
  modelId: string;
  modelName: string;
  frameworkId?: string;
}

interface SignedAttestation {
  id: string;
  title: string;
  signature: string;
  hash: string;
  timestamp: string;
  signedBy: string;
}

export function AttestationSigner({ modelId, modelName, frameworkId }: AttestationSignerProps) {
  const [open, setOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [title, setTitle] = useState(`RAI Compliance Attestation - ${modelName}`);
  const [notes, setNotes] = useState("");
  const [signedAttestation, setSignedAttestation] = useState<SignedAttestation | null>(null);
  const { user, profile } = useAuth();

  const generateHash = (content: string): string => {
    // Demonstration SHA-256 hash - NOT cryptographically secure
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}...${Date.now().toString(16)}`;
  };

  const generateMinisignSignature = (): string => {
    // Demonstration minisign-style signature - NOT cryptographically secure
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `RWQ${timestamp}${randomPart}`.toUpperCase();
  };

  const handleSign = async () => {
    if (!title.trim()) {
      toast.error("Please provide a title for the attestation");
      return;
    }

    setIsSigning(true);

    try {
      const timestamp = new Date().toISOString();
      const content = `${title}\n${modelId}\n${timestamp}\n${notes}`;
      const hash = generateHash(content);
      const signature = generateMinisignSignature();
      const signedBy = profile?.full_name || user?.email || 'Unknown';

      // Create attestation in database
      const { data, error } = await supabase
        .from('attestations')
        .insert({
          title,
          model_id: modelId,
          framework_id: frameworkId,
          status: 'approved',
          signed_at: timestamp,
          signed_by: user?.id,
          document_url: `data:application/json,${encodeURIComponent(JSON.stringify({
            title,
            model_id: modelId,
            signature,
            hash,
            timestamp,
            signed_by: signedBy,
            disclaimer: "This signature is for demonstration purposes and is not cryptographically secure."
          }))}`,
        })
        .select()
        .single();

      if (error) throw error;

      setSignedAttestation({
        id: data.id,
        title,
        signature,
        hash,
        timestamp,
        signedBy
      });

      toast.success("Demo attestation created", {
        description: "Simulated signature generated (not production-grade)"
      });
    } catch (error: any) {
      toast.error("Failed to create attestation", {
        description: error.message
      });
    } finally {
      setIsSigning(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadPDF = () => {
    if (!signedAttestation) return;
    
    const issueDate = format(new Date(), 'MMMM yyyy');
    
    // Create a printable HTML document
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${signedAttestation.title}</title>
  <style>
    body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .title { font-size: 20px; margin-top: 10px; }
    .section { margin: 20px 0; }
    .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 14px; margin-top: 5px; font-family: 'Courier New', monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; }
    .signature-box { border: 2px solid #1a1a2e; padding: 20px; margin: 30px 0; background: #fafafa; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
    .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
    .warning { background: #fef3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 20px 0; color: #856404; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">FRACTAL UNIFIED AUTONOMOUS GOVERNANCE</div>
    <div class="title">${signedAttestation.title}</div>
    <span class="badge">DEMO ATTESTATION</span>
  </div>
  
  <div class="warning">
    <strong>DEMONSTRATION ONLY:</strong> This attestation uses demonstration signatures for demonstration purposes. 
    It is not cryptographically secure and should not be used for production compliance requirements.
  </div>
  
  <div class="section">
    <div class="label">Model ID</div>
    <div class="value">${modelId}</div>
  </div>
  
  <div class="signature-box">
    <div class="section">
      <div class="label">Demonstration Signature (minisign-style)</div>
      <div class="value">${signedAttestation.signature}</div>
    </div>
    
    <div class="section">
      <div class="label">Demonstration Hash</div>
      <div class="value">${signedAttestation.hash}</div>
    </div>
    
    <div class="section">
      <div class="label">Signed By</div>
      <div class="value">${signedAttestation.signedBy}</div>
    </div>
    
    <div class="section">
      <div class="label">Timestamp</div>
      <div class="value">${format(new Date(signedAttestation.timestamp), 'PPPPpppp')}</div>
    </div>
  </div>
  
  <div class="section">
    <div class="label">Attestation ID</div>
    <div class="value">${signedAttestation.id}</div>
  </div>
  
  <div class="footer">
    <p>This attestation was generated by Fractal Unified Autonomous Governance Platform</p>
    <p>Issued: ${issueDate}</p>
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-${signedAttestation.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Attestation downloaded", {
      description: "Open in browser and print to PDF"
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSignature className="w-4 h-4" />
          Sign Attestation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            Generate Demo Attestation
          </DialogTitle>
          <DialogDescription>
            Create a demonstration attestation for {modelName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Disclaimer Banner */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-warning">Demonstration Only:</span>{" "}
              <span className="text-muted-foreground">
                Signatures are for demonstration purposes and not cryptographically secure. For production use, integrate with a signing service.
              </span>
            </div>
          </div>

          {!signedAttestation ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Attestation Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional compliance notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  This will generate a demonstration signature for demonstration purposes.
                </p>
              </div>

              <Button onClick={handleSign} disabled={isSigning} className="w-full gap-2">
                {isSigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4" />
                    Create Demo Attestation
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <p className="font-medium text-foreground">Demo Attestation Created</p>
                  <p className="text-sm text-muted-foreground">Demonstration signature generated (not production-grade)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">DEMONSTRATION SIGNATURE</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-secondary p-3 rounded-lg font-mono overflow-x-auto">
                      {signedAttestation.signature}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(signedAttestation.signature, 'Signature')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">DEMONSTRATION HASH</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-secondary p-3 rounded-lg font-mono overflow-x-auto">
                      {signedAttestation.hash}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(signedAttestation.hash, 'Hash')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">SIGNED BY</Label>
                    <p className="mt-1">{signedAttestation.signedBy}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">TIMESTAMP</Label>
                    <p className="mt-1">{format(new Date(signedAttestation.timestamp), 'PPpp')}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button onClick={downloadPDF} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Download HTML
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}