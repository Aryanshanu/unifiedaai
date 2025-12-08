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
  euAiActArticle?: string;
  nistMapping?: string;
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
  euAiActMapping: { article: string; title: string; status: string; details: string }[];
}

// EU AI Act High-Risk articles mapping
const EU_AI_ACT_ARTICLES = [
  { article: "Article 9", title: "Risk Management System", requirement: "Establish and maintain risk management system" },
  { article: "Article 10", title: "Data Governance", requirement: "Training data quality and governance requirements" },
  { article: "Article 11", title: "Technical Documentation", requirement: "Comprehensive technical documentation" },
  { article: "Article 12", title: "Record-Keeping", requirement: "Automatic logging capabilities" },
  { article: "Article 13", title: "Transparency", requirement: "Transparency and provision of information" },
  { article: "Article 14", title: "Human Oversight", requirement: "Appropriate human oversight measures" },
  { article: "Article 15", title: "Accuracy & Robustness", requirement: "Accuracy, robustness, and cybersecurity" },
];

// Compute SHA-256 hash
async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    console.log(`Generating enhanced scorecard for model ${modelId}`);

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

    // Build scorecard sections with EU AI Act mapping
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
      euAiActArticle: 'Article 10 - Data Governance',
      nistMapping: 'MAP 1.1, MAP 1.5',
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
      euAiActArticle: 'Article 15 - Accuracy & Robustness',
      nistMapping: 'MANAGE 2.2, MANAGE 2.3',
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
      euAiActArticle: 'Article 10 - Data Governance',
      nistMapping: 'GOVERN 1.3, MAP 3.4',
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
      euAiActArticle: 'Article 15 - Accuracy & Robustness',
      nistMapping: 'MEASURE 2.5, MEASURE 2.6',
    });

    // Transparency/Explainability Section
    const latestExplainability = evaluations?.find(e => e.engine_type === 'explainability');
    sections.push({
      title: 'Transparency & Explainability',
      score: latestExplainability?.overall_score ?? 75,
      status: (latestExplainability?.overall_score ?? 75) >= 80 ? 'compliant' : 
              (latestExplainability?.overall_score ?? 75) >= 60 ? 'warning' : 'non-compliant',
      details: latestExplainability?.explanations?.transparency_summary || 
               'Explainability assessment covers reasoning transparency, decision traceability, and documentation completeness.',
      evidence: latestExplainability?.metric_details ? [latestExplainability.metric_details] : [],
      recommendations: latestExplainability?.explanations?.recommendations || [],
      euAiActArticle: 'Article 13 - Transparency',
      nistMapping: 'MAP 1.6, GOVERN 1.1',
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
      details: `${compliantControls} of ${totalControls} controls satisfied. Assessment covers EU AI Act and NIST AI RMF requirements.`,
      evidence: controlAssessments?.map(c => ({
        control: c.controls?.code,
        status: c.status,
        notes: c.notes,
      })) || [],
      recommendations: controlAssessments
        ?.filter(c => c.status !== 'compliant')
        .map(c => `Address ${c.controls?.code}: ${c.controls?.title}`) || [],
      euAiActArticle: 'Articles 9-15',
      nistMapping: 'All Functions',
    });

    // Calculate overall score and status
    const overallScore = Math.round(
      sections.reduce((sum, s) => sum + s.score, 0) / sections.length
    );
    const overallStatus = overallScore >= 80 ? 'compliant' : 
                          overallScore >= 60 ? 'warning' : 'non-compliant';

    // Build EU AI Act mapping table
    const euAiActMapping = EU_AI_ACT_ARTICLES.map(article => {
      const relevantSection = sections.find(s => s.euAiActArticle?.includes(article.article));
      return {
        article: article.article,
        title: article.title,
        status: relevantSection?.status || 'not-assessed',
        details: relevantSection?.details?.substring(0, 100) || article.requirement,
      };
    });

    // Build limitations and mitigations
    const limitations = [
      'Evaluation based on available test data and may not cover all edge cases.',
      'Scores reflect point-in-time assessment and should be periodically re-evaluated.',
      'Model behavior may vary with different input distributions.',
      'Compliance assessment is advisory and does not constitute legal advice.',
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
      version: '2.0',
      overall_score: overallScore,
      overall_status: overallStatus,
      sections,
      limitations,
      mitigations,
      signatures: [{
        type: 'minisign',
        placeholder: 'RWSFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==',
        signedBy: 'Fractal RAI-OS Automated Attestation',
        timestamp: new Date().toISOString(),
      }],
      hash: '', // Computed below
      euAiActMapping,
    };

    // Compute SHA-256 hash for integrity
    const contentString = JSON.stringify({
      model_id: scorecard.model_id,
      model_name: scorecard.model_name,
      sections: scorecard.sections,
      generated_at: scorecard.generated_at,
      overall_score: scorecard.overall_score,
    });
    scorecard.hash = await computeSHA256(contentString);

    console.log(`Generated enhanced scorecard: ${scorecard.id}, score: ${overallScore}, hash: ${scorecard.hash.substring(0, 16)}...`);

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
    'not-assessed': '#6b7280',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RAI Scorecard - ${scorecard.model_name}</title>
  <style>
    @page { margin: 40px; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
    .letterhead { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
    .letterhead h1 { margin: 0 0 5px 0; color: #6366f1; font-size: 28px; }
    .letterhead .subtitle { color: #666; font-size: 14px; margin: 0; }
    .letterhead .logo { font-size: 12px; color: #999; margin-top: 10px; }
    .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header h2 { margin: 0 0 10px 0; font-size: 22px; }
    .header .meta { color: #666; font-size: 13px; }
    .overall { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f5f5f5 0%, #e5e7eb 100%); border-radius: 12px; }
    .overall .score { font-size: 56px; font-weight: bold; }
    .section { margin-bottom: 25px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fafafa; }
    .section h3 { margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center; font-size: 16px; }
    .section .score-badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
    .section .details { color: #444; margin: 12px 0; font-size: 14px; }
    .section .mapping { font-size: 12px; color: #666; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd; }
    .recommendations { background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 3px solid #eab308; }
    .recommendations h4 { margin: 0 0 10px 0; color: #92400e; font-size: 14px; }
    .recommendations ul { margin: 0; padding-left: 20px; font-size: 13px; }
    .eu-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .eu-table th, .eu-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    .eu-table th { background: #f3f4f6; font-weight: 600; }
    .eu-table .status { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .signature-block { margin-top: 40px; padding: 20px; border: 2px solid #e5e7eb; border-radius: 12px; background: #f9fafb; }
    .signature-block h4 { margin: 0 0 15px 0; color: #374151; }
    .signature-block .sig-line { border-bottom: 1px solid #000; width: 250px; margin: 30px 0 5px 0; }
    .signature-block .sig-label { font-size: 12px; color: #666; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 11px; color: #666; }
    .hash { font-family: monospace; background: #f3f4f6; padding: 6px 10px; border-radius: 6px; font-size: 11px; word-break: break-all; }
    .issued { text-align: right; font-size: 12px; color: #666; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="letterhead">
    <h1>Fractal RAI-OS</h1>
    <p class="subtitle">Responsible AI Operating System — Compliance Scorecard</p>
    <p class="logo">The World's First Responsible AI Operating System</p>
  </div>

  <div class="header">
    <h2>RAI Compliance Scorecard</h2>
    <div class="meta">
      <strong>Model:</strong> ${scorecard.model_name}<br>
      <strong>Generated:</strong> ${new Date(scorecard.generated_at).toLocaleString()}<br>
      <strong>Scorecard Version:</strong> ${scorecard.version}<br>
      <strong>Scorecard ID:</strong> ${scorecard.id}
    </div>
  </div>

  <div class="overall">
    <div class="score" style="color: ${statusColors[scorecard.overall_status]}">${scorecard.overall_score}%</div>
    <div>
      <div style="font-size: 24px; font-weight: bold; text-transform: uppercase; color: ${statusColors[scorecard.overall_status]}">
        ${scorecard.overall_status.replace('-', ' ')}
      </div>
      <div style="color: #666">Overall RAI Compliance Assessment</div>
    </div>
  </div>

  <h3 style="margin: 30px 0 15px 0;">EU AI Act High-Risk Compliance Mapping</h3>
  <table class="eu-table">
    <thead>
      <tr>
        <th>Article</th>
        <th>Requirement</th>
        <th>Status</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      ${scorecard.euAiActMapping.map(m => `
        <tr>
          <td><strong>${m.article}</strong></td>
          <td>${m.title}</td>
          <td>
            <span class="status" style="background: ${statusColors[m.status as keyof typeof statusColors]}20; color: ${statusColors[m.status as keyof typeof statusColors]}">
              ${m.status}
            </span>
          </td>
          <td style="font-size: 12px;">${m.details.substring(0, 80)}...</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3 style="margin: 30px 0 15px 0;">Detailed Assessment</h3>
  ${scorecard.sections.map(section => `
    <div class="section">
      <h3>
        ${section.title}
        <span class="score-badge" style="background: ${statusColors[section.status]}20; color: ${statusColors[section.status]}">
          ${section.score}%
        </span>
      </h3>
      <div class="details">${section.details}</div>
      <div class="mapping">
        <strong>EU AI Act:</strong> ${section.euAiActArticle || 'N/A'} | 
        <strong>NIST AI RMF:</strong> ${section.nistMapping || 'N/A'}
      </div>
      ${section.recommendations && section.recommendations.length > 0 ? `
        <div class="recommendations">
          <h4>Recommendations</h4>
          <ul>
            ${section.recommendations.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="section">
    <h3>Limitations & Caveats</h3>
    <ul style="font-size: 13px; color: #666;">
      ${scorecard.limitations.map(l => `<li>${l}</li>`).join('')}
    </ul>
  </div>

  <div class="signature-block">
    <h4>Attestation</h4>
    <p style="font-size: 13px; color: #666;">
      This scorecard has been automatically generated by Fractal RAI-OS and represents a point-in-time assessment 
      of the model's compliance with responsible AI principles and regulatory requirements.
    </p>
    <div class="sig-line"></div>
    <p class="sig-label">Authorized Signatory</p>
    <p style="font-size: 12px; color: #666; margin-top: 15px;">
      <strong>Signature Type:</strong> minisign<br>
      <strong>Signature:</strong> ${scorecard.signatures[0]?.placeholder || 'Pending'}<br>
      <strong>Signed By:</strong> ${scorecard.signatures[0]?.signedBy || 'Fractal RAI-OS'}
    </p>
  </div>

  <div class="footer">
    <p><strong>Integrity Hash (SHA-256):</strong></p>
    <p class="hash">${scorecard.hash}</p>
    <p class="issued"><strong>Issued:</strong> December 2025 | Fractal RAI-OS v${scorecard.version}</p>
  </div>
</body>
</html>
  `;
}