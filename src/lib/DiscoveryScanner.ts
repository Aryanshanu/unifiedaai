/**
 * DiscoveryScanner Logic
 * This module handles the interpretation of real-time codebase scans.
 * It identifies AI library usage and cross-references it with registered systems.
 */

export interface ScanResult {
  Path: string;
  LineNumber: number;
  Line: string;
}

export interface AIDiscovery {
  name: string;
  type: string;
  location: string;
  evidence: string;
  status: 'discovered' | 'under_review' | 'registered';
  risk_assessment: 'low' | 'medium' | 'high' | 'critical';
}

export function processScanResults(results: ScanResult[]): AIDiscovery[] {
  const discoveries: AIDiscovery[] = [];
  const seenPaths = new Set<string>();

  results.forEach(res => {
    // Determine the AI provider/type based on the line content
    let name = 'Unknown AI';
    let type = 'api';

    if (res.Line.toLowerCase().includes('openai')) name = 'OpenAI';
    else if (res.Line.toLowerCase().includes('anthropic')) name = 'Anthropic';
    else if (res.Line.toLowerCase().includes('langchain')) { name = 'LangChain'; type = 'framework'; }
    else if (res.Line.toLowerCase().includes('llamaindex')) { name = 'LlamaIndex'; type = 'framework'; }
    else if (res.Line.toLowerCase().includes('transformers')) { name = 'HuggingFace'; type = 'model'; }

    // Deduplicate by path and name for the discovery list
    const key = `${res.Path}-${name}`;
    if (!seenPaths.has(key)) {
      discoveries.push({
        name,
        type,
        location: res.Path.split('\\').pop() || res.Path,
        evidence: `Line ${res.LineNumber}: ${res.Line.trim()}`,
        status: 'discovered',
        risk_assessment: 'medium'
      });
      seenPaths.add(key);
    }
  });

  return discoveries;
}
