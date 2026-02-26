import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BookOpen, Code, Terminal, Copy, CheckCircle, Database, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const GATEWAY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-layer-gateway`;

const endpoints = [
  { method: "GET", path: "/features/{entityId}", description: "Retrieve computed features for an entity", body: null },
  { method: "GET", path: "/feature-list?status=active", description: "List all registered features with metadata", body: null },
  { method: "POST", path: "/realtime-signal", description: "Ingest a real-time signal/event", body: '{"feature_name": "customer_ltv", "entity_id": "cust_123", "value": 4500}' },
  { method: "GET", path: "/definition/{metricName}", description: "Get governed metric definition (SQL, version, hash)", body: null },
  { method: "POST", path: "/search", description: "Semantic search across definitions and features", body: '{"query": "revenue", "limit": 10}' },
  { method: "GET", path: "/lineage/{featureId}", description: "Feature dependency graph", body: null },
];

const codeSnippets = {
  curl: `curl "${GATEWAY_BASE}/feature-list?status=active" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  python: `import requests

# Get all active features
features = requests.get(
    "${GATEWAY_BASE}/feature-list",
    params={"status": "active"},
    headers={"Authorization": "Bearer YOUR_API_KEY"}
).json()

# Ingest a real-time signal
requests.post(
    "${GATEWAY_BASE}/realtime-signal",
    headers={"Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json"},
    json={"feature_name": "customer_ltv", "entity_id": "cust_123", "value": 4500}
)`,
  javascript: `// Fetch features for an entity
const resp = await fetch(
  "${GATEWAY_BASE}/features/cust_123",
  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }
);
const { data } = await resp.json();`,
};

export default function SemanticLayerHub() {
  const [testPath, setTestPath] = useState("/feature-list?status=active");
  const [testMethod, setTestMethod] = useState("GET");
  const [testBody, setTestBody] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch feature registry for the browser tab
  const { data: features, isLoading } = useQuery({
    queryKey: ["feature-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_registry" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const runTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const url = `${GATEWAY_BASE}${testPath}`;
      const options: RequestInit = {
        method: testMethod,
        headers: { "Content-Type": "application/json" },
      };
      if (testMethod === "POST" && testBody) options.body = testBody;
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
    <MainLayout title="Semantic Layer & Feature Store">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Semantic Layer &amp; Feature Store</h1>
            <p className="text-muted-foreground">Standalone modular API for governed features, metrics, and real-time signals</p>
          </div>
          <Badge variant="outline" className="ml-auto">v1.0.0</Badge>
        </div>

        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features">Feature Store</TabsTrigger>
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
            <TabsTrigger value="tester">Live Tester</TabsTrigger>
            <TabsTrigger value="integration">Integration Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-3">
            {isLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading features…</CardContent></Card>
            ) : (features as any[])?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No Features Registered</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Register features via the API: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /realtime-signal</code>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {(features as any[])?.map((f: any) => (
                  <Card key={f.id}>
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono font-medium text-foreground">{f.name}</code>
                          <Badge variant={f.status === "active" ? "default" : "secondary"} className="text-xs">{f.status}</Badge>
                          <Badge variant="outline" className="text-xs">v{f.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{f.display_name} — {f.description || "No description"}</p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Type: {f.data_type}</span>
                          <span>Grain: {f.grain}</span>
                          <span>Refresh: {f.refresh_cadence}</span>
                          {f.quality_score && <span>Quality: {(f.quality_score * 100).toFixed(0)}%</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

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
                    {ep.body && <pre className="text-xs bg-muted/50 rounded p-2 mt-2 overflow-x-auto">{ep.body}</pre>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setTestMethod(ep.method); setTestPath(ep.path.split("?")[0]); setTestBody(ep.body || ""); }}>
                    <Terminal className="w-3 h-3 mr-1" /> Try
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tester" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Terminal className="w-5 h-5" /> API Tester</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <select value={testMethod} onChange={(e) => setTestMethod(e.target.value)} className="bg-muted border border-border rounded px-3 py-2 text-sm font-mono">
                    <option>GET</option>
                    <option>POST</option>
                  </select>
                  <input value={testPath} onChange={(e) => setTestPath(e.target.value)} className="flex-1 bg-muted border border-border rounded px-3 py-2 text-sm font-mono" />
                  <Button onClick={runTest} disabled={testing}>{testing ? "Sending…" : "Send"}</Button>
                </div>
                {testMethod === "POST" && <Textarea value={testBody} onChange={(e) => setTestBody(e.target.value)} className="font-mono text-sm" rows={4} />}
                {testResult && <pre className="bg-muted/50 border border-border rounded p-4 text-xs overflow-auto max-h-96 font-mono">{testResult}</pre>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Code className="w-5 h-5" /> Integration Snippets</CardTitle></CardHeader>
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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
