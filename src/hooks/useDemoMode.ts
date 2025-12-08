import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEMO_MODE_KEY = 'fractal-rai-demo-mode';

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEMO_MODE_KEY) === 'true';
    }
    return false;
  });
  const [isInitializing, setIsInitializing] = useState(false);

  const toggleDemoMode = useCallback((enabled: boolean) => {
    setIsDemoMode(enabled);
    localStorage.setItem(DEMO_MODE_KEY, String(enabled));
    if (enabled) {
      toast.success("Demo Mode Enabled", {
        description: "Auto-populating data for demonstration"
      });
    }
  }, []);

  const initializeDemoData = useCallback(async () => {
    if (!isDemoMode || isInitializing) return;
    
    setIsInitializing(true);
    
    try {
      // Check if we need to populate data
      const { count } = await supabase
        .from('request_logs')
        .select('*', { count: 'exact', head: true });
      
      if ((count || 0) < 100) {
        toast.info("Initializing demo data...", { duration: 3000 });
        
        // Generate traffic with larger counts
        const { error } = await supabase.functions.invoke('generate-test-traffic', {
          body: { 
            count: 200,
            generateDrift: true,
            generateIncidents: true,
            generateReviews: true
          },
        });
        
        if (error) {
          console.error('Traffic generation error:', error);
        } else {
          toast.success("Demo data generated!", {
            description: "200 request logs, drift alerts, incidents, and reviews created"
          });
        }
        
        // Seed red team campaigns
        await seedRedTeamCampaigns();
      }
    } catch (error) {
      console.error('Demo initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [isDemoMode, isInitializing]);

  return {
    isDemoMode,
    toggleDemoMode,
    initializeDemoData,
    isInitializing
  };
}

async function seedRedTeamCampaigns() {
  try {
    // Check if campaigns already exist
    const { data: existing } = await supabase
      .from('red_team_campaigns')
      .select('id')
      .limit(1);
    
    if (existing && existing.length > 0) return;
    
    // Seed 3 completed campaigns
    const campaigns = [
      {
        name: 'Q4 Security Audit',
        description: 'Comprehensive jailbreak and adversarial testing',
        status: 'completed' as const,
        coverage: 92,
        findings_count: 3,
        attack_types: ['jailbreak', 'prompt_injection', 'data_extraction']
      },
      {
        name: 'Toxicity Boundary Test',
        description: 'Testing content moderation boundaries',
        status: 'completed' as const,
        coverage: 78,
        findings_count: 7,
        attack_types: ['toxicity', 'hate_speech', 'harmful_content']
      },
      {
        name: 'Privacy Leakage Campaign',
        description: 'Testing for PII and training data exposure',
        status: 'completed' as const,
        coverage: 85,
        findings_count: 2,
        attack_types: ['pii_extraction', 'membership_inference', 'data_leakage']
      }
    ];
    
    for (const campaign of campaigns) {
      await supabase.from('red_team_campaigns').insert(campaign);
    }
  } catch (error) {
    console.error('Failed to seed red team campaigns:', error);
  }
}
