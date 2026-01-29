import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Shield,
  FileText,
  Copy
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface RCATemplate {
  id: string;
  incident_type: string;
  template_content: {
    title: string;
    sections: {
      name: string;
      questions: string[];
    }[];
  };
  required_fields: string[];
  created_at: string;
}

function DecisionTree() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Incident Triage Decision Tree
        </CardTitle>
        <CardDescription>
          Follow this flowchart to properly triage and escalate incidents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Is this a security incident?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Check if the incident involves unauthorized access, data breach, or system compromise
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  Yes → Escalate to Security Team immediately
                </Badge>
                <Badge variant="outline" className="bg-muted">
                  No → Continue to step 2
                </Badge>
              </div>
            </div>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-border h-6" />

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">What is the severity?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Assess impact based on affected users, data sensitivity, and business impact
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  Critical → Immediate response (SLA: 15min)
                </Badge>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  High → Urgent response (SLA: 1hr)
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Medium → Standard response (SLA: 4hr)
                </Badge>
                <Badge variant="outline" className="bg-muted">
                  Low → Best effort (SLA: 24hr)
                </Badge>
              </div>
            </div>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-border h-6" />

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Does this require human decision?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Determine if automated remediation is possible or human judgment is needed
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Yes → Route to HITL Queue
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  No → Apply auto-remediation
                </Badge>
              </div>
            </div>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-border h-6" />

          {/* Step 4 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-success-foreground font-bold text-sm">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Document and close</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Complete RCA template, record lessons learned, and verify resolution
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Resolved
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EscalationPaths() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Escalation Paths
        </CardTitle>
        <CardDescription>
          Contact matrix for different incident types and severity levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="destructive">Critical Security</Badge>
              <span className="text-xs text-muted-foreground">SLA: 15 min</span>
            </div>
            <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
              <li>Security Team Lead (immediate)</li>
              <li>CISO (within 30 min)</li>
              <li>Legal/Compliance (if data breach)</li>
              <li>Executive leadership (if public-facing)</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-warning text-warning-foreground">High Severity</Badge>
              <span className="text-xs text-muted-foreground">SLA: 1 hr</span>
            </div>
            <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
              <li>On-call engineer</li>
              <li>Team lead (if not resolved in 30 min)</li>
              <li>Product owner (if customer-facing)</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <Badge>Standard</Badge>
              <span className="text-xs text-muted-foreground">SLA: 4 hr</span>
            </div>
            <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
              <li>Assigned team member</li>
              <li>Team lead (if blocked)</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RCATemplates() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['rca-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rca_templates')
        .select('*')
        .order('incident_type');
      if (error) throw error;
      return data as RCATemplate[];
    }
  });

  const copyTemplate = (template: RCATemplate) => {
    const content = template.template_content;
    let text = `# ${content.title}\n\n`;
    content.sections.forEach(section => {
      text += `## ${section.name}\n`;
      section.questions.forEach(q => {
        text += `- ${q}\n`;
      });
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    toast.success("Template copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No RCA templates available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">
                {template.incident_type.replace(/_/g, ' ')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyTemplate(template)}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(template.template_content as any).sections?.map((section: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-foreground">{section.name}:</span>
                  <span className="text-muted-foreground ml-2">
                    {section.questions?.length || 0} questions
                  </span>
                </div>
              ))}
            </div>
            {template.required_fields && template.required_fields.length > 0 && (
              <div className="flex gap-1 mt-3 flex-wrap">
                {template.required_fields.map((field, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Runbooks() {
  return (
    <MainLayout 
      title="Runbooks" 
      subtitle="Incident response guides and decision frameworks"
      headerActions={
        <Badge variant="outline" className="gap-1.5">
          <BookOpen className="w-3 h-3" />
          Governance Guides
        </Badge>
      }
    >
      <Tabs defaultValue="decision-tree" className="space-y-6">
        <TabsList>
          <TabsTrigger value="decision-tree">Triage Decision Tree</TabsTrigger>
          <TabsTrigger value="escalation">Escalation Paths</TabsTrigger>
          <TabsTrigger value="rca">RCA Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="decision-tree">
          <DecisionTree />
        </TabsContent>

        <TabsContent value="escalation">
          <EscalationPaths />
        </TabsContent>

        <TabsContent value="rca">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Root Cause Analysis Templates
              </CardTitle>
              <CardDescription>
                Structured templates for post-incident analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RCATemplates />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
