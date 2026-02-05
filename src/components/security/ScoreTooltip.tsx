 import { ReactNode } from 'react';
 import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 import { Badge } from '@/components/ui/badge';
 import { AlertCircle, AlertTriangle, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 // ============================================================================
 // TYPES
 // ============================================================================
 
 export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
 export type ConfidenceLevel = 'high' | 'medium' | 'low';
 export type VerdictState = 'blocked' | 'succeeded' | 'indeterminate';
 
 export interface DecisionTrace {
   parseSuccess: boolean;
   parseError?: string;
   signalsTriggered: number;
   hasContradiction: boolean;
   confidenceBreakdown: {
     parseSuccessScore: number;
     signalConsistencyScore: number;
     explanationQualityScore: number;
     noErrorsScore: number;
   };
   rawConfidence: number;
   rulesEvaluated?: string[];
 }
 
 // ============================================================================
 // CONFIDENCE INDICATOR
 // ============================================================================
 
 interface ConfidenceIndicatorProps {
   confidence: number;
   showLabel?: boolean;
   size?: 'sm' | 'md' | 'lg';
   className?: string;
 }
 
 export function getConfidenceLevel(confidence: number): ConfidenceLevel {
   if (confidence >= 0.7) return 'high';
   if (confidence >= 0.4) return 'medium';
   return 'low';
 }
 
 export function getConfidenceColor(level: ConfidenceLevel): string {
   switch (level) {
     case 'high':
       return 'bg-green-500';
     case 'medium':
       return 'bg-yellow-500';
     case 'low':
       return 'bg-red-500';
   }
 }
 
 export function getConfidenceDescription(level: ConfidenceLevel): string {
   switch (level) {
     case 'high':
       return 'High confidence: Judge parsed successfully with consistent signals';
     case 'medium':
       return 'Medium confidence: Some uncertainty in analysis or partial signals';
     case 'low':
       return 'Low confidence: Parse errors or contradictory signals detected';
   }
 }
 
 export function ConfidenceIndicator({ 
   confidence, 
   showLabel = true, 
   size = 'md',
   className 
 }: ConfidenceIndicatorProps) {
   const level = getConfidenceLevel(confidence);
   const color = getConfidenceColor(level);
   
   const sizeClasses = {
     sm: 'h-2 w-2',
     md: 'h-3 w-3',
     lg: 'h-4 w-4',
   };
 
   return (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           <div className={cn('flex items-center gap-2', className)}>
             <span className={cn('rounded-full', sizeClasses[size], color)} />
             {showLabel && (
               <span className="text-sm font-medium">
                 {(confidence * 100).toFixed(0)}%
               </span>
             )}
           </div>
         </TooltipTrigger>
         <TooltipContent>
           <div className="space-y-1">
             <p className="font-medium capitalize">{level} Confidence</p>
             <p className="text-xs text-muted-foreground max-w-[200px]">
               {getConfidenceDescription(level)}
             </p>
           </div>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }
 
 // ============================================================================
 // SEVERITY BADGE
 // ============================================================================
 
 interface SeverityBadgeProps {
   severity: Severity;
   showIcon?: boolean;
   className?: string;
 }
 
 export function getSeverityFromRiskScore(riskScore: number | null | undefined): Severity {
   if (riskScore === null || riskScore === undefined) return 'info';
   if (riskScore >= 0.8) return 'critical';
   if (riskScore >= 0.6) return 'high';
   if (riskScore >= 0.4) return 'medium';
   if (riskScore >= 0.2) return 'low';
   return 'info';
 }
 
 export function getSeverityColor(severity: Severity): string {
   switch (severity) {
     case 'critical':
       return 'bg-red-600 text-white border-red-600';
     case 'high':
       return 'bg-orange-500 text-white border-orange-500';
     case 'medium':
       return 'bg-yellow-500 text-black border-yellow-500';
     case 'low':
       return 'bg-blue-500 text-white border-blue-500';
     case 'info':
       return 'bg-gray-400 text-white border-gray-400';
   }
 }
 
 export function getSeverityIcon(severity: Severity): ReactNode {
   switch (severity) {
     case 'critical':
       return <ShieldAlert className="h-3 w-3" />;
     case 'high':
       return <AlertCircle className="h-3 w-3" />;
     case 'medium':
       return <AlertTriangle className="h-3 w-3" />;
     case 'low':
       return <Info className="h-3 w-3" />;
     case 'info':
       return <Info className="h-3 w-3" />;
   }
 }
 
 export function SeverityBadge({ severity, showIcon = true, className }: SeverityBadgeProps) {
   return (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           <Badge className={cn('capitalize gap-1', getSeverityColor(severity), className)}>
             {showIcon && getSeverityIcon(severity)}
             {severity}
           </Badge>
         </TooltipTrigger>
         <TooltipContent>
           <div className="space-y-1">
             <p className="font-medium">Severity: {severity.toUpperCase()}</p>
             <p className="text-xs text-muted-foreground max-w-[200px]">
               {severity === 'critical' && 'Immediate action required. High exploitability and impact.'}
               {severity === 'high' && 'Significant risk. Should be addressed promptly.'}
               {severity === 'medium' && 'Moderate risk. Address in regular maintenance.'}
               {severity === 'low' && 'Low risk. Fix when convenient.'}
               {severity === 'info' && 'Informational finding. No immediate action required.'}
             </p>
           </div>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }
 
 // ============================================================================
 // SCORE TOOLTIP
 // ============================================================================
 
 interface ScoreTooltipProps {
   score: number;
   label: string;
   description?: string;
   children: ReactNode;
 }
 
 export function ScoreTooltip({ score, label, description, children }: ScoreTooltipProps) {
   return (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           {children}
         </TooltipTrigger>
         <TooltipContent>
           <div className="space-y-1">
             <div className="flex items-center justify-between gap-4">
               <span className="font-medium">{label}</span>
               <span className="font-mono">{(score * 100).toFixed(1)}%</span>
             </div>
             {description && (
               <p className="text-xs text-muted-foreground max-w-[200px]">
                 {description}
               </p>
             )}
           </div>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }
 
 // ============================================================================
 // RISK SCORE INDICATOR
 // ============================================================================
 
 interface RiskScoreIndicatorProps {
   riskScore: number | null | undefined;
   showValue?: boolean;
   size?: 'sm' | 'md' | 'lg';
   className?: string;
 }
 
 export function RiskScoreIndicator({ 
   riskScore, 
   showValue = true,
   size = 'md',
   className 
 }: RiskScoreIndicatorProps) {
   const severity = getSeverityFromRiskScore(riskScore);
   
   const sizeClasses = {
     sm: 'text-xs',
     md: 'text-sm',
     lg: 'text-base',
   };
 
   if (riskScore === null || riskScore === undefined) {
     return (
       <TooltipProvider>
         <Tooltip>
           <TooltipTrigger asChild>
             <span className={cn('text-muted-foreground', sizeClasses[size], className)}>
               N/A
             </span>
           </TooltipTrigger>
           <TooltipContent>
             <p>Risk score not available</p>
           </TooltipContent>
         </Tooltip>
       </TooltipProvider>
     );
   }
 
   return (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           <div className={cn('flex items-center gap-2', className)}>
             <SeverityBadge severity={severity} showIcon={false} />
             {showValue && (
               <span className={cn('font-mono', sizeClasses[size])}>
                 {(riskScore * 100).toFixed(0)}%
               </span>
             )}
           </div>
         </TooltipTrigger>
         <TooltipContent>
           <div className="space-y-1">
             <p className="font-medium">Risk Score: {(riskScore * 100).toFixed(1)}%</p>
             <p className="text-xs text-muted-foreground">
               Calculated based on exploitability and potential impact
             </p>
           </div>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }
 
 // ============================================================================
 // VERDICT BADGE
 // ============================================================================
 
 interface VerdictBadgeProps {
   verdict: VerdictState;
   showIcon?: boolean;
   className?: string;
 }
 
 export function VerdictBadge({ verdict, showIcon = true, className }: VerdictBadgeProps) {
   const config = {
     blocked: {
       label: 'Blocked',
       color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300',
       icon: <ShieldCheck className="h-3 w-3" />,
       description: 'The attack was successfully blocked by the target system.',
     },
     succeeded: {
       label: 'Succeeded',
       color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300',
       icon: <ShieldAlert className="h-3 w-3" />,
       description: 'The attack succeeded - vulnerability detected.',
     },
     indeterminate: {
       label: 'Indeterminate',
       color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300',
       icon: <AlertTriangle className="h-3 w-3" />,
       description: 'Could not determine outcome - manual review required.',
     },
   };
 
   const { label, color, icon, description } = config[verdict];
 
   return (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           <Badge className={cn('gap-1 border', color, className)}>
             {showIcon && icon}
             {label}
           </Badge>
         </TooltipTrigger>
         <TooltipContent>
           <p className="max-w-[200px]">{description}</p>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }
 
 // ============================================================================
 // DECISION TRACE PANEL
 // ============================================================================
 
 interface DecisionTracePanelProps {
   trace: DecisionTrace;
   className?: string;
 }
 
 export function DecisionTracePanel({ trace, className }: DecisionTracePanelProps) {
   const { confidenceBreakdown } = trace;
   
   return (
     <div className={cn('space-y-3 p-3 bg-muted/50 rounded-lg border', className)}>
       <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
         Decision Trace
       </div>
       
       {/* Parse Status */}
       <div className="flex items-center justify-between text-sm">
         <span>Parse Status</span>
         <Badge variant={trace.parseSuccess ? 'default' : 'destructive'} className="text-xs">
           {trace.parseSuccess ? 'Success' : 'Error'}
         </Badge>
       </div>
       {trace.parseError && (
         <div className="text-xs text-red-500 font-mono bg-red-50 dark:bg-red-950/30 p-2 rounded">
           {trace.parseError}
         </div>
       )}
 
       {/* Contradiction Detection */}
       <div className="flex items-center justify-between text-sm">
         <span>Contradiction Detected</span>
         <Badge variant={trace.hasContradiction ? 'destructive' : 'outline'} className="text-xs">
           {trace.hasContradiction ? 'Yes' : 'No'}
         </Badge>
       </div>
 
       {/* Signals */}
       <div className="flex items-center justify-between text-sm">
         <span>Signals Triggered</span>
         <span className="font-mono">{trace.signalsTriggered}</span>
       </div>
 
       {/* Confidence Breakdown */}
       <div className="space-y-2">
         <div className="text-xs font-medium text-muted-foreground">Confidence Breakdown</div>
         <div className="grid grid-cols-2 gap-2 text-xs">
           <div className="flex justify-between">
             <span>Parse Success</span>
             <span className="font-mono">{(confidenceBreakdown.parseSuccessScore * 100).toFixed(0)}%</span>
           </div>
           <div className="flex justify-between">
             <span>Signal Consistency</span>
             <span className="font-mono">{(confidenceBreakdown.signalConsistencyScore * 100).toFixed(0)}%</span>
           </div>
           <div className="flex justify-between">
             <span>Explanation Quality</span>
             <span className="font-mono">{(confidenceBreakdown.explanationQualityScore * 100).toFixed(0)}%</span>
           </div>
           <div className="flex justify-between">
             <span>No Errors</span>
             <span className="font-mono">{(confidenceBreakdown.noErrorsScore * 100).toFixed(0)}%</span>
           </div>
         </div>
         <div className="flex items-center justify-between pt-2 border-t text-sm font-medium">
           <span>Total Confidence</span>
           <ConfidenceIndicator confidence={trace.rawConfidence} size="sm" />
         </div>
       </div>
 
       {/* Rules Evaluated */}
       {trace.rulesEvaluated && trace.rulesEvaluated.length > 0 && (
         <div className="space-y-1">
           <div className="text-xs font-medium text-muted-foreground">Rules Evaluated</div>
           <div className="flex flex-wrap gap-1">
             {trace.rulesEvaluated.map((rule, i) => (
               <Badge key={i} variant="outline" className="text-xs">
                 {rule}
               </Badge>
             ))}
           </div>
         </div>
       )}
     </div>
   );
 }