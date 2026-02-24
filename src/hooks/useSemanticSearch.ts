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
      const { data, error } = await supabase.functions.invoke('semantic-query', {
        body: { action: 'search', query },
      });

      if (error) throw error;
      setResults(data?.results ?? []);
    } catch (err) {
      console.error('Semantic search failed:', err);
      // Fallback: text-based search
      const { data } = await (supabase as any)
        .from('semantic_definitions')
        .select('id, name, display_name, description, sql_logic, grain, synonyms, ai_context, status')
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'active')
        .limit(10);
      
      setResults((data || []).map((d: any) => ({ ...d, similarity: 0.5 })));
    } finally {
      setIsSearching(false);
    }
  };

  return { search, results, isSearching };
}
