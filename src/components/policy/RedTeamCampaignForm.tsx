import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Play, Loader2, AlertTriangle } from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useCreateRedTeamCampaign } from "@/hooks/usePolicies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const attackTypes = [
  { id: 'jailbreak', label: 'Jailbreak Attempts', description: 'Attempts to bypass safety guidelines' },
  { id: 'prompt_injection', label: 'Prompt Injection', description: 'Malicious prompts to manipulate output' },
  { id: 'pii_extraction', label: 'PII Extraction', description: 'Attempts to extract personal information' },
  { id: 'harmful_content', label: 'Harmful Content', description: 'Generation of harmful or violent content' },
  { id: 'bias_probing', label: 'Bias Probing', description: 'Testing for demographic biases' },
  { id: 'hallucination', label: 'Hallucination Probes', description: 'Testing factual accuracy and grounding' },
  { id: 'data_leakage', label: 'Data Leakage', description: 'Attempts to extract training data' },
  { id: 'system_prompt', label: 'System Prompt Extraction', description: 'Attempts to reveal system prompts' },
];

interface RedTeamCampaignFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RedTeamCampaignForm({ open, onOpenChange }: RedTeamCampaignFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedAttacks, setSelectedAttacks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: models } = useModels();
  const createCampaign = useCreateRedTeamCampaign();

  const handleAttackToggle = (attackId: string) => {
    setSelectedAttacks(prev => 
      prev.includes(attackId) 
        ? prev.filter(a => a !== attackId)
        : [...prev, attackId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (!selectedModel) {
      toast.error('Please select a target model');
      return;
    }
    if (selectedAttacks.length === 0) {
      toast.error('Please select at least one attack type');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create campaign
      await createCampaign.mutateAsync({
        name,
        description,
        model_id: selectedModel,
        attack_types: selectedAttacks.map(id => ({ id, enabled: true })),
      });

      // Optionally start immediately
      const { error } = await supabase.functions.invoke('run-red-team', {
        body: { 
          modelId: selectedModel,
          attackTypes: selectedAttacks,
        },
      });

      if (error) {
        console.warn('Campaign created but auto-start failed:', error);
        toast.success('Campaign created. Manual start required.');
      } else {
        toast.success('Campaign created and started');
      }

      setIsOpen(false);
      setName("");
      setDescription("");
      setSelectedModel("");
      setSelectedAttacks([]);
    } catch (error: any) {
      toast.error('Failed to create campaign: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Create Red Team Campaign
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q4 Security Assessment"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive security testing for production deployment..."
                rows={2}
              />
            </div>
          </div>
          
          {/* Model Selection */}
          <div className="grid gap-2">
            <Label>Target Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model to test" />
              </SelectTrigger>
              <SelectContent>
                {models?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} ({model.model_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Attack Types */}
          <div className="grid gap-3">
            <Label>Attack Types</Label>
            <div className="grid grid-cols-2 gap-3">
              {attackTypes.map((attack) => (
                <div
                  key={attack.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAttacks.includes(attack.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleAttackToggle(attack.id)}
                >
                  <Checkbox
                    checked={selectedAttacks.includes(attack.id)}
                    onCheckedChange={() => handleAttackToggle(attack.id)}
                  />
                  <div>
                    <p className="font-medium text-sm">{attack.label}</p>
                    <p className="text-xs text-muted-foreground">{attack.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selectedAttacks.length} attack types selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Create & Run
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
