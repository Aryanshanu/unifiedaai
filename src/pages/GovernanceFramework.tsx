import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Code, Activity, Terminal, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GATEWAY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-governance-gateway`;

const endpoints = [
  { method: "POST", path: "/bias-report", description: "Run bias evaluation on a model", body: '{"model_id": "<uuid>"}' },
  { method: "POST", path: "/audit-log", description: "Log a model decision with SHA-256 hash chain", body: '{"model_id": "<uuid>", "decision_value": "approved", "context": {}}' },
  { method: "GET", path: "/audit-log?model_id=X&from=DATE&to=DATE", description: "Query audit trail", body: null },
  { method: "GET", path: "/model-metadata/{modelName}", description: "Return model card, lineage, scores", body: null },
  { method: "POST", path: "/explain", description: "AI-powered feature importance explanation", body: '{"decision_id": "<uuid>", "feature_data": {"age": 35, "income": 50000}}' },
  { method: "POST", path: "/override-request", description: "Submit a human review request", body: '{"decision_id": "<uuid>", "reason": "Needs review"}' },
  { method: "POST", path: "/incidents/check", description: "Check for open incidents", body: '{"model_id": "<uuid>"}' },
  { method: "GET", path: "/incidents?severity=critical&status=open", description: "Query incidents", body: null },
];

const codeSnippets = {
  curl: `curl -X POST "${GATEWAY_BASE}/bias-report" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"model_id": "your-model-id"}'`,
  python: `import requests

response = requests.post(
    "${GATEWAY_BASE}/bias-report",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY"
    },
    json={"model_id": "your-model-id"}
)
print(response.json())`,
  javascript: `const response = await fetch(
  "${GATEWAY_BASE}/bias-report",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({ model_id: "your-model-id" })
  }
);
const data = await response.json();`,
};

export default function GovernanceFramework() {
  const [testPath, setTestPath] = useState("/incidents?status=open");
  const [testMethod, setTestMethod] = useState("GET");
  const [testBody, setTestBody] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const { toast } = useToast();

  const runTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const url = `${GATEWAY_BASE}${testPath}`;
      const options: RequestInit = {
        method: testMethod,
        headers: { "Content-Type": "application/json" },
      };
      if (testMethod === "POST" && testBody) {
        options.body = testBody;
      }
      const resp = await fetch(url, options);
      const data = await resp.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setTesting(false);
    }
  };

  const copySnippet = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <MainLayout title="AI Governance Framework">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Governance Framework</h1>
            <p className="text-muted-foreground">Standalone modular API for bias monitoring, audit logging, explainability, and incident response</p>
          </div>
          <Badge variant="outline" className="ml-auto">v1.0.0</Badge>
        </div>

        <Tabs defaultValue="endpoints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
            <TabsTrigger value="tester">Live Tester</TabsTrigger>
            <TabsTrigger value="integration">Integration Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="space-y-3">
            {endpoints.map((ep, i) => (
              <Card key={i}>
                <CardContent className="py-4 flex items-start gap-4">
                  <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="font-mono text-xs shrink-0 mt-0.5">
                    {ep.method}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-foreground">{ep.path}</code>
                    <p className="text-sm text-muted-foreground mt-1">{ep.description}</p>
                    {ep.body && (
                      <pre className="text-xs bg-muted/50 rounded p-2 mt-2 overflow-x-auto">{ep.body}</pre>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTestMethod(ep.method);
                      setTestPath(ep.path.split("?")[0]);
                      setTestBody(ep.body || "");
                    }}
                  >
                    <Terminal className="w-3 h-3 mr-1" /> Try
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tester" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5" /> API Tester
                </CardTitle>
                <CardDescription>Send requests to the AI Governance Gateway</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <select
                    value={testMethod}
                    onChange={(e) => setTestMethod(e.target.value)}
                    className="bg-muted border border-border rounded px-3 py-2 text-sm font-mono"
                  >
                    <option>GET</option>
                    <option>POST</option>
                  </select>
                  <input
                    value={testPath}
                    onChange={(e) => setTestPath(e.target.value)}
                    className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm font-mono"
                    placeholder="/bias-report"
                  />
                  <Button onClick={runTest} disabled={testing}>
                    {testing ? "Sending…" : "Send"}
                  </Button>
                </div>
                {testMethod === "POST" && (
                  <Textarea
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    placeholder='{"model_id": "..."}'
                    className="font-mono text-sm"
                    rows={4}
                  />
                )}
                {testResult && (
                  <pre className="bg-muted/50 border border-border rounded p-4 text-xs overflow-auto max-h-96 font-mono">
                    {testResult}
                  </pre>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5" /> Integration Snippets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(codeSnippets).map(([lang, code]) => (
                  <div key={lang}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="uppercase text-xs">{lang}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => copySnippet(lang, code)}>
                        {copiedSnippet === lang ? <CheckCircle className="w-3 h-3 mr-1 text-primary" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copiedSnippet === lang ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <pre className="bg-muted/50 border border-border rounded p-3 text-xs overflow-x-auto font-mono">{code}</pre>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Response Format</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 border border-border rounded p-3 text-xs font-mono">{`{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-26T05:00:00Z",
    "version": "1.0.0",
    "hash": "abc123..." // when applicable
  }
}`}</pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
