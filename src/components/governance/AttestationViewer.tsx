import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  X,
  FileJson,
  Hash,
  GitCommit
} from "lucide-react";
import { format } from "date-fns";

interface Attestation {
  id: string;
  system_id: string;
  model_id: string;
  deployment_id: string;
  commit_sha: string;
  artifact_hash: string;
  approved_artifact_hash: string | null;
  hash_match: boolean | null;
  verification_status: string;
  slsa_level: number | null;
  attestation_bundle: Record<string, unknown> | null;
  signature: string | null;
  created_at: string;
  verified_at: string | null;
  bypass_reason: string | null;
  bypass_authorized_by: string | null;
}

interface AttestationViewerProps {
  attestations: Attestation[];
  onClose: () => void;
}

export function AttestationViewer({ attestations, onClose }: AttestationViewerProps) {
  const getStatusBadge = (status: string, hashMatch: boolean | null) => {
    if (status === 'verified' && hashMatch) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (status === 'failed' || hashMatch === false) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    if (status === 'bypassed') {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Bypassed
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        {status}
      </Badge>
    );
  };

  const getSLSABadge = (level: number | null) => {
    if (!level) return null;
    
    const colors: Record<number, string> = {
      1: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      2: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      3: 'bg-green-500/10 text-green-500 border-green-500/20',
      4: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };

    return (
      <Badge className={colors[level] || 'bg-muted'}>
        SLSA L{level}
      </Badge>
    );
  };

  const downloadBundle = (attestation: Attestation) => {
    const bundle = attestation.attestation_bundle || {
      id: attestation.id,
      artifact_hash: attestation.artifact_hash,
      commit_sha: attestation.commit_sha,
      verification_status: attestation.verification_status,
      slsa_level: attestation.slsa_level,
      verified_at: attestation.verified_at
    };
    
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-${attestation.id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (attestations.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Deployment Attestations
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No attestations found for this system
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Deployment Attestations
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {attestations.map((attestation) => (
          <div 
            key={attestation.id} 
            className={`p-4 rounded-lg border ${
              attestation.hash_match === false ? 'border-destructive bg-destructive/5' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusBadge(attestation.verification_status, attestation.hash_match)}
                {getSLSABadge(attestation.slsa_level)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => downloadBundle(attestation)}>
                <Download className="h-4 w-4 mr-1" />
                Bundle
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <GitCommit className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Commit:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                  {attestation.commit_sha.substring(0, 12)}
                </code>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Artifact Hash:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono truncate max-w-[200px]">
                  {attestation.artifact_hash.substring(0, 16)}...
                </code>
                {attestation.hash_match === true && (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                {attestation.hash_match === false && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>

              {attestation.approved_artifact_hash && attestation.hash_match === false && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Expected hash mismatch!</span>
                </div>
              )}

              {attestation.bypass_reason && (
                <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20">
                  <p className="text-sm font-medium text-warning">Bypass Reason:</p>
                  <p className="text-sm text-muted-foreground">{attestation.bypass_reason}</p>
                  {attestation.bypass_authorized_by && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Authorized by: {attestation.bypass_authorized_by}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Created: {format(new Date(attestation.created_at), "MMM d, yyyy HH:mm")}</span>
                {attestation.verified_at && (
                  <span>Verified: {format(new Date(attestation.verified_at), "MMM d, yyyy HH:mm")}</span>
                )}
              </div>

              {attestation.attestation_bundle && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-primary hover:underline flex items-center gap-1">
                    <FileJson className="h-3 w-3" />
                    View Raw Bundle
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto max-h-40">
                    {JSON.stringify(attestation.attestation_bundle, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
