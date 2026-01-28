import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Library, Search, Plus, Zap, Filter } from 'lucide-react';
import { useAttackLibrary } from '@/hooks/useAttackLibrary';
import { AttackCard } from '@/components/security/AttackCard';

const attackCategories = [
  { id: 'all', label: 'All Categories' },
  { id: 'jailbreak', label: 'Jailbreak' },
  { id: 'prompt_injection', label: 'Prompt Injection' },
  { id: 'toxicity', label: 'Toxicity Probes' },
  { id: 'pii_extraction', label: 'PII Extraction' },
  { id: 'harmful_content', label: 'Harmful Content' },
  { id: 'policy_bypass', label: 'Policy Bypass' },
];

const difficultyLevels = [
  { id: 'all', label: 'All Difficulties' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
];

export default function AttackLibrary() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAttack, setNewAttack] = useState({
    name: '',
    description: '',
    category: 'jailbreak',
    owasp_category: null as string | null,
    difficulty: 'medium' as const,
    attack_payload: '',
    tags: [] as string[],
    is_active: true,
  });

  const { attacks, isLoading, createAttack } = useAttackLibrary(
    categoryFilter === 'all' ? undefined : categoryFilter
  );

  const filteredAttacks = attacks.filter(attack => {
    const matchesDifficulty = difficultyFilter === 'all' || attack.difficulty === difficultyFilter;
    const matchesSearch = attack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  const handleAddAttack = async () => {
    if (!newAttack.name || !newAttack.attack_payload) return;
    
    await createAttack.mutateAsync(newAttack);
    setIsAddDialogOpen(false);
      setNewAttack({
        name: '',
        description: '',
        category: 'jailbreak',
        owasp_category: '',
        difficulty: 'medium',
        attack_payload: '',
        tags: [],
        is_active: true,
      });
  };

  // Stats
  const categoryStats = attackCategories.slice(1).map(cat => ({
    ...cat,
    count: attacks.filter(a => a.category === cat.id).length,
  }));

  return (
    <MainLayout title="Attack Library" subtitle="Browse and manage curated attack patterns">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Library className="h-6 w-6 text-primary" />
              Attack Library
            </h1>
            <p className="text-muted-foreground">
              Browse and manage curated attack patterns
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Attack
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Custom Attack Pattern</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newAttack.name}
                    onChange={(e) => setNewAttack({ ...newAttack, name: e.target.value })}
                    placeholder="Attack name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newAttack.description}
                    onChange={(e) => setNewAttack({ ...newAttack, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newAttack.category}
                      onValueChange={(v) => setNewAttack({ ...newAttack, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {attackCategories.slice(1).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={newAttack.difficulty}
                      onValueChange={(v: any) => setNewAttack({ ...newAttack, difficulty: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyLevels.slice(1).map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Attack Payload</Label>
                  <Textarea
                    value={newAttack.attack_payload}
                    onChange={(e) => setNewAttack({ ...newAttack, attack_payload: e.target.value })}
                    placeholder="Enter the attack prompt/payload"
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleAddAttack}
                  disabled={!newAttack.name || !newAttack.attack_payload}
                  className="w-full"
                >
                  Add Attack Pattern
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryStats.map((cat) => (
            <Card
              key={cat.id}
              className={`cursor-pointer transition-colors ${categoryFilter === cat.id ? 'border-primary' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Zap className="h-4 w-4 text-primary" />
                  <Badge variant="secondary">{cat.count}</Badge>
                </div>
                <div className="mt-2 text-sm font-medium">{cat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search attacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {attackCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {difficultyLevels.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Attack Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading attacks...</div>
        ) : filteredAttacks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attacks found</p>
              <p className="text-sm">Try adjusting your filters or add a new attack</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttacks.map((attack) => (
              <AttackCard key={attack.id} attack={attack} showPayload />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
