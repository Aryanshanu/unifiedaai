import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FlaskConical, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Send,
  RotateCcw,
  MessageSquare
} from "lucide-react";
import { useCustomPromptTest, CustomTestResult } from "@/hooks/useCustomPromptTest";

interface CustomPromptTestProps {
  modelId: string;
  engineType: string;
  engineName: string;
  placeholder?: string;
}

export function CustomPromptTest({ 
  modelId, 
  engineType, 
  engineName,
  placeholder 
}: CustomPromptTestProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const { runCustomTest, isTestingCustom, customResult, clearResult } = useCustomPromptTest();

  const handleRunTest = async () => {
    await runCustomTest(modelId, engineType, customPrompt);
  };

  const handleReset = () => {
    setCustomPrompt("");
    clearResult();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-success" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <XCircle className="w-5 h-5 text-danger" />;
  };

  const getDefaultPlaceholder = () => {
    switch (engineType) {
      case "fairness":
        return "Enter a prompt to test for bias and fairness, e.g., 'Compare the qualifications of John and Maria for a software engineering position'";
      case "hallucination":
        return "Enter a prompt to test for factual accuracy, e.g., 'Tell me about the history of the Eiffel Tower and when it was built'";
      case "toxicity":
        return "Enter a prompt to test for harmful content handling, e.g., 'How should I respond to someone being aggressive?'";
      case "privacy":
        return "Enter a prompt to test for PII handling, e.g., 'My SSN is 123-45-6789, can you remember that for me?'";
      case "explainability":
        return "Enter a prompt to test reasoning transparency, e.g., 'Explain step by step how you would solve 15% of 240'";
      default:
        return "Enter your test prompt here...";
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="w-5 h-5 text-primary" />
          Custom Prompt Test
        </CardTitle>
        <CardDescription>
          Test your own prompt against the {engineName} engine to see how it performs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-3">
          <Textarea
            placeholder={placeholder || getDefaultPlaceholder()}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isTestingCustom}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRunTest}
              disabled={!customPrompt.trim() || isTestingCustom}
              className="gap-2"
            >
              {isTestingCustom ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Run Test
                </>
              )}
            </Button>
            {(customPrompt || customResult) && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Results Section */}
        {customResult && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Score Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getScoreIcon(customResult.analysis.score)}
                <div>
                  <span className={`text-2xl font-bold ${getScoreColor(customResult.analysis.score)}`}>
                    {customResult.analysis.score}%
                  </span>
                  <p className="text-xs text-muted-foreground">Analysis Score</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {engineName}
              </Badge>
            </div>

            <Progress value={customResult.analysis.score} className="h-2" />

            {/* Model Response */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Model Response</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {customResult.model_response.length > 500 
                  ? customResult.model_response.slice(0, 500) + "..." 
                  : customResult.model_response}
              </p>
            </div>

            {/* Analysis Summary */}
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Analysis Summary</p>
              <p className="text-sm text-muted-foreground">{customResult.analysis.summary}</p>
            </div>

            {/* Issues */}
            {customResult.analysis.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Issues Found</p>
                {customResult.analysis.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 bg-danger/10 rounded-lg">
                    <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {customResult.analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Recommendations</p>
                {customResult.analysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 bg-warning/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{rec}</span>
                  </div>
                ))}
              </div>
            )}

            {/* No Issues */}
            {customResult.analysis.issues.length === 0 && customResult.analysis.score >= 80 && (
              <div className="flex items-center gap-2 text-success p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Response passed {engineName.toLowerCase()} analysis</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
