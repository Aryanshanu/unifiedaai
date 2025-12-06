import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCreateRiskAssessment, calculateRiskScores, type QuestionnaireAnswers } from "@/hooks/useRiskAssessments";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, AlertTriangle, Shield, FileText, Users, Scale, 
  ChevronRight, ChevronLeft, CheckCircle, Database, Globe, Gavel 
} from "lucide-react";

interface RiskAssessmentWizardProps {
  projectId: string;
  systemId: string;
  systemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, title: "Use Case & Autonomy", icon: FileText },
  { id: 2, title: "Data Profile", icon: Database },
  { id: 3, title: "Users & Deployment", icon: Users },
  { id: 4, title: "Regulatory Context", icon: Gavel },
  { id: 5, title: "Review & Confirm", icon: CheckCircle },
];

const dataTypeOptions = [
  { value: "public", label: "Public data only" },
  { value: "internal", label: "Internal/confidential data" },
  { value: "personal", label: "Personal data (names, emails)" },
  { value: "financial", label: "Financial data" },
  { value: "health", label: "Health/medical data" },
  { value: "minors", label: "Data about minors" },
  { value: "biometric", label: "Biometric data" },
];

const userTypeOptions = [
  { value: "internal", label: "Internal staff only" },
  { value: "customers", label: "Customers/consumers" },
  { value: "minors", label: "Minors (under 18)" },
  { value: "vulnerable", label: "Vulnerable populations" },
  { value: "business", label: "Business partners" },
];

const deploymentOptions = [
  { value: "internal", label: "Internal application" },
  { value: "b2b", label: "B2B/partner-facing" },
  { value: "public", label: "Public-facing application" },
  { value: "api", label: "API endpoint" },
];

const regulatedAreaOptions = [
  { value: "credit", label: "Credit/lending decisions" },
  { value: "hiring", label: "Employment/hiring" },
  { value: "healthcare", label: "Healthcare/medical" },
  { value: "law", label: "Law enforcement/justice" },
  { value: "education", label: "Education/admissions" },
  { value: "insurance", label: "Insurance underwriting" },
  { value: "none", label: "None of the above" },
];

export function RiskAssessmentWizard({ projectId, systemId, systemName, open, onOpenChange }: RiskAssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const { toast } = useToast();
  const createAssessment = useCreateRiskAssessment();

  const updateAnswer = <K extends keyof QuestionnaireAnswers>(
    key: K, 
    value: QuestionnaireAnswers[K]
  ) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof QuestionnaireAnswers, value: string) => {
    const current = (answers[key] as string[] | undefined) ?? [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateAnswer(key, updated as QuestionnaireAnswers[typeof key]);
  };

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      await createAssessment.mutateAsync({
        project_id: projectId,
        system_id: systemId,
        questionnaire_answers: answers,
      });
      toast({
        title: "Risk Assessment Complete",
        description: "The risk assessment has been saved successfully.",
      });
      setAnswers({});
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save risk assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const previewScores = calculateRiskScores(answers);

  const getRiskTierColor = (tier: string) => {
    switch (tier) {
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDimensionLabel = (key: string) => {
    const labels: Record<string, string> = {
      dataRisk: "Data Risk",
      modelRisk: "Model Risk",
      useCaseRisk: "Use Case Risk",
      operationalRisk: "Operational Risk",
      regulatoryRisk: "Regulatory Risk",
      ethicalRisk: "Ethical Risk",
    };
    return labels[key] || key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Risk Assessment: {systemName}
          </DialogTitle>
          <DialogDescription>
            Answer questions about this system to calculate its risk profile.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Step {currentStep} of 5</span>
            <span className="font-medium">{steps[currentStep - 1].title}</span>
          </div>
          <Progress value={(currentStep / 5) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="space-y-6 py-4 min-h-[300px]">
          {/* Step 1: Use Case & Autonomy */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>What does this system do?</Label>
                <Textarea
                  placeholder="Describe the primary use case and functionality..."
                  value={answers.useCase || ""}
                  onChange={(e) => updateAnswer("useCase", e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-3">
                <Label>Is the AI advisory or does it make automated decisions?</Label>
                <RadioGroup
                  value={answers.decisionType}
                  onValueChange={(v) => updateAnswer("decisionType", v as QuestionnaireAnswers["decisionType"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="advisory" id="advisory" />
                    <Label htmlFor="advisory" className="flex-1 cursor-pointer">
                      <span className="font-medium">Advisory</span>
                      <p className="text-sm text-muted-foreground">AI provides recommendations, humans make decisions</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="hybrid" id="hybrid" />
                    <Label htmlFor="hybrid" className="flex-1 cursor-pointer">
                      <span className="font-medium">Hybrid</span>
                      <p className="text-sm text-muted-foreground">Mix of automated and human decisions</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="automated" id="automated" />
                    <Label htmlFor="automated" className="flex-1 cursor-pointer">
                      <span className="font-medium">Automated</span>
                      <p className="text-sm text-muted-foreground">AI makes decisions without human review</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Can humans override the AI's decisions?</Label>
                <RadioGroup
                  value={answers.humanOverride === undefined ? undefined : answers.humanOverride ? "yes" : "no"}
                  onValueChange={(v) => updateAnswer("humanOverride", v === "yes")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="override-yes" />
                    <Label htmlFor="override-yes">Yes, humans can always override</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="override-no" />
                    <Label htmlFor="override-no">No, or only in limited cases</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Data Profile */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>What types of data does this system process?</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dataTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`data-${option.value}`}
                        checked={answers.dataTypes?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayItem("dataTypes", option.value)}
                      />
                      <Label htmlFor={`data-${option.value}`} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Does it use personal data (PII)?</Label>
                <RadioGroup
                  value={answers.piiLevel}
                  onValueChange={(v) => updateAnswer("piiLevel", v as QuestionnaireAnswers["piiLevel"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="none" id="pii-none" />
                    <Label htmlFor="pii-none" className="flex-1 cursor-pointer">
                      <span className="font-medium">None</span>
                      <p className="text-sm text-muted-foreground">No personal data processed</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="indirect" id="pii-indirect" />
                    <Label htmlFor="pii-indirect" className="flex-1 cursor-pointer">
                      <span className="font-medium">Indirect</span>
                      <p className="text-sm text-muted-foreground">Pseudonymized or aggregated data</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="direct" id="pii-direct" />
                    <Label htmlFor="pii-direct" className="flex-1 cursor-pointer">
                      <span className="font-medium">Direct</span>
                      <p className="text-sm text-muted-foreground">Names, emails, phone numbers, etc.</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="special" id="pii-special" />
                    <Label htmlFor="pii-special" className="flex-1 cursor-pointer">
                      <span className="font-medium">Special Categories</span>
                      <p className="text-sm text-muted-foreground">Health, biometric, genetic, political, religious data</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 3: Users & Deployment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Who are the end users of this system?</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {userTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`user-${option.value}`}
                        checked={answers.userTypes?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayItem("userTypes", option.value)}
                      />
                      <Label htmlFor={`user-${option.value}`} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Where is this system deployed/exposed?</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deploymentOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`deploy-${option.value}`}
                        checked={answers.deploymentSurface?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayItem("deploymentSurface", option.value)}
                      />
                      <Label htmlFor={`deploy-${option.value}`} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Regulatory Context */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Does this fall into any regulated areas?</Label>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {regulatedAreaOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`reg-${option.value}`}
                        checked={answers.regulatedAreas?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayItem("regulatedAreas", option.value)}
                      />
                      <Label htmlFor={`reg-${option.value}`} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>EU AI Act risk classification (best estimate)</Label>
                <RadioGroup
                  value={answers.euAiActRisk}
                  onValueChange={(v) => updateAnswer("euAiActRisk", v as QuestionnaireAnswers["euAiActRisk"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="minimal" id="eu-minimal" />
                    <Label htmlFor="eu-minimal" className="flex-1 cursor-pointer">
                      <span className="font-medium text-green-500">Minimal Risk</span>
                      <p className="text-sm text-muted-foreground">Low-risk AI applications (e.g., spam filters, games)</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="limited" id="eu-limited" />
                    <Label htmlFor="eu-limited" className="flex-1 cursor-pointer">
                      <span className="font-medium text-yellow-500">Limited Risk</span>
                      <p className="text-sm text-muted-foreground">Requires transparency (e.g., chatbots, deepfakes)</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="high" id="eu-high" />
                    <Label htmlFor="eu-high" className="flex-1 cursor-pointer">
                      <span className="font-medium text-orange-500">High Risk</span>
                      <p className="text-sm text-muted-foreground">Strict requirements (e.g., hiring, credit, medical)</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="unacceptable" id="eu-unacceptable" />
                    <Label htmlFor="eu-unacceptable" className="flex-1 cursor-pointer">
                      <span className="font-medium text-red-500">Unacceptable Risk</span>
                      <p className="text-sm text-muted-foreground">Prohibited (e.g., social scoring, manipulation)</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Additional regulatory notes</Label>
                <Textarea
                  placeholder="Any additional regulatory considerations..."
                  value={answers.regulatoryNotes || ""}
                  onChange={(e) => updateAnswer("regulatoryNotes", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Risk Score Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Risk Assessment Result</h3>
                      <p className="text-sm text-muted-foreground">Based on your questionnaire responses</p>
                    </div>
                    <Badge className={`text-lg px-4 py-2 ${getRiskTierColor(previewScores.riskTier)}`}>
                      {previewScores.riskTier.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Overall Score */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Static Risk Score</span>
                      <span className="text-2xl font-bold">{Math.round(previewScores.staticRiskScore)}</span>
                    </div>
                    <Progress 
                      value={previewScores.staticRiskScore} 
                      className="h-3"
                    />
                  </div>

                  {/* Dimension Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(previewScores.dimensionScores).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{getDimensionLabel(key)}</span>
                          <span className="font-medium">{value}/5</span>
                        </div>
                        <Progress value={(value / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Text */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Assessment Summary</h4>
                      <p className="text-sm text-muted-foreground mt-1">{previewScores.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Runtime Notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Globe className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500">Runtime Risk Monitoring</p>
                  <p className="text-muted-foreground">
                    Runtime risk score is currently 0 (not configured). Connect evaluation engines to enable real-time monitoring.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={createAssessment.isPending}
              className="gap-2"
            >
              {createAssessment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Save Assessment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
