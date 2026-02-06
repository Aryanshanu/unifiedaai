import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Plus, Loader2, Check } from 'lucide-react';
import { useCreateSystem, useSystems } from '@/hooks/useSystems';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';

interface BuiltInTargetButtonProps {
  onCreated?: (systemId: string) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function BuiltInTargetButton({ 
  onCreated, 
  variant = 'outline',
  size = 'default',
  className 
}: BuiltInTargetButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: systems } = useSystems();
  const { data: projects } = useProjects();
  const createSystem = useCreateSystem();

  // Check if built-in target already exists
  const existingBuiltIn = systems?.find(s => s.provider === 'lovable');

  const handleCreate = async () => {
    if (existingBuiltIn) {
      toast.info('Built-in target already exists');
      onCreated?.(existingBuiltIn.id);
      return;
    }

    // Get first project or create a system without project
    const projectId = projects?.[0]?.id;
    if (!projectId) {
      toast.error('Please create a project first');
      return;
    }

    setIsCreating(true);
    try {
      const system = await createSystem.mutateAsync({
        project_id: projectId,
        name: 'Built-in Target (Lovable AI)',
        provider: 'lovable',
        model_name: 'google/gemini-2.5-flash',
        use_case: 'Security testing with built-in fallback - no external API keys required',
      });

      toast.success('Built-in target created successfully');
      onCreated?.(system.id);
    } catch (error) {
      toast.error('Failed to create built-in target');
      console.error('Create built-in target error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (existingBuiltIn) {
    return (
      <Button 
        variant="ghost" 
        size={size}
        className={className}
        onClick={() => onCreated?.(existingBuiltIn.id)}
      >
        <Check className="h-4 w-4 mr-2 text-green-600" />
        Built-in Target Ready
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCreate}
      disabled={isCreating}
      className={className}
    >
      {isCreating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Plus className="h-4 w-4 mr-2" />
      )}
      Create Built-in Target
    </Button>
  );
}

/**
 * Inline banner suggesting built-in target when no systems or failures detected
 */
interface BuiltInTargetBannerProps {
  showWhen: 'no-systems' | 'failure' | 'always';
  onCreated?: (systemId: string) => void;
}

export function BuiltInTargetBanner({ showWhen, onCreated }: BuiltInTargetBannerProps) {
  const { data: systems } = useSystems();
  const hasBuiltIn = systems?.some(s => s.provider === 'lovable');
  
  // Don't show if already has built-in
  if (hasBuiltIn) return null;

  const messages = {
    'no-systems': 'No target systems configured. Create a Built-in Target to start testing.',
    'failure': 'External target failed. Try using the Built-in Target for reliable testing.',
    'always': 'Use Built-in Target for quick testing without external API dependencies.',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
      <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
      <span className="text-sm text-blue-800 dark:text-blue-200 flex-1">
        {messages[showWhen]}
      </span>
      <BuiltInTargetButton 
        variant="default" 
        size="sm" 
        onCreated={onCreated}
      />
    </div>
  );
}
