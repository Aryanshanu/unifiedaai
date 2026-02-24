import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';

interface SemanticSearchBarProps {
  onSelect?: (definitionId: string) => void;
}

export function SemanticSearchBar({ onSelect }: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const { search, results, isSearching } = useSemanticSearch();

  const handleSearch = () => {
    if (query.trim().length < 3) return;
    search(query);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            placeholder="Natural language search — e.g. 'What was the revenue last month?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-10 bg-card border-border"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || query.trim().length < 3} className="h-10">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {results && results.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">{results.length} semantic matches</p>
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded border border-border hover:border-primary/30 cursor-pointer transition-colors"
                onClick={() => onSelect?.(r.id)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{r.display_name || r.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[400px]">{r.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{r.grain}</Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {(r.similarity * 100).toFixed(0)}% match
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No matching definitions found.</p>
      )}
    </div>
  );
}
