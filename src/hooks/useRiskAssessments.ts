import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database, Json } from "@/integrations/supabase/types";

type RiskTier = Database["public"]["Enums"]["risk_tier"];

export interface DimensionScores {
  dataRisk: number;
  modelRisk: number;
  useCaseRisk: number;
  operationalRisk: number;
  regulatoryRisk: number;
  ethicalRisk: number;
}

export interface QuestionnaireAnswers {
  // Step 1: Use Case & Autonomy
  useCase?: string;
  decisionType?: "advisory" | "automated" | "hybrid";
  humanOverride?: boolean;
  
  // Step 2: Data Profile
  dataTypes?: string[];
  piiLevel?: "none" | "indirect" | "direct" | "special";
  
  // Step 3: Users & Deployment
  userTypes?: string[];
  deploymentSurface?: string[];
  
  // Step 4: Regulatory Context
  regulatedAreas?: string[];
  euAiActRisk?: "minimal" | "limited" | "high" | "unacceptable";
  regulatoryNotes?: string;
}

export interface RiskAssessment {
  id: string;
  project_id: string;
  system_id: string;
  version: number;
  dimension_scores: DimensionScores;
  static_risk_score: number;
  runtime_risk_score: number;
  uri_score: number;
  risk_tier: RiskTier;
  questionnaire_answers: QuestionnaireAnswers;
  summary: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRiskAssessmentInput {
  project_id: string;
  system_id: string;
  questionnaire_answers: QuestionnaireAnswers;
}

// Risk calculation logic
export function calculateRiskScores(answers: QuestionnaireAnswers): {
  dimensionScores: DimensionScores;
  staticRiskScore: number;
  riskTier: RiskTier;
  summary: string;
} {
  // Calculate dimension scores (1-5 scale)
  
  // Data Risk
  let dataRisk = 1;
  if (answers.piiLevel === "indirect") dataRisk = 2;
  if (answers.piiLevel === "direct") dataRisk = 4;
  if (answers.piiLevel === "special") dataRisk = 5;
  if (answers.dataTypes?.includes("health")) dataRisk = Math.max(dataRisk, 4);
  if (answers.dataTypes?.includes("financial")) dataRisk = Math.max(dataRisk, 4);
  if (answers.dataTypes?.includes("minors")) dataRisk = Math.max(dataRisk, 5);

  // Model Risk
  let modelRisk = 2;
  if (answers.decisionType === "hybrid") modelRisk = 3;
  if (answers.decisionType === "automated") modelRisk = 5;
  if (answers.humanOverride === true) modelRisk = Math.max(1, modelRisk - 1);

  // Use Case Risk
  let useCaseRisk = 2;
  if (answers.decisionType === "automated") useCaseRisk = 4;
  if (answers.regulatedAreas?.length && answers.regulatedAreas.length > 0) {
    useCaseRisk = Math.max(useCaseRisk, 4);
  }

  // Operational Risk
  let operationalRisk = 1;
  if (answers.deploymentSurface?.includes("internal")) operationalRisk = 1;
  if (answers.deploymentSurface?.includes("b2b")) operationalRisk = 2;
  if (answers.deploymentSurface?.includes("public")) operationalRisk = 4;
  if (answers.deploymentSurface?.includes("api")) operationalRisk = Math.max(operationalRisk, 3);

  // Regulatory Risk
  let regulatoryRisk = 1;
  if (answers.euAiActRisk === "limited") regulatoryRisk = 2;
  if (answers.euAiActRisk === "high") regulatoryRisk = 4;
  if (answers.euAiActRisk === "unacceptable") regulatoryRisk = 5;
  if (answers.regulatedAreas?.includes("credit")) regulatoryRisk = Math.max(regulatoryRisk, 4);
  if (answers.regulatedAreas?.includes("hiring")) regulatoryRisk = Math.max(regulatoryRisk, 4);
  if (answers.regulatedAreas?.includes("healthcare")) regulatoryRisk = Math.max(regulatoryRisk, 4);
  if (answers.regulatedAreas?.includes("law")) regulatoryRisk = Math.max(regulatoryRisk, 5);

  // Ethical Risk
  let ethicalRisk = 1;
  if (answers.userTypes?.includes("vulnerable")) ethicalRisk = 4;
  if (answers.userTypes?.includes("minors")) ethicalRisk = 5;
  if (answers.dataTypes?.includes("minors")) ethicalRisk = Math.max(ethicalRisk, 5);

  const dimensionScores: DimensionScores = {
    dataRisk,
    modelRisk,
    useCaseRisk,
    operationalRisk,
    regulatoryRisk,
    ethicalRisk,
  };

  // Calculate static risk score (0-100)
  const staticRiskScore = (
    0.2 * dataRisk +
    0.2 * modelRisk +
    0.2 * useCaseRisk +
    0.2 * operationalRisk +
    0.1 * regulatoryRisk +
    0.1 * ethicalRisk
  ) / 5 * 100;

  // Determine risk tier
  let riskTier: RiskTier = "low";
  if (staticRiskScore > 30) riskTier = "medium";
  if (staticRiskScore > 60) riskTier = "high";
  if (staticRiskScore > 80) riskTier = "critical";

  // Generate summary
  const riskFactors: string[] = [];
  if (dataRisk >= 4) riskFactors.push("processes sensitive personal data");
  if (modelRisk >= 4) riskFactors.push("makes automated decisions");
  if (regulatoryRisk >= 4) riskFactors.push("operates in a regulated domain");
  if (operationalRisk >= 4) riskFactors.push("is publicly exposed");
  if (ethicalRisk >= 4) riskFactors.push("impacts vulnerable populations");

  const summary = riskFactors.length > 0
    ? `This system is ${riskTier.toUpperCase()} risk because it ${riskFactors.join(", ")}.`
    : `This system has ${riskTier.toUpperCase()} risk based on current configuration.`;

  return { dimensionScores, staticRiskScore, riskTier, summary };
}

export function useRiskAssessments(systemId?: string) {
  return useQuery({
    queryKey: ["risk-assessments", systemId],
    queryFn: async () => {
      let query = supabase
        .from("risk_assessments")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (systemId) {
        query = query.eq("system_id", systemId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(row => ({
        ...row,
        dimension_scores: row.dimension_scores as unknown as DimensionScores,
        questionnaire_answers: row.questionnaire_answers as unknown as QuestionnaireAnswers,
      })) as RiskAssessment[];
    },
    enabled: systemId !== undefined,
  });
}

export function useLatestRiskAssessment(systemId: string) {
  return useQuery({
    queryKey: ["risk-assessments", systemId, "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_assessments")
        .select("*")
        .eq("system_id", systemId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        dimension_scores: data.dimension_scores as unknown as DimensionScores,
        questionnaire_answers: data.questionnaire_answers as unknown as QuestionnaireAnswers,
      } as RiskAssessment;
    },
    enabled: !!systemId,
  });
}

export function useCreateRiskAssessment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRiskAssessmentInput) => {
      // Calculate risk scores
      const { dimensionScores, staticRiskScore, riskTier, summary } = 
        calculateRiskScores(input.questionnaire_answers);

      // Get the latest version for this system
      const { data: existing } = await supabase
        .from("risk_assessments")
        .select("version")
        .eq("system_id", input.system_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const version = (existing?.version ?? 0) + 1;

      const { data, error } = await supabase
        .from("risk_assessments")
        .insert([{
          project_id: input.project_id,
          system_id: input.system_id,
          version,
          dimension_scores: dimensionScores as unknown as Json,
          questionnaire_answers: input.questionnaire_answers as unknown as Json,
          static_risk_score: staticRiskScore,
          runtime_risk_score: 0, // Not implemented yet
          uri_score: staticRiskScore, // For now, URI = static
          risk_tier: riskTier,
          summary,
          created_by: user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        dimension_scores: data.dimension_scores as unknown as DimensionScores,
        questionnaire_answers: data.questionnaire_answers as unknown as QuestionnaireAnswers,
      } as RiskAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["risk-assessments", data.system_id] });
      queryClient.invalidateQueries({ queryKey: ["risk-assessments", data.system_id, "latest"] });
    },
  });
}
