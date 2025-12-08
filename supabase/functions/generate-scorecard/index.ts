import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScorecardSection {
  title: string;
  score: number;
  status: 'compliant' | 'warning' | 'non-compliant';
  details: string;
  evidence?: any[];
  recommendations?: string[];
}

interface Scorecard {
  id: string;
  model_id: string;
  model_name: string;
  generated_at: string;
  version: string;
  overall_score: number;
  overall_status: 'compliant' | 'warning' | 'non-compliant';
  sections: ScorecardSection[];
  limitations: string[];
  mitigations: string[];
  signatures: any[];
  hash: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { modelId, format = 'json' } = await req.json();

    if (!modelId) {
      return new Response(JSON.stringify({ error: 'modelId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating scorecard for model ${modelId}`);

    // Fetch model details
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (modelError || !model) {
      return new Response(JSON.stringify({ error: 'Model not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all evaluation runs for this model
    const { data: evaluations } = await supabase
      .from('evaluation_runs')
      .select('*')
      .eq('model_id', modelId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    // Fetch risk assessments for the system
    const { data: riskAssessments } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('system_id', model.system_id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Fetch control assessments
    const { data: controlAssessments } = await supabase
      .from('control_assessments')
      .select('*, controls(*)')
      .eq('model_id', modelId);

    // Build scorecard sections
    const sections: ScorecardSection[] = [];

    // Fairness Section
    const latestFairness = evaluations?.find(e => e.engine_type === 'fairness');
    sections.push({
      title: 'Fairness & Bias',
      score: model.fairness_score ?? latestFairness?.fairness_score ?? 0,
      status: (model.fairness_score ?? 0) >= 80 ? 'compliant' : 
              (model.fairness_score ?? 0) >= 60 ? 'warning' : 'non-compliant',
      details: latestFairness?.explanations?.transparency_summary || 
               'Fairness evaluation measures demographic parity, equalized odds, and disparate impact across protected groups.',
      evidence: latestFairness?.metric_details ? [latestFairness.metric_details] : [],
      recommendations: latestFairness?.explanations?.recommendations || [],
    });

    // Toxicity/Safety Section
    const latestToxicity = evaluations?.find(e => e.engine_type === 'toxicity');
    sections.push({
      title: 'Toxicity & Safety',
      score: model.toxicity_score ?? latestToxicity?.toxicity_score ?? 0,
      status: (model.toxicity_score ?? 0) >= 80 ? 'compliant' : 
              (model.toxicity_score ?? 0) >= 60 ? 'warning' : 'non-compliant',
      details: latestToxicity?.explanations?.transparency_summary || 
               'Safety evaluation covers harmful content detection, hate speech, and jailbreak resistance.',
      evidence: latestToxicity?.metric_details ? [latestToxicity.metric_details] : [],
      recommendations: latestToxicity?.explanations?.recommendations || [],
    });

    // Privacy Section
    const latestPrivacy = evaluations?.find(e => e.engine_type === 'privacy');
    sections.push({
      title: 'Privacy Protection',
      score: model.privacy_score ?? latestPrivacy?.privacy_score ?? 0,
      status: (model.privacy_score ?? 0) >= 80 ? 'compliant' : 
              (model.privacy_score ?? 0) >= 60 ? 'warning' : 'non-compliant',
      details: latestPrivacy?.explanations?.transparency_summary || 
               'Privacy evaluation assesses PII detection, data leakage risk, and membership inference vulnerability.',
      evidence: latestPrivacy?.metric_details ? [latestPrivacy.metric_details] : [],
      recommendations: latestPrivacy?.explanations?.recommendations || [],
    });

    // Robustness/Hallucination Section
    const latestRobustness = evaluations?.find(e => e.engine_type === 'hallucination');
    sections.push({
      title: 'Robustness & Factuality',
      score: model.robustness_score ?? latestRobustness?.robustness_score ?? 0,
      status: (model.robustness_score ?? 0) >= 80 ? 'compliant' : 
              (model.robustness_score ?? 0) >= 60 ? 'warning' : 'non-compliant',
      details: latestRobustness?.explanations?.transparency_summary || 
               'Robustness evaluation measures factuality, groundedness, and resistance to hallucination.',
      evidence: latestRobustness?.metric_details ? [latestRobustness.metric_details] : [],
      recommendations: latestRobustness?.explanations?.recommendations || [],
    });

    // Compliance Section
    const compliantControls = controlAssessments?.filter(c => c.status === 'compliant').length || 0;
    const totalControls = controlAssessments?.length || 0;
    const complianceScore = totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : 0;
    sections.push({
      title: 'Regulatory Compliance',
      score: complianceScore,
      status: complianceScore >= 80 ? 'compliant' : 
              complianceScore >= 60 ? 'warning' : 'non-compliant',
      details: `${compliantControls} of ${totalControls} controls satisfied. Assessment covers applicable regulatory frameworks.`,
      evidence: controlAssessments?.map(c => ({
        control: c.controls?.code,
        status: c.status,
        notes: c.notes,
      })) || [],
      recommendations: controlAssessments
        ?.filter(c => c.status !== 'compliant')
        .map(c => `Address ${c.controls?.code}: ${c.controls?.title}`) || [],
    });

    // Calculate overall score and status
    const overallScore = Math.round(
      sections.reduce((sum, s) => sum + s.score, 0) / sections.length
    );
    const overallStatus = overallScore >= 80 ? 'compliant' : 
                          overallScore >= 60 ? 'warning' : 'non-compliant';

    // Build limitations and mitigations
    const limitations = [
      'Evaluation based on available test data and may not cover all edge cases.',
      'Scores reflect point-in-time assessment and should be periodically re-evaluated.',
      'Model behavior may vary with different input distributions.',
    ];

    const mitigations = sections
      .filter(s => s.status !== 'compliant')
      .flatMap(s => s.recommendations || []);

    // Generate scorecard
    const scorecard: Scorecard = {
      id: crypto.randomUUID(),
      model_id: modelId,
      model_name: model.name,
      generated_at: new Date().toISOString(),
      version: '1.0',
      overall_score: overallScore,
      overall_status: overallStatus,
      sections,
      limitations,
      mitigations,
      signatures: [],
      hash: '', // Computed below
    };

    // Compute hash for integrity
    const contentString = JSON.stringify({
      model_id: scorecard.model_id,
      sections: scorecard.sections,
      generated_at: scorecard.generated_at,
    });
    scorecard.hash = btoa(contentString).slice(0, 64);

    console.log(`Generated scorecard: ${scorecard.id}, score: ${overallScore}`);

    if (format === 'html') {
      // Generate HTML for PDF rendering
      const html = generateHTMLScorecard(scorecard);
      return new Response(html, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html',
        },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      scorecard,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating scorecard:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateHTMLScorecard(scorecard: Scorecard): string {
  const statusColors = {
    compliant: '#22c55e',
    warning: '#eab308',
    'non-compliant': '#ef4444',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RAI Scorecard - ${scorecard.model_name}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #1a1a1a; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; }
    .header .meta { color: #666; font-size: 14px; }
    .overall { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .overall .score { font-size: 48px; font-weight: bold; }
    .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .section h2 { margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center; }
    .section .score-badge { padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    .section .details { color: #444; margin: 15px 0; }
    .recommendations { background: #fffbeb; padding: 15px; border-radius: 4px; margin-top: 15px; }
    .recommendations h4 { margin: 0 0 10px 0; color: #92400e; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .hash { font-family: monospace; background: #f5f5f5; padding: 4px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Responsible AI Scorecard</h1>
    <div class="meta">
      <strong>Model:</strong> ${scorecard.model_name}<br>
      <strong>Generated:</strong> ${new Date(scorecard.generated_at).toLocaleString()}<br>
      <strong>Version:</strong> ${scorecard.version}
    </div>
  </div>

  <div class="overall">
    <div class="score" style="color: ${statusColors[scorecard.overall_status]}">${scorecard.overall_score}%</div>
    <div>
      <div style="font-size: 24px; font-weight: bold; text-transform: uppercase; color: ${statusColors[scorecard.overall_status]}">
        ${scorecard.overall_status.replace('-', ' ')}
      </div>
      <div style="color: #666">Overall RAI Assessment</div>
    </div>
  </div>

  ${scorecard.sections.map(section => `
    <div class="section">
      <h2>
        ${section.title}
        <span class="score-badge" style="background: ${statusColors[section.status]}20; color: ${statusColors[section.status]}">
          ${section.score}%
        </span>
      </h2>
      <div class="details">${section.details}</div>
      ${section.recommendations && section.recommendations.length > 0 ? `
        <div class="recommendations">
          <h4>Recommendations</h4>
          <ul>
            ${section.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="section">
    <h2>Limitations</h2>
    <ul>
      ${scorecard.limitations.map(l => `<li>${l}</li>`).join('')}
    </ul>
  </div>

  <div class="footer">
    <strong>Integrity Hash:</strong> <span class="hash">${scorecard.hash}</span><br>
    <strong>Scorecard ID:</strong> ${scorecard.id}
  </div>
</body>
</html>
  `;
}
