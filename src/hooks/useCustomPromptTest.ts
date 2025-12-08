import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CustomTestResult {
  success: boolean;
  engine_type: string;
  custom_prompt: string;
  model_response: string;
  analysis: {
    score: number;
    summary: string;
    issues: string[];
    recommendations: string[];
  };
}

export function useCustomPromptTest() {
  const [isTestingCustom, setIsTestingCustom] = useState(false);
  const [customResult, setCustomResult] = useState<CustomTestResult | null>(null);
  const { toast } = useToast();

  const runCustomTest = async (
    modelId: string,
    engineType: string,
    customPrompt: string
  ): Promise<CustomTestResult | null> => {
    if (!customPrompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a test prompt",
        variant: "destructive",
      });
      return null;
    }

    setIsTestingCustom(true);
    setCustomResult(null);

    try {
      toast({
        title: "Running Custom Test",
        description: `Testing your prompt against the ${engineType} engine...`,
      });

      const { data, error } = await supabase.functions.invoke("custom-prompt-test", {
        body: { modelId, engineType, customPrompt },
      });

      if (error) {
        throw new Error(error.message || "Custom test failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Custom test failed");
      }

      const result = data as CustomTestResult;
      setCustomResult(result);

      toast({
        title: "Custom Test Complete",
        description: `${engineType.charAt(0).toUpperCase() + engineType.slice(1)} analysis score: ${result.analysis.score}%`,
      });

      return result;
    } catch (error: any) {
      console.error("Custom prompt test error:", error);
      toast({
        title: "Test Failed",
        description: error.message || "An error occurred during testing",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTestingCustom(false);
    }
  };

  const clearResult = () => {
    setCustomResult(null);
  };

  return {
    runCustomTest,
    isTestingCustom,
    customResult,
    clearResult,
  };
}
