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
import { useCreateImpactAssessment, calculateImpactScores, type ImpactQuestionnaireAnswers } from "@/hooks/useImpactAssessments";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Target, Users, Building2, Scale, Shield, Megaphone,
  ChevronRight, ChevronLeft, CheckCircle, AlertTriangle
} from "lucide-react";

interface ImpactAssessmentWizardProps {
  projectId: string;
  systemId: string;
  systemName: string;
  riskTier?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, title: "User Impact", icon: Users },
  { id: 2, title: "Business Impact", icon: Building2 },
  { id: 3, title: "Legal Impact", icon: Scale },
  { id: 4, title: "Reputation & Safety", icon: Shield },
  { id: 5, title: "Review", icon: CheckCircle },
];

const userVolumeOptions = [
  { value: "0-100", label: "0 - 100 users" },
  { value: "100-1000", label: "100 - 1,000 users" },
  { value: "1000-10000", label: "1,000 - 10,000 users" },
  { value: "10000-100000", label: "10,000 - 100,000 users" },
  { value: "100000+", label: "100,000+ users" },
];

const vulnerableGroupOptions = [
  { value: "none", label: "None of the below" },
  { value: "minors", label: "Minors (under 18)" },
  { value: "patients", label: "Patients / Healthcare recipients" },
  { value: "applicants", label: "Job applicants" },
  { value: "borrowers", label: "Loan/credit applicants" },
  { value: "vulnerable", label: "Vulnerable populations" },
];

const regulatedDomainOptions = [
  { value: "none", label: "None" },
  { value: "credit", label: "Credit / Lending" },
  { value: "hiring", label: "Employment / Hiring" },
  { value: "healthcare", label: "Healthcare" },
  { value: "law_enforcement", label: "Law enforcement" },
  { value: "education", label: "Education / Admissions" },
];

export function ImpactAssessmentWizard({ 
  projectId, systemId, systemName, riskTier, open, onOpenChange 
}: ImpactAssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<ImpactQuestionnaireAnswers>({});
  const { toast } = useToast();
  const createAssessment = useCreateImpactAssessment();

  const updateAnswer = <K extends keyof ImpactQuestionnaireAnswers>(
    key: K, 
    value: ImpactQuestionnaireAnswers[K]
  ) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof ImpactQuestionnaireAnswers, value: string) => {
    const current = (answers[key] as string[] | undefined) ?? [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateAnswer(key, updated as ImpactQuestionnaireAnswers[typeof key]);
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
        riskTier,
      });
      toast({
        title: "Impact Assessment Complete",
        description: "The impact assessment has been saved successfully.",
      });
      setAnswers({});
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save impact assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const previewScores = calculateImpactScores(answers, riskTier);

  const getQuadrantLabel = (quadrant: string) => {
    const parts = quadrant.split("_");
    return `${parts[0].toUpperCase()} Risk × ${parts[1].toUpperCase()} Impact`;
  };

  const getQuadrantColor = (quadrant: string) => {
    if (quadrant.includes("high_high") || quadrant.includes("critical")) {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    if (quadrant.includes("high") || quadrant.includes("medium_medium")) {
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    }
    if (quadrant.includes("medium")) {
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
    return "bg-green-500/10 text-green-500 border-green-500/20";
  };

  const getDimensionLabel = (key: string) => {
    const labels: Record<string, string> = {
      userImpact: "User Impact",
      businessImpact: "Business Impact",
      legalImpact: "Legal Impact",
      reputationImpact: "Reputation Impact",
      safetyImpact: "Safety Impact",
    };
    return labels[key] || key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Impact Assessment: {systemName}
          </DialogTitle>
          <DialogDescription>
            Evaluate the potential impact if this system fails or produces errors.
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
          {/* Step 1: User Impact */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Approximate number of users affected per month?</Label>
                <RadioGroup
                  value={answers.monthlyUsers}
                  onValueChange={(v) => updateAnswer("monthlyUsers", v)}
                >
                  {userVolumeOptions.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                      <RadioGroupItem value={opt.value} id={`users-${opt.value}`} />
                      <Label htmlFor={`users-${opt.value}`} className="cursor-pointer flex-1">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Are any of these user groups affected?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vulnerableGroupOptions.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                      <Checkbox
                        id={`vuln-${opt.value}`}
                        checked={answers.vulnerableGroups?.includes(opt.value) || false}
                        onCheckedChange={() => toggleArrayItem("vulnerableGroups", opt.value)}
                      />
                      <Label htmlFor={`vuln-${opt.value}`} className="cursor-pointer flex-1">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>How often do users rely solely on the AI output?</Label>
                <RadioGroup
                  value={answers.userReliance}
                  onValueChange={(v) => updateAnswer("userReliance", v as ImpactQuestionnaireAnswers["userReliance"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="advisory" id="rel-advisory" />
                    <Label htmlFor="rel-advisory" className="flex-1 cursor-pointer">
                      <span className="font-medium">Advisory</span>
                      <p className="text-sm text-muted-foreground">Users always verify AI suggestions</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="main_input" id="rel-main" />
                    <Label htmlFor="rel-main" className="flex-1 cursor-pointer">
                      <span className="font-medium">Main Input</span>
                      <p className="text-sm text-muted-foreground">AI output is primary but reviewed</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="sole_decider" id="rel-sole" />
                    <Label htmlFor="rel-sole" className="flex-1 cursor-pointer">
                      <span className="font-medium">Sole Decider</span>
                      <p className="text-sm text-muted-foreground">Users fully rely on AI without verification</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Business Impact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>What happens if this system fails for 24 hours?</Label>
                <RadioGroup
                  value={answers.failureConsequence}
                  onValueChange={(v) => updateAnswer("failureConsequence", v as ImpactQuestionnaireAnswers["failureConsequence"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="minor" id="fail-minor" />
                    <Label htmlFor="fail-minor" className="flex-1 cursor-pointer">
                      <span className="font-medium">Minor Inconvenience</span>
                      <p className="text-sm text-muted-foreground">Users can easily work around it</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="delay" id="fail-delay" />
                    <Label htmlFor="fail-delay" className="flex-1 cursor-pointer">
                      <span className="font-medium">Internal Delay</span>
                      <p className="text-sm text-muted-foreground">Slows down operations but manageable</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="major_disruption" id="fail-major" />
                    <Label htmlFor="fail-major" className="flex-1 cursor-pointer">
                      <span className="font-medium">Major Operational Disruption</span>
                      <p className="text-sm text-muted-foreground">Significant impact on business operations</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="revenue_loss" id="fail-revenue" />
                    <Label htmlFor="fail-revenue" className="flex-1 cursor-pointer">
                      <span className="font-medium">Revenue Loss</span>
                      <p className="text-sm text-muted-foreground">Direct financial impact from downtime</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Is this AI tied to revenue or key KPIs?</Label>
                <RadioGroup
                  value={answers.revenueLinked === undefined ? undefined : answers.revenueLinked ? "yes" : "no"}
                  onValueChange={(v) => updateAnswer("revenueLinked", v === "yes")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="rev-yes" />
                    <Label htmlFor="rev-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="rev-no" />
                    <Label htmlFor="rev-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {answers.revenueLinked && (
                <div className="space-y-3">
                  <Label>How severe is the revenue dependency?</Label>
                  <RadioGroup
                    value={answers.revenueSeverity}
                    onValueChange={(v) => updateAnswer("revenueSeverity", v as ImpactQuestionnaireAnswers["revenueSeverity"])}
                  >
                    {["low", "medium", "high", "critical"].map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <RadioGroupItem value={level} id={`sev-${level}`} />
                        <Label htmlFor={`sev-${level}`} className="capitalize">{level}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Legal Impact */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Could failures lead to regulatory investigation or fines?</Label>
                <RadioGroup
                  value={answers.regulatoryRisk}
                  onValueChange={(v) => updateAnswer("regulatoryRisk", v as ImpactQuestionnaireAnswers["regulatoryRisk"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="no" id="reg-no" />
                    <Label htmlFor="reg-no" className="flex-1 cursor-pointer">No</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="maybe" id="reg-maybe" />
                    <Label htmlFor="reg-maybe" className="flex-1 cursor-pointer">Maybe (unlikely but possible)</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="likely" id="reg-likely" />
                    <Label htmlFor="reg-likely" className="flex-1 cursor-pointer">Likely</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="almost_certain" id="reg-certain" />
                    <Label htmlFor="reg-certain" className="flex-1 cursor-pointer">Almost Certain</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Is this in a regulated domain?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {regulatedDomainOptions.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                      <Checkbox
                        id={`domain-${opt.value}`}
                        checked={answers.regulatedDomain?.includes(opt.value) || false}
                        onCheckedChange={() => toggleArrayItem("regulatedDomain", opt.value)}
                      />
                      <Label htmlFor={`domain-${opt.value}`} className="cursor-pointer flex-1">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Reputation & Safety */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Could an error go viral / cause strong public backlash?
                </Label>
                <RadioGroup
                  value={answers.viralRisk}
                  onValueChange={(v) => updateAnswer("viralRisk", v as ImpactQuestionnaireAnswers["viralRisk"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="no" id="viral-no" />
                    <Label htmlFor="viral-no" className="flex-1 cursor-pointer">
                      <span className="font-medium">No</span>
                      <p className="text-sm text-muted-foreground">Internal use only or low visibility</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="limited" id="viral-limited" />
                    <Label htmlFor="viral-limited" className="flex-1 cursor-pointer">
                      <span className="font-medium">Limited</span>
                      <p className="text-sm text-muted-foreground">Some public exposure but contained</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="high" id="viral-high" />
                    <Label htmlFor="viral-high" className="flex-1 cursor-pointer">
                      <span className="font-medium">High</span>
                      <p className="text-sm text-muted-foreground">Consumer-facing with viral potential</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Could outputs cause physical or mental harm?
                </Label>
                <RadioGroup
                  value={answers.harmPotential}
                  onValueChange={(v) => updateAnswer("harmPotential", v as ImpactQuestionnaireAnswers["harmPotential"])}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="no" id="harm-no" />
                    <Label htmlFor="harm-no" className="flex-1 cursor-pointer">
                      <span className="font-medium text-green-500">No</span>
                      <p className="text-sm text-muted-foreground">No potential for harm</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="low" id="harm-low" />
                    <Label htmlFor="harm-low" className="flex-1 cursor-pointer">
                      <span className="font-medium text-yellow-500">Low</span>
                      <p className="text-sm text-muted-foreground">Minor inconvenience or frustration</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="medium" id="harm-medium" />
                    <Label htmlFor="harm-medium" className="flex-1 cursor-pointer">
                      <span className="font-medium text-orange-500">Medium</span>
                      <p className="text-sm text-muted-foreground">Could cause stress or minor financial harm</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="high" id="harm-high" />
                    <Label htmlFor="harm-high" className="flex-1 cursor-pointer">
                      <span className="font-medium text-red-500">High</span>
                      <p className="text-sm text-muted-foreground">Potential for significant harm</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Impact Assessment Result</h3>
                      <p className="text-sm text-muted-foreground">Risk × Impact Analysis</p>
                    </div>
                    <Badge className={`text-sm px-3 py-1 ${getQuadrantColor(previewScores.quadrant)}`}>
                      {getQuadrantLabel(previewScores.quadrant)}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Impact Score</span>
                      <span className="text-2xl font-bold">{Math.round(previewScores.overallScore)}</span>
                    </div>
                    <Progress value={previewScores.overallScore} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(previewScores.dimensions).map(([key, value]) => (
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

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Assessment Summary</h4>
                      <p className="text-sm text-muted-foreground mt-1">{previewScores.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {previewScores.overallScore > 60 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-500">Approval Required</p>
                    <p className="text-muted-foreground">
                      This system will require approval before deployment due to high impact score.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createAssessment.isPending} className="gap-2">
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
