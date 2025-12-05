import { MainLayout } from "@/components/layout/MainLayout";
import { useModels } from "@/hooks/useModels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Scale, AlertCircle, ShieldAlert, Lock, Eye, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const { data: models } = useModels();
  const navigate = useNavigate();

  const engines = [
    { 
      name: "Fairness Engine", 
      icon: Scale, 
      path: "/engine/fairness",
      description: "Evaluate demographic parity, equalized odds, and bias metrics",
      color: "text-blue-500"
    },
    { 
      name: "Hallucination Engine", 
      icon: AlertCircle, 
      path: "/engine/hallucination",
      description: "Detect factuality issues, groundedness, and false claims",
      color: "text-orange-500"
    },
    { 
      name: "Toxicity Engine", 
      icon: ShieldAlert, 
      path: "/engine/toxicity",
      description: "Measure harmful content, hate speech, and jailbreak resistance",
      color: "text-red-500"
    },
    { 
      name: "Privacy Engine", 
      icon: Lock, 
      path: "/engine/privacy",
      description: "Assess PII leakage, data memorization, and privacy risks",
      color: "text-green-500"
    },
    { 
      name: "Explainability Engine", 
      icon: Eye, 
      path: "/engine/explainability",
      description: "Analyze reasoning quality, transparency, and decision clarity",
      color: "text-purple-500"
    },
  ];

  return (
    <MainLayout title="Dashboard" subtitle="Fractal RAI Platform Overview">
      {/* Model Stats */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Model Registry</CardTitle>
          </div>
          <Button onClick={() => navigate("/models")} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Register Model
          </Button>
        </CardHeader>
        <CardContent>
          {models && models.length > 0 ? (
            <div>
              <p className="text-2xl font-bold text-foreground">{models.length}</p>
              <p className="text-sm text-muted-foreground">registered models</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No models registered yet</p>
              <Button onClick={() => navigate("/models")} variant="outline">
                Register your first Hugging Face model
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Core Engines Grid */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Core RAI Engines</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {engines.map((engine) => {
          const Icon = engine.icon;
          return (
            <Card 
              key={engine.path} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(engine.path)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${engine.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{engine.name}</h3>
                    <p className="text-sm text-muted-foreground">{engine.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
}
