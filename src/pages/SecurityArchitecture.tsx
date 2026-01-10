import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Database, 
  Zap, 
  Link2, 
  Lock,
  AlertTriangle,
  CheckCircle2,
  Server
} from 'lucide-react';

interface EnforcementLayerProps {
  icon: React.ElementType;
  name: string;
  badge: string;
  description: string;
  examples: string[];
  color: string;
}

function EnforcementLayer({ icon: Icon, name, badge, description, examples, color }: EnforcementLayerProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {name}
              <Badge variant="outline" className="text-xs">{badge}</Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1 text-muted-foreground">
          {examples.map((example, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              {example}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function SecurityArchitecture() {
  const enforcementLayers: EnforcementLayerProps[] = [
    {
      icon: Database,
      name: 'Row-Level Security (RLS)',
      badge: 'Database Layer',
      description: 'PostgreSQL policies that enforce access control at the database level',
      examples: [
        'Users can only read their own projects',
        'Only admins can update governance activation state',
        'Decision ledger entries are immutable once created',
        'Attestations require proper user_id matching',
      ],
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      icon: Zap,
      name: 'Edge Function Authorization',
      badge: 'API Layer',
      description: 'Server-side validation in Deno edge functions before any action',
      examples: [
        'JWT token verification on every request',
        'Role-based access control for admin operations',
        'Input validation and sanitization',
        'Rate limiting and abuse prevention',
      ],
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      icon: Link2,
      name: 'Hash-Chain Immutability',
      badge: 'Integrity Layer',
      description: 'Cryptographic proof that audit trail cannot be tampered',
      examples: [
        'Decision ledger uses SHA-256 hash chains',
        'Each record references previous record hash',
        'Override decisions include evidence hashes',
        'Attestation bundles are cryptographically signed',
      ],
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      icon: Server,
      name: 'Database Triggers',
      badge: 'Automation Layer',
      description: 'PostgreSQL triggers that enforce business rules automatically',
      examples: [
        'updated_at timestamps auto-update on changes',
        'Hash computation on decision ledger inserts',
        'Escalation triggers for harmful outcomes',
        'Audit log entries created automatically',
      ],
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  return (
    <MainLayout
      title="Security Architecture"
      subtitle="Enforcement layers and trust boundaries"
      headerActions={
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          Server-Side Enforced
        </Badge>
      }
    >
      <div className="space-y-8">
        {/* Critical Statement */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Security Stance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border">
              <p className="font-semibold text-lg mb-2">
                Client-side role checks are <span className="text-amber-500">advisory only</span> for UX optimization.
              </p>
              <p className="text-muted-foreground">
                All enforcement occurs server-side via RLS policies, edge function authorization, 
                database triggers, and hash-chain immutability.
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="font-semibold text-lg mb-2">
                Fail-Closed Principle
              </p>
              <p className="text-muted-foreground">
                If governance state is unknown → block the action. No silent failures. No permissive defaults.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enforcement Layers */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Enforcement Layers</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {enforcementLayers.map((layer) => (
              <EnforcementLayer key={layer.name} {...layer} />
            ))}
          </div>
        </div>

        {/* What Is NOT Secure */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Known Limitations (Transparency)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-0.5">HIGH</Badge>
                <div>
                  <p className="font-medium">9 RLS Policies Use USING (true)</p>
                  <p className="text-sm text-muted-foreground">
                    Some tables have overly permissive read policies. These are intentional for public data 
                    but should be reviewed for sensitive tables.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">MEDIUM</Badge>
                <div>
                  <p className="font-medium">API Keys in Database</p>
                  <p className="text-sm text-muted-foreground">
                    HuggingFace API tokens are stored in the models table. Consider moving to Supabase Vault 
                    or environment secrets.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">MEDIUM</Badge>
                <div>
                  <p className="font-medium">Single Environment</p>
                  <p className="text-sm text-muted-foreground">
                    No staging/production separation. All changes affect live data immediately.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">LOW</Badge>
                <div>
                  <p className="font-medium">Leaked Password Protection Disabled</p>
                  <p className="text-sm text-muted-foreground">
                    Supabase's leaked password detection is not enabled. Consider enabling for production.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Trust Boundaries */}
        <Card>
          <CardHeader>
            <CardTitle>Trust Boundaries</CardTitle>
            <CardDescription>
              Where security enforcement actually happens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-500">TRUSTED</Badge>
                  <span className="font-medium">Server-Side (Supabase + Edge Functions)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  RLS policies, edge function authorization, database triggers, and hash verification 
                  are fully trusted enforcement points.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-amber-500 text-amber-500">ADVISORY</Badge>
                  <span className="font-medium">Client-Side (React UI)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Role-based UI visibility, button disabling, and client-side validation are for UX only. 
                  They can be bypassed and should never be the only enforcement.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">UNTRUSTED</Badge>
                  <span className="font-medium">External APIs</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Responses from HuggingFace, OpenRouter, and other external APIs are validated 
                  before processing. Never trust external input.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
