import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced PII detection patterns (Presidio-inspired)
const PII_PATTERNS = {
  // Email with high confidence
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    confidence: 0.95,
    category: "contact"
  },
  // Phone numbers (various formats)
  phone: {
    pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.9,
    category: "contact"
  },
  // Social Security Numbers
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.98,
    category: "government_id"
  },
  // Credit card numbers (Luhn check would improve this)
  creditCard: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    confidence: 0.95,
    category: "financial"
  },
  // IP addresses
  ipv4: {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    confidence: 0.85,
    category: "technical"
  },
  // Date of birth patterns
  dob: {
    pattern: /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12][0-9]|3[01])[-\/](?:19|20)\d{2}\b/g,
    confidence: 0.7,
    category: "personal"
  },
  // Names (basic pattern - would use NER in production)
  name: {
    pattern: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
    confidence: 0.6,
    category: "personal"
  },
  // Bank account patterns
  bankAccount: {
    pattern: /\b\d{9,18}\b/g,
    confidence: 0.4,
    category: "financial"
  },
  // Passport numbers (common formats)
  passport: {
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    confidence: 0.5,
    category: "government_id"
  }
};

// Toxicity detection patterns and keywords
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

interface AnalysisResult {
  pii: {
    detected: boolean;
    count: number;
    entities: DetectionResult[];
    overallScore: number;
    categories: Record<string, number>;
  };
  toxicity: {
    detected: boolean;
    score: number;
    categories: { category: string; severity: string; matches: string[] }[];
  };
  security: {
    detected: boolean;
    count: number;
    findings: DetectionResult[];
  };
  overallRisk: "low" | "medium" | "high" | "critical";
  shouldBlock: boolean;
}

function detectPII(text: string): AnalysisResult["pii"] {
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
          value: match[0].substring(0, 4) + "****", // Redact
          position: { start: match.index, end: match.index + match[0].length }
        });
        categoryCount[config.category] = (categoryCount[config.category] || 0) + 1;
      }
    }
  }
  
  // Calculate overall PII score (0-100)
  const weightedScore = entities.reduce((sum, e) => sum + e.confidence * 100, 0);
  const overallScore = Math.min(100, weightedScore / Math.max(1, entities.length) || 0);
  
  return {
    detected: entities.length > 0,
    count: entities.length,
    entities,
    overallScore,
    categories: categoryCount
  };
}

function detectToxicity(text: string): AnalysisResult["toxicity"] {
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
  
  return {
    detected: categories.length > 0,
    score: maxScore,
    categories
  };
}

function detectSecurityIssues(text: string): AnalysisResult["security"] {
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
  
  return {
    detected: findings.length > 0,
    count: findings.length,
    findings
  };
}

function analyzeText(text: string): AnalysisResult {
  const pii = detectPII(text);
  const toxicity = detectToxicity(text);
  const security = detectSecurityIssues(text);
  
  // Determine overall risk and blocking decision
  let overallRisk: "low" | "medium" | "high" | "critical" = "low";
  let shouldBlock = false;
  
  // Critical conditions
  if (
    toxicity.categories.some(c => c.severity === "critical") ||
    pii.entities.some(e => e.category === "government_id" && e.confidence > 0.9) ||
    security.findings.some(f => f.confidence > 0.9)
  ) {
    overallRisk = "critical";
    shouldBlock = true;
  }
  // High risk conditions
  else if (
    toxicity.score > 70 ||
    pii.entities.some(e => e.category === "financial") ||
    security.detected
  ) {
    overallRisk = "high";
    shouldBlock = pii.entities.some(e => e.category === "financial" && e.confidence > 0.8);
  }
  // Medium risk conditions
  else if (
    toxicity.score > 40 ||
    pii.count > 2
  ) {
    overallRisk = "medium";
  }
  
  return {
    pii,
    toxicity,
    security,
    overallRisk,
    shouldBlock
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, mode = "full" } = await req.json();
    
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text field is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    let result: Partial<AnalysisResult>;
    
    switch (mode) {
      case "pii":
        result = { pii: detectPII(text) };
        break;
      case "toxicity":
        result = { toxicity: detectToxicity(text) };
        break;
      case "security":
        result = { security: detectSecurityIssues(text) };
        break;
      default:
        result = analyzeText(text);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: result,
        processing_time_ms: Date.now() - startTime,
        text_length: text.length
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
