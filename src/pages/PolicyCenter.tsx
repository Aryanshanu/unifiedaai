import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lock, FileText, Zap } from "lucide-react";

// Import tab content from existing pages (extracted as components)
import PolicyStudioContent from "@/components/policy/PolicyStudioContent";
import DataContractsContent from "@/components/policy/DataContractsContent";
import GoldenDemoContent from "@/components/policy/GoldenDemoContent";

export default function PolicyCenter() {
  const [activeTab, setActiveTab] = useState("policy");

  return (
    <MainLayout 
      title="Policy & Governance" 
      subtitle="Runtime guardrails, data contracts, and end-to-end RAI pipeline orchestration"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="policy" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Policy Studio</span>
            <span className="sm:hidden">Policy</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Data Contracts</span>
            <span className="sm:hidden">Contracts</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Golden Demo</span>
            <span className="sm:hidden">Demo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="mt-6">
          <PolicyStudioContent />
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <DataContractsContent />
        </TabsContent>

        <TabsContent value="demo" className="mt-6">
          <GoldenDemoContent />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
