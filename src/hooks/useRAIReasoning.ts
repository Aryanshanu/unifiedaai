import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface ReasoningStep {
  step: number;
  thought: string;
  observation: string;
  conclusion: string;
}

export interface RAIEvaluationResult {
  success: boolean;
  evaluation_id: string;
  overall_score: number;
  metric_details: Record<string, number>;
  reasoning_chain: ReasoningStep[];
  transparency_summary: string;
}

export function useRAIReasoning() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const runReasoningEvaluation = async (
    modelId: string,
    engineType: string
  ): Promise<RAIEvaluationResult | null> => {
    setIsEvaluating(true);

    try {
      toast({
        title: "Starting Deep Analysis",
        description: `Running K2 chain-of-thought reasoning with Gemini Pro...`,
      });

      const { data, error } = await supabase.functions.invoke("rai-reasoning-engine", {
        body: { modelId, engineType },
      });

      if (error) {
        throw new Error(error.message || "Evaluation failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Evaluation failed");
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`${engineType}-results`, modelId] });

      toast({
        title: "Analysis Complete",
        description: `${engineType.charAt(0).toUpperCase() + engineType.slice(1)} score: ${data.overall_score}% with full reasoning chain`,
      });

      return data as RAIEvaluationResult;
    } catch (error: any) {
      console.error("RAI Reasoning evaluation error:", error);
      toast({
        title: "Evaluation Failed",
        description: error.message || "An error occurred during evaluation",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsEvaluating(false);
    }
  };

  return {
    runReasoningEvaluation,
    isEvaluating,
  };
}
