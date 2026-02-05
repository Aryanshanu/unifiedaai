import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Zap, Shield, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Attack } from '@/hooks/useAttackLibrary';

 interface AttackCardProps {
   attack: Attack;
   onExecute?: (attack: Attack) => void;
   showPayload?: boolean;
   isExecuting?: boolean;
 }

const difficultyConfig = {
  easy: { color: 'bg-green-100 text-green-800', label: 'Easy' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  hard: { color: 'bg-orange-100 text-orange-800', label: 'Hard' },
  expert: { color: 'bg-red-100 text-red-800', label: 'Expert' },
};

const categoryIcons: Record<string, typeof Zap> = {
  jailbreak: Zap,
  prompt_injection: Shield,
  toxicity: Shield,
  pii_extraction: Shield,
  harmful_content: Shield,
  policy_bypass: Shield,
};

 export function AttackCard({ attack, onExecute, showPayload = false, isExecuting = false }: AttackCardProps) {
  const [payloadVisible, setPayloadVisible] = useState(showPayload);
  const difficulty = difficultyConfig[attack.difficulty];
  const CategoryIcon = categoryIcons[attack.category] || Zap;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm leading-tight">{attack.name}</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">
                  {attack.category.replace('_', ' ')}
                </Badge>
                <Badge className={difficulty.color}>{difficulty.label}</Badge>
                {attack.owasp_category && (
                  <Badge variant="secondary" className="text-xs">
                    {attack.owasp_category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Success Rate</div>
            <div className="text-lg font-bold text-primary">
              {(attack.success_rate * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {attack.description && (
          <p className="text-sm text-muted-foreground mb-3">{attack.description}</p>
        )}
        
        {attack.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {attack.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Attack Payload</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPayloadVisible(!payloadVisible)}
            >
              {payloadVisible ? (
                <EyeOff className="h-3 w-3 mr-1" />
              ) : (
                <Eye className="h-3 w-3 mr-1" />
              )}
              {payloadVisible ? 'Hide' : 'Show'}
            </Button>
          </div>
          {payloadVisible && (
            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-32">
              {attack.attack_payload}
            </pre>
          )}
        </div>

         {onExecute && (
           <div className="mt-4 pt-3 border-t">
             <Button
               size="sm"
               className="w-full"
               onClick={() => onExecute(attack)}
               disabled={isExecuting}
             >
               {isExecuting ? (
                 <>
                   <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Executing...
                 </>
               ) : (
                 <>
                   <Play className="h-4 w-4 mr-1" />
                   Execute Attack
                 </>
               )}
             </Button>
           </div>
         )}
      </CardContent>
    </Card>
  );
}
