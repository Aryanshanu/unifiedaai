import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database, Json } from "@/integrations/supabase/types";

type ImpactQuadrant = Database["public"]["Enums"]["impact_quadrant"];

export interface DimensionScores {
  userImpact: number;
  businessImpact: number;
  legalImpact: number;
  reputationImpact: number;
  safetyImpact: number;
}

export interface ImpactQuestionnaireAnswers {
  // Step 1: User Impact
  monthlyUsers?: string;
  vulnerableGroups?: string[];
  userReliance?: "advisory" | "main_input" | "sole_decider";
  
  // Step 2: Business Impact
  failureConsequence?: "minor" | "delay" | "major_disruption" | "revenue_loss";
  revenueLinked?: boolean;
  revenueSeverity?: "low" | "medium" | "high" | "critical";
  
  // Step 3: Legal Impact
  regulatoryRisk?: "no" | "maybe" | "likely" | "almost_certain";
  regulatedDomain?: string[];
  
  // Step 4: Reputation & Safety
  viralRisk?: "no" | "limited" | "high";
  harmPotential?: "no" | "low" | "medium" | "high";
}

export interface ImpactAssessment {
  id: string;
  project_id: string;
  system_id: string;
  version: number;
  dimensions: DimensionScores;
  overall_score: number;
  quadrant: ImpactQuadrant;
  questionnaire_answers: ImpactQuestionnaireAnswers;
  summary: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateImpactAssessmentInput {
  project_id: string;
  system_id: string;
  questionnaire_answers: ImpactQuestionnaireAnswers;
  riskTier?: string; // For calculating quadrant
}

// Impact calculation logic
export function calculateImpactScores(
  answers: ImpactQuestionnaireAnswers,
  riskTier?: string
): {
  dimensions: DimensionScores;
  overallScore: number;
  quadrant: ImpactQuadrant;
  summary: string;
} {
  // Calculate dimension scores (1-5 scale)
  
  // User Impact
  let userImpact = 1;
  if (answers.monthlyUsers === "100-1000") userImpact = 2;
  if (answers.monthlyUsers === "1000-10000") userImpact = 3;
  if (answers.monthlyUsers === "10000-100000") userImpact = 4;
  if (answers.monthlyUsers === "100000+") userImpact = 5;
  if (answers.vulnerableGroups?.includes("minors")) userImpact = Math.max(userImpact, 4);
  if (answers.vulnerableGroups?.includes("patients")) userImpact = Math.max(userImpact, 4);
  if (answers.vulnerableGroups?.includes("vulnerable")) userImpact = Math.max(userImpact, 5);
  if (answers.userReliance === "main_input") userImpact = Math.max(userImpact, 3);
  if (answers.userReliance === "sole_decider") userImpact = Math.max(userImpact, 5);

  // Business Impact
  let businessImpact = 1;
  if (answers.failureConsequence === "delay") businessImpact = 2;
  if (answers.failureConsequence === "major_disruption") businessImpact = 4;
  if (answers.failureConsequence === "revenue_loss") businessImpact = 5;
  if (answers.revenueLinked) {
    if (answers.revenueSeverity === "low") businessImpact = Math.max(businessImpact, 2);
    if (answers.revenueSeverity === "medium") businessImpact = Math.max(businessImpact, 3);
    if (answers.revenueSeverity === "high") businessImpact = Math.max(businessImpact, 4);
    if (answers.revenueSeverity === "critical") businessImpact = Math.max(businessImpact, 5);
  }

  // Legal Impact
  let legalImpact = 1;
  if (answers.regulatoryRisk === "maybe") legalImpact = 2;
  if (answers.regulatoryRisk === "likely") legalImpact = 4;
  if (answers.regulatoryRisk === "almost_certain") legalImpact = 5;
  if (answers.regulatedDomain?.includes("credit")) legalImpact = Math.max(legalImpact, 4);
  if (answers.regulatedDomain?.includes("hiring")) legalImpact = Math.max(legalImpact, 4);
  if (answers.regulatedDomain?.includes("healthcare")) legalImpact = Math.max(legalImpact, 4);
  if (answers.regulatedDomain?.includes("law_enforcement")) legalImpact = Math.max(legalImpact, 5);

  // Reputation Impact
  let reputationImpact = 1;
  if (answers.viralRisk === "limited") reputationImpact = 2;
  if (answers.viralRisk === "high") reputationImpact = 4;

  // Safety Impact
  let safetyImpact = 1;
  if (answers.harmPotential === "low") safetyImpact = 2;
  if (answers.harmPotential === "medium") safetyImpact = 3;
  if (answers.harmPotential === "high") safetyImpact = 5;

  const dimensions: DimensionScores = {
    userImpact,
    businessImpact,
    legalImpact,
    reputationImpact,
    safetyImpact,
  };

  // Calculate overall impact score (0-100)
  const overallScore = (
    0.25 * userImpact +
    0.25 * businessImpact +
    0.2 * legalImpact +
    0.15 * reputationImpact +
    0.15 * safetyImpact
  ) / 5 * 100;

  // Calculate quadrant based on risk tier and impact score
  const riskLevel = getRiskLevel(riskTier);
  const impactLevel = getImpactLevel(overallScore);
  const quadrant = `${riskLevel}_${impactLevel}` as ImpactQuadrant;

  // Generate summary
  const impactFactors: string[] = [];
  if (userImpact >= 4) impactFactors.push("high user exposure");
  if (businessImpact >= 4) impactFactors.push("significant business dependency");
  if (legalImpact >= 4) impactFactors.push("regulatory compliance requirements");
  if (reputationImpact >= 4) impactFactors.push("public visibility risk");
  if (safetyImpact >= 4) impactFactors.push("potential for harm");

  const summary = impactFactors.length > 0
    ? `High impact due to ${impactFactors.join(", ")}.`
    : `Low to moderate impact based on current assessment.`;

  return { dimensions, overallScore, quadrant, summary };
}

function getRiskLevel(tier?: string): string {
  switch (tier) {
    case "critical": return "high";
    case "high": return "high";
    case "medium": return "medium";
    default: return "low";
  }
}

function getImpactLevel(score: number): string {
  if (score > 60) return "high";
  if (score > 30) return "medium";
  return "low";
}

export function useImpactAssessments(systemId?: string) {
  return useQuery({
    queryKey: ["impact-assessments", systemId],
    queryFn: async () => {
      let query = supabase
        .from("impact_assessments")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (systemId) {
        query = query.eq("system_id", systemId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(row => ({
        ...row,
        dimensions: row.dimensions as unknown as DimensionScores,
        questionnaire_answers: row.questionnaire_answers as unknown as ImpactQuestionnaireAnswers,
      })) as ImpactAssessment[];
    },
    enabled: systemId !== undefined,
  });
}

export function useLatestImpactAssessment(systemId: string) {
  return useQuery({
    queryKey: ["impact-assessments", systemId, "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_assessments")
        .select("*")
        .eq("system_id", systemId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        dimensions: data.dimensions as unknown as DimensionScores,
        questionnaire_answers: data.questionnaire_answers as unknown as ImpactQuestionnaireAnswers,
      } as ImpactAssessment;
    },
    enabled: !!systemId,
  });
}

export function useCreateImpactAssessment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateImpactAssessmentInput) => {
      const { dimensions, overallScore, quadrant, summary } = 
        calculateImpactScores(input.questionnaire_answers, input.riskTier);

      // Get the latest version
      const { data: existing } = await supabase
        .from("impact_assessments")
        .select("version")
        .eq("system_id", input.system_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const version = (existing?.version ?? 0) + 1;

      const { data, error } = await supabase
        .from("impact_assessments")
        .insert([{
          project_id: input.project_id,
          system_id: input.system_id,
          version,
          dimensions: dimensions as unknown as Json,
          questionnaire_answers: input.questionnaire_answers as unknown as Json,
          overall_score: overallScore,
          quadrant,
          summary,
          created_by: user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Update system's requires_approval flag
      const requiresApproval = overallScore > 60;
      await supabase
        .from("systems")
        .update({ 
          requires_approval: requiresApproval,
          deployment_status: requiresApproval ? "ready_for_review" : "draft"
        })
        .eq("id", input.system_id);

      return {
        ...data,
        dimensions: data.dimensions as unknown as DimensionScores,
        questionnaire_answers: data.questionnaire_answers as unknown as ImpactQuestionnaireAnswers,
      } as ImpactAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["impact-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["impact-assessments", data.system_id] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });
}
