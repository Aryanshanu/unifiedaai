import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, FileText } from "lucide-react";

// Import tab content from existing pages (extracted as components)
import ImpactDashboardContent from "@/components/impact/ImpactDashboardContent";
import RegulatoryReportsContent from "@/components/reports/RegulatoryReportsContent";

export default function ImpactCenter() {
  const [activeTab, setActiveTab] = useState("impact");

  return (
    <MainLayout 
      title="Impact & Reporting" 
      subtitle="Population-level fairness, outcome tracking, and compliance documentation"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="impact" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Impact Dashboard</span>
            <span className="sm:hidden">Impact</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Regulatory Reports</span>
            <span className="sm:hidden">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="mt-6">
          <ImpactDashboardContent />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <RegulatoryReportsContent />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
