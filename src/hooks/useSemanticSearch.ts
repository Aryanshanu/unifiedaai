import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SemanticSearchResult {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  sql_logic: string | null;
  grain: string | null;
  synonyms: string[] | null;
  ai_context: string | null;
  status: string;
  similarity: number;
}

export function useSemanticSearch() {
  const [results, setResults] = useState<SemanticSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const search = async (query: string) => {
    setIsSearching(true);
    try {
      // Step 1: Fetch all active semantic definitions for local indexing
      const { data, error } = await supabase
        .from('semantic_definitions')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      if (!data) return;

      // Step 2: Implement local TF-IDF (Term Frequency-Inverse Document Frequency)
      // For the stand-in, we use a robust weighted string matching algorithm
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      
      const scoredResults = data.map((doc) => {
        let score = 0;
        const searchSpace = `${doc.name} ${doc.display_name} ${doc.description} ${doc.ai_context} ${doc.synonyms?.join(' ')}`.toLowerCase();
        
        queryTerms.forEach(term => {
          // Weighted scoring: Exact matches in name/display_name score higher
          if (doc.name?.toLowerCase().includes(term)) score += 0.4;
          if (doc.display_name?.toLowerCase().includes(term)) score += 0.3;
          if (doc.description?.toLowerCase().includes(term)) score += 0.2;
          if (searchSpace.includes(term)) score += 0.1;
        });

        return { ...doc, similarity: Math.min(score, 1) };
      });

      // Step 3: Sort by similarity and filter out non-matches
      const finalResults = scoredResults
        .filter(r => r.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);

      setResults(finalResults as SemanticSearchResult[]);
    } catch (err) {
      console.error('Local semantic search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return { search, results, isSearching };
}
