import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateSession, requireAuth, corsHeaders } from "../_shared/auth-helper.ts";

// HuggingFace Model IDs for real ML detection
const HF_TOXICITY_MODEL = "ml6team/toxic-comment-classification";
const HF_PII_MODEL = "obi/deid_roberta_i2b2";
const HF_DETOXIFY_MODEL = "unitary/toxic-bert";

// Enhanced PII detection patterns (Presidio-inspired)
const PII_PATTERNS = {
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    confidence: 0.95,
    category: "contact"
  },
  phone: {
    pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.9,
    category: "contact"
  },
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.98,
    category: "government_id"
  },
  creditCard: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    confidence: 0.95,
    category: "financial"
  },
  ipv4: {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    confidence: 0.85,
    category: "technical"
  },
  dob: {
    pattern: /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12][0-9]|3[01])[-\/](?:19|20)\d{2}\b/g,
    confidence: 0.7,
    category: "personal"
  },
  name: {
    pattern: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
    confidence: 0.6,
    category: "personal"
  },
  passport: {
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    confidence: 0.5,
    category: "government_id"
  }
};

// Security patterns
const SECURITY_PATTERNS = {
  apiKeys: {
    pattern: /\b(sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]\s*['"]?[\w-]{20,}['"]?)\b/gi,
    confidence: 0.95
  },
  secrets: {
    pattern: /\b(password|secret|token)\s*[:=]\s*['"]?[\w!@#$%^&*]{8,}['"]?\b/gi,
    confidence: 0.85
  },
  privateKeys: {
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    confidence: 0.99
  },
  jwt: {
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    confidence: 0.9
  },
  awsKeys: {
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    confidence: 0.98
  }
};

interface DetectionResult {
  type: string;
  category: string;
  confidence: number;
  value: string;
  position: { start: number; end: number };
}

interface HFToxicityResult {
  score: number;
  labels: { label: string; score: number }[];
  model: string;
  raw: any;
}

interface HFPIIResult {
  entities: { type: string; text: string; score: number }[];
  model: string;
  raw: any;
}

interface AnalysisResult {
  pii: {
    detected: boolean;
    count: number;
    entities: DetectionResult[];
    overallScore: number;
    categories: Record<string, number>;
    hf_entities?: HFPIIResult;
  };
  toxicity: {
    detected: boolean;
    score: number;
    categories: { category: string; severity: string; matches: string[] }[];
    hf_result?: HFToxicityResult;
  };
  security: {
    detected: boolean;
    count: number;
    findings: DetectionResult[];
  };
  overallRisk: "low" | "medium" | "high" | "critical";
  shouldBlock: boolean;
  modelsUsed: string[];
}

// Call HuggingFace toxicity model (Detoxify/toxic-bert)
async function callHFToxicityModel(text: string, hfToken: string | null): Promise<HFToxicityResult | null> {
  if (!hfToken) {
    console.log("[ml-detection] No HF token, skipping HF toxicity model");
    return null;
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_DETOXIFY_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      console.warn(`[ml-detection] HF Toxicity model returned ${response.status}`);
      return null;
    }

    const output = await response.json();
    console.log("[ml-detection] HF Toxicity raw output:", JSON.stringify(output).substring(0, 200));
    
    // Parse toxic-bert output format
    let maxScore = 0;
    const labels: { label: string; score: number }[] = [];
    
    if (Array.isArray(output)) {
      const labelArray = Array.isArray(output[0]) ? output[0] : output;
      for (const item of labelArray) {
        if (item.label && typeof item.score === 'number') {
          labels.push({ label: item.label, score: item.score });
          if (item.label.toLowerCase().includes("toxic") || item.label === "LABEL_1") {
            maxScore = Math.max(maxScore, item.score);
          }
        }
      }
    }

    return { score: maxScore, labels, model: HF_DETOXIFY_MODEL, raw: output };
  } catch (error) {
    console.error("[ml-detection] HF Toxicity model error:", error);
    return null;
  }
}

// Call HuggingFace PII/NER model
async function callHFPIIModel(text: string, hfToken: string | null): Promise<HFPIIResult | null> {
  if (!hfToken) {
    console.log("[ml-detection] No HF token, skipping HF PII model");
    return null;
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_PII_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      console.warn(`[ml-detection] HF PII model returned ${response.status}`);
      return null;
    }

    const output = await response.json();
    console.log("[ml-detection] HF PII raw output:", JSON.stringify(output).substring(0, 200));
    
    const entities: { type: string; text: string; score: number }[] = [];
    if (Array.isArray(output)) {
      for (const entity of output) {
        if (entity.score >= 0.5) {
          entities.push({
            type: entity.entity_group || entity.entity || "UNKNOWN",
            text: entity.word || "",
            score: entity.score,
          });
        }
      }
    }

    return { entities, model: HF_PII_MODEL, raw: output };
  } catch (error) {
    console.error("[ml-detection] HF PII model error:", error);
    return null;
  }
}

function detectPIIWithRegex(text: string): { entities: DetectionResult[]; categories: Record<string, number> } {
  const entities: DetectionResult[] = [];
  const categoryCount: Record<string, number> = {};
  
  for (const [type, config] of Object.entries(PII_PATTERNS)) {
    const matches = text.matchAll(config.pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        entities.push({
          type,
          category: config.category,
          confidence: config.confidence,
          value: match[0].substring(0, 4) + "****",
          position: { start: match.index, end: match.index + match[0].length }
        });
        categoryCount[config.category] = (categoryCount[config.category] || 0) + 1;
      }
    }
  }
  
  return { entities, categories: categoryCount };
}

function detectToxicityWithKeywords(text: string): { score: number; categories: { category: string; severity: string; matches: string[] }[] } {
  const TOXICITY_PATTERNS = {
    selfHarm: {
      keywords: ["kill myself", "harm myself", "end my life", "suicide", "self-harm", "hurt myself"],
      severity: "critical",
      confidence: 0.95
    },
    violence: {
      keywords: ["kill you", "murder", "attack", "hurt someone", "how to make a bomb", "weapon"],
      severity: "critical",
      confidence: 0.9
    },
    hateSpeech: {
      keywords: ["racial slur", "hate speech", "discriminate", "inferior race"],
      severity: "high",
      confidence: 0.85
    },
    harassment: {
      keywords: ["threaten", "stalk", "bully", "harass"],
      severity: "medium",
      confidence: 0.75
    },
    illegal: {
      keywords: ["child exploitation", "synthesize drugs", "illegal weapons", "human trafficking"],
      severity: "critical",
      confidence: 0.98
    }
  };

  const lowerText = text.toLowerCase();
  const categories: { category: string; severity: string; matches: string[] }[] = [];
  let maxScore = 0;
  
  for (const [category, config] of Object.entries(TOXICITY_PATTERNS)) {
    const matches = config.keywords.filter(kw => lowerText.includes(kw));
    if (matches.length > 0) {
      categories.push({
        category,
        severity: config.severity,
        matches
      });
      maxScore = Math.max(maxScore, config.confidence * 100);
    }
  }
  
  return { score: maxScore, categories };
}

function detectSecurityIssues(text: string): { findings: DetectionResult[]; count: number } {
  const findings: DetectionResult[] = [];
  
  for (const [type, config] of Object.entries(SECURITY_PATTERNS)) {
    const matches = text.matchAll(config.pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        findings.push({
          type,
          category: "security",
          confidence: config.confidence,
          value: match[0].substring(0, 8) + "********",
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }
  }
  
  return { findings, count: findings.length };
}

async function analyzeText(text: string, hfToken: string | null): Promise<AnalysisResult> {
  const modelsUsed: string[] = ["regex-patterns"];
  
  // Parallel execution: regex + HuggingFace models
  const [regexPII, regexToxicity, security, hfToxicity, hfPII] = await Promise.all([
    Promise.resolve(detectPIIWithRegex(text)),
    Promise.resolve(detectToxicityWithKeywords(text)),
    Promise.resolve(detectSecurityIssues(text)),
    callHFToxicityModel(text, hfToken),
    callHFPIIModel(text, hfToken),
  ]);

  if (hfToxicity) modelsUsed.push(HF_DETOXIFY_MODEL);
  if (hfPII) modelsUsed.push(HF_PII_MODEL);

  // Combine PII results (regex + HF)
  const piiEntities = [...regexPII.entities];
  if (hfPII && hfPII.entities.length > 0) {
    for (const entity of hfPII.entities) {
      piiEntities.push({
        type: entity.type,
        category: "hf_detected",
        confidence: entity.score,
        value: entity.text.substring(0, 4) + "****",
        position: { start: 0, end: 0 },
      });
    }
  }

  const piiOverallScore = Math.min(100, piiEntities.reduce((sum, e) => sum + e.confidence * 100, 0) / Math.max(1, piiEntities.length) || 0);

  // Combine toxicity results (regex + HF)
  const hfToxicityScore = hfToxicity ? hfToxicity.score * 100 : 0;
  const combinedToxicityScore = Math.max(regexToxicity.score, hfToxicityScore);

  // Determine overall risk and blocking decision
  let overallRisk: "low" | "medium" | "high" | "critical" = "low";
  let shouldBlock = false;
  
  // Critical conditions
  if (
    regexToxicity.categories.some(c => c.severity === "critical") ||
    combinedToxicityScore > 80 ||
    piiEntities.some(e => e.category === "government_id" && e.confidence > 0.9) ||
    security.findings.some(f => f.confidence > 0.9)
  ) {
    overallRisk = "critical";
    shouldBlock = true;
  }
  // High risk conditions
  else if (
    combinedToxicityScore > 60 ||
    piiEntities.some(e => e.category === "financial") ||
    security.count > 0
  ) {
    overallRisk = "high";
    shouldBlock = piiEntities.some(e => e.category === "financial" && e.confidence > 0.8);
  }
  // Medium risk conditions
  else if (
    combinedToxicityScore > 40 ||
    piiEntities.length > 2
  ) {
    overallRisk = "medium";
  }
  
  return {
    pii: {
      detected: piiEntities.length > 0,
      count: piiEntities.length,
      entities: piiEntities,
      overallScore: piiOverallScore,
      categories: regexPII.categories,
      hf_entities: hfPII || undefined,
    },
    toxicity: {
      detected: combinedToxicityScore > 50,
      score: combinedToxicityScore,
      categories: regexToxicity.categories,
      hf_result: hfToxicity || undefined,
    },
    security: {
      detected: security.count > 0,
      count: security.count,
      findings: security.findings,
    },
    overallRisk,
    shouldBlock,
    modelsUsed,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication required for ML detection
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    console.log(`[ml-detection] User ${authResult.user?.id} running ML detection...`);

    const { text, mode = "full" } = await req.json();
    
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text field is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN") || null;
    const startTime = Date.now();
    
    let result: AnalysisResult;
    
    if (mode === "pii") {
      const pii = detectPIIWithRegex(text);
      const hfPII = await callHFPIIModel(text, hfToken);
      result = {
        pii: {
          detected: pii.entities.length > 0,
          count: pii.entities.length,
          entities: pii.entities,
          overallScore: 0,
          categories: pii.categories,
          hf_entities: hfPII || undefined,
        },
        toxicity: { detected: false, score: 0, categories: [] },
        security: { detected: false, count: 0, findings: [] },
        overallRisk: "low",
        shouldBlock: false,
        modelsUsed: hfPII ? ["regex-patterns", HF_PII_MODEL] : ["regex-patterns"],
      };
    } else if (mode === "toxicity") {
      const toxicity = detectToxicityWithKeywords(text);
      const hfToxicity = await callHFToxicityModel(text, hfToken);
      result = {
        pii: { detected: false, count: 0, entities: [], overallScore: 0, categories: {} },
        toxicity: {
          detected: toxicity.score > 50 || (hfToxicity?.score || 0) > 0.5,
          score: Math.max(toxicity.score, (hfToxicity?.score || 0) * 100),
          categories: toxicity.categories,
          hf_result: hfToxicity || undefined,
        },
        security: { detected: false, count: 0, findings: [] },
        overallRisk: "low",
        shouldBlock: false,
        modelsUsed: hfToxicity ? ["regex-patterns", HF_DETOXIFY_MODEL] : ["regex-patterns"],
      };
    } else if (mode === "security") {
      const security = detectSecurityIssues(text);
      result = {
        pii: { detected: false, count: 0, entities: [], overallScore: 0, categories: {} },
        toxicity: { detected: false, score: 0, categories: [] },
        security: {
          detected: security.count > 0,
          count: security.count,
          findings: security.findings,
        },
        overallRisk: security.count > 0 ? "high" : "low",
        shouldBlock: security.count > 0,
        modelsUsed: ["regex-patterns"],
      };
    } else {
      result = await analyzeText(text, hfToken);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: result,
        processing_time_ms: Date.now() - startTime,
        text_length: text.length,
        hf_token_available: !!hfToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("ML Detection error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
