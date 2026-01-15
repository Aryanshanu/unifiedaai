import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, Copy, Check, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DQDashboardAsset } from '@/hooks/useDQControlPlane';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DQDashboardAssetsProps {
  assets: DQDashboardAsset | null;
  isLoading?: boolean;
}

export function DQDashboardAssets({ assets, isLoading }: DQDashboardAssetsProps) {
  const { toast } = useToast();
  const [copiedAsset, setCopiedAsset] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, assetName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAsset(assetName);
      toast({
        title: 'Copied!',
        description: `${assetName} SQL copied to clipboard`,
      });
      setTimeout(() => setCopiedAsset(null), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const copyAll = async () => {
    if (!assets) return;
    const allSql = `-- Summary SQL\n${assets.summary_sql}\n\n-- Hotspots SQL\n${assets.hotspots_sql}\n\n-- Dimension Breakdown SQL\n${assets.dimension_breakdown_sql}`;
    await copyToClipboard(allSql, 'All');
  };

  if (!assets && !isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            DASHBOARD ASSETS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No dashboard assets generated</p>
            <p className="text-xs mt-1">Assets are created after rule execution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary animate-pulse" />
            DASHBOARD ASSETS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const assetTabs = [
    { id: 'summary', label: 'Summary', sql: assets?.summary_sql || '' },
    { id: 'hotspots', label: 'Hotspots', sql: assets?.hotspots_sql || '' },
    { id: 'breakdown', label: 'Breakdown', sql: assets?.dimension_breakdown_sql || '' }
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            DASHBOARD ASSETS
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={copyAll}
          >
            {copiedAsset === 'All' ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </>
            )}
          </Button>
        </div>
        {assets?.generated_at && (
          <p className="text-xs text-muted-foreground mt-1">
            Generated: {format(new Date(assets.generated_at), 'MMM d, yyyy HH:mm:ss')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            {assetTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {assetTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-3">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-7 text-xs z-10"
                  onClick={() => copyToClipboard(tab.sql, tab.label)}
                >
                  {copiedAsset === tab.label ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <ScrollArea className="h-[200px]">
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <FileCode className="h-3 w-3" />
                      <span className="font-medium">{tab.label} SQL</span>
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground overflow-x-auto">
                      {tab.sql || 'No SQL generated'}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
