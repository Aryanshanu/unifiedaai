import { Badge } from '@/components/ui/badge';
import { Shield, Target, Layers, AlertTriangle } from 'lucide-react';

interface FrameworkBadgeProps {
  framework: 'STRIDE' | 'MAESTRO' | 'ATLAS' | 'OWASP' | null;
  size?: 'sm' | 'md' | 'lg';
}

const frameworkConfig = {
  STRIDE: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Shield,
    description: 'Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation',
  },
  MAESTRO: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Layers,
    description: 'Multi-layer AI Security Framework',
  },
  ATLAS: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Target,
    description: 'Adversarial Threat Landscape for AI Systems',
  },
  OWASP: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
    description: 'LLM Top 10 Vulnerabilities',
  },
};

export function FrameworkBadge({ framework, size = 'md' }: FrameworkBadgeProps) {
  if (!framework) return null;

  const config = frameworkConfig[framework];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${sizeClasses[size]} font-medium inline-flex items-center gap-1`}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      {framework}
    </Badge>
  );
}
