import { useState } from 'react';
import { useWeightProfiles, WeightProfile } from '@/hooks/useWeightProfiles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, SlidersHorizontal, Save } from 'lucide-react';
import { toast } from 'sonner';

interface WeightProfileManagerProps {
  onProfileSelect?: (profile: WeightProfile) => void;
  selectedProfileId?: string;
}

export function WeightProfileManager({ onProfileSelect, selectedProfileId }: WeightProfileManagerProps) {
  const { profiles, loading, createProfile } = useWeightProfiles();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    completeness: 25,
    validity: 30,
    uniqueness: 20,
    freshness: 25,
  });

  const handleCreate = async () => {
    // Validate that weights sum to exactly 100
    const total = formData.completeness + formData.validity + formData.uniqueness + formData.freshness;
    if (total !== 100) {
      toast.error(`Weights must sum to exactly 100%. Current sum: ${total}%`);
      return;
    }

    if (!formData.name) {
      toast.error('Profile name is required');
      return;
    }

    try {
      const newProfile = await createProfile({
        name: formData.name,
        description: formData.description,
        is_default: false,
        use_case: null,
        column_importance: null,
        weights: {
          completeness: formData.completeness / 100,
          validity: formData.validity / 100,
          uniqueness: formData.uniqueness / 100,
          freshness: formData.freshness / 100,
        }
      });
      toast.success('Custom schema profile created');
      setIsCreating(false);
      setFormData({ name: '', description: '', completeness: 25, validity: 30, uniqueness: 20, freshness: 25 });
      if (onProfileSelect && newProfile) {
        onProfileSelect(newProfile as unknown as WeightProfile);
      }
    } catch (e: any) {
      toast.error('Failed to create profile: ' + e.message);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles.find(p => p.is_default);

  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-900 border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3 border-b border-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Active Schema Weight Profile
              </CardTitle>
              <CardDescription>Select the formula schema used for Data Quality validation.</CardDescription>
            </div>
            {!isCreating && (
              <Button variant="outline" size="sm" onClick={() => setIsCreating(true)} className="h-8 gap-1">
                <Plus className="h-3 w-3" /> New Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isCreating ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Profile Name</Label>
                    <Input 
                      placeholder="e.g. Finance Strict Schema" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="h-8 bg-slate-950/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
                    <Input 
                      placeholder="What is this for?" 
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="h-8 bg-slate-950/50"
                    />
                  </div>
                </div>
                
                <div className="space-y-3 p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                  <Label className="text-sm font-medium">Metric Weights (%)</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Completeness</Label>
                      <Input type="number" min="0" max="100" value={formData.completeness} onChange={e => setFormData({...formData, completeness: parseInt(e.target.value) || 0})} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Validity</Label>
                      <Input type="number" min="0" max="100" value={formData.validity} onChange={e => setFormData({...formData, validity: parseInt(e.target.value) || 0})} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Uniqueness</Label>
                      <Input type="number" min="0" max="100" value={formData.uniqueness} onChange={e => setFormData({...formData, uniqueness: parseInt(e.target.value) || 0})} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Freshness</Label>
                      <Input type="number" min="0" max="100" value={formData.freshness} onChange={e => setFormData({...formData, freshness: parseInt(e.target.value) || 0})} className="h-8" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-muted-foreground">
                      Total: <span className={
                        (formData.completeness + formData.validity + formData.uniqueness + formData.freshness) === 100 
                        ? "text-success font-medium" : "text-destructive font-medium"
                      }>{formData.completeness + formData.validity + formData.uniqueness + formData.freshness}%</span> (Must equal 100%)
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsCreating(false)}>Cancel</Button>
                      <Button variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={handleCreate}>
                        <Save className="h-3 w-3" /> Save Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <Select 
                value={selectedProfile?.id} 
                onValueChange={(val) => {
                  const p = profiles.find(x => x.id === val);
                  if (p && onProfileSelect) onProfileSelect(p);
                }}
              >
                <SelectTrigger className="bg-slate-950/50">
                  <SelectValue placeholder="Select a weight profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.is_default && '(Default)'}
                    </SelectItem>
                  ))}
                  {profiles.length === 0 && (
                    <SelectItem value="none" disabled>No profiles found</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {selectedProfile && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Completeness</span>
                    <span className="text-lg font-bold text-primary">{Math.round((selectedProfile.weights?.completeness || 0) * 100)}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Validity</span>
                    <span className="text-lg font-bold text-success">{Math.round((selectedProfile.weights?.validity || 0) * 100)}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Uniqueness</span>
                    <span className="text-lg font-bold text-warning">{Math.round((selectedProfile.weights?.uniqueness || 0) * 100)}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Freshness</span>
                    <span className="text-lg font-bold text-[#8b5cf6]">{Math.round((selectedProfile.weights?.freshness || 0) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
