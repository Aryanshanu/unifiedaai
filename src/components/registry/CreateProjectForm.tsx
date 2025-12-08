import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { useCreateProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderPlus, Building2, Shield, Database, Gauge, Server, Globe, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  organization: z.string().max(100).optional(),
  business_sensitivity: z.enum(["low", "medium", "high", "critical"]),
  data_sensitivity: z.enum(["low", "medium", "high", "critical"]),
  criticality: z.number().min(1).max(10),
  environment: z.enum(["development", "staging", "production"]),
  // New governance fields
  data_residency: z.enum(["us", "eu", "uk", "apac", "global"]).default("us"),
  primary_owner_email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  compliance_frameworks: z.array(z.string()).default([]),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, title: "Basic Info", icon: FolderPlus },
  { id: 2, title: "Sensitivity", icon: Shield },
  { id: 3, title: "Governance", icon: Globe },
  { id: 4, title: "Configuration", icon: Server },
];

export function CreateProjectForm({ open, onOpenChange }: CreateProjectFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const createProject = useCreateProject();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      organization: "",
      business_sensitivity: "medium",
      data_sensitivity: "medium",
      criticality: 5,
      environment: "development",
      data_residency: "us",
      primary_owner_email: "",
      compliance_frameworks: [],
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      await createProject.mutateAsync({
        name: data.name,
        description: data.description,
        organization: data.organization,
        business_sensitivity: data.business_sensitivity,
        data_sensitivity: data.data_sensitivity,
        criticality: data.criticality,
        environment: data.environment,
        data_residency: data.data_residency,
        primary_owner_email: data.primary_owner_email || undefined,
        compliance_frameworks: data.compliance_frameworks,
      });
      toast({
        title: "Project Created",
        description: `Project "${data.name}" has been created successfully.`,
      });
      form.reset();
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      const valid = await form.trigger(["name", "description", "organization"]);
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await form.trigger(["business_sensitivity", "data_sensitivity"]);
      if (valid) setCurrentStep(3);
    } else if (currentStep === 3) {
      const valid = await form.trigger(["data_residency"]);
      if (valid) setCurrentStep(4);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const toggleComplianceFramework = (framework: string) => {
    const current = form.getValues("compliance_frameworks") || [];
    const updated = current.includes(framework)
      ? current.filter(f => f !== framework)
      : [...current, framework];
    form.setValue("compliance_frameworks", updated);
  };

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-500";
      case "medium": return "text-yellow-500";
      case "high": return "text-orange-500";
      case "critical": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Set up a new AI project to manage systems, risk assessments, and governance.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentStep >= step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                }`} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer Support AI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the purpose and scope of this project..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Organization
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Engineering Team" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Sensitivity */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="business_sensitivity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Business Sensitivity
                      </FormLabel>
                      <FormDescription>
                        How critical is this project to business operations?
                      </FormDescription>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sensitivity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">
                            <span className={getSensitivityColor("low")}>● Low</span> - Internal tools, non-critical
                          </SelectItem>
                          <SelectItem value="medium">
                            <span className={getSensitivityColor("medium")}>● Medium</span> - Customer-facing, moderate impact
                          </SelectItem>
                          <SelectItem value="high">
                            <span className={getSensitivityColor("high")}>● High</span> - Revenue-critical, regulated
                          </SelectItem>
                          <SelectItem value="critical">
                            <span className={getSensitivityColor("critical")}>● Critical</span> - Mission-critical, compliance required
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_sensitivity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Data Sensitivity
                      </FormLabel>
                      <FormDescription>
                        What type of data does this project process?
                      </FormDescription>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select data sensitivity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">
                            <span className={getSensitivityColor("low")}>● Low</span> - Public data only
                          </SelectItem>
                          <SelectItem value="medium">
                            <span className={getSensitivityColor("medium")}>● Medium</span> - Internal data, no PII
                          </SelectItem>
                          <SelectItem value="high">
                            <span className={getSensitivityColor("high")}>● High</span> - Contains PII, customer data
                          </SelectItem>
                          <SelectItem value="critical">
                            <span className={getSensitivityColor("critical")}>● Critical</span> - Financial, health, or protected data
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Governance */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="data_residency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Data Residency
                      </FormLabel>
                      <FormDescription>
                        Where is data processed and stored? (GDPR/compliance requirement)
                      </FormDescription>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select data residency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="us">🇺🇸 United States</SelectItem>
                          <SelectItem value="eu">🇪🇺 European Union</SelectItem>
                          <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                          <SelectItem value="apac">🌏 Asia-Pacific</SelectItem>
                          <SelectItem value="global">🌐 Global (Multi-region)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_owner_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Primary Owner Email
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="owner@company.com" type="email" {...field} />
                      </FormControl>
                      <FormDescription>
                        Accountable person for this project's governance.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Compliance Frameworks</FormLabel>
                  <FormDescription>Select all applicable frameworks</FormDescription>
                  <div className="grid grid-cols-2 gap-2">
                    {["gdpr", "ccpa", "hipaa", "sox", "eu-ai-act", "nist"].map((framework) => (
                      <div key={framework} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <Checkbox
                          id={`framework-${framework}`}
                          checked={form.watch("compliance_frameworks")?.includes(framework)}
                          onCheckedChange={() => toggleComplianceFramework(framework)}
                        />
                        <label htmlFor={`framework-${framework}`} className="cursor-pointer uppercase text-sm font-medium">
                          {framework}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Configuration */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="criticality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Criticality Score: {field.value}
                      </FormLabel>
                      <FormDescription>
                        Rate the overall criticality of this project (1 = Low, 10 = Mission Critical)
                      </FormDescription>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="mt-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                        <span>Critical</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Deployment Environment
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="development">
                            🔧 Development - Testing and experimentation
                          </SelectItem>
                          <SelectItem value="staging">
                            🧪 Staging - Pre-production validation
                          </SelectItem>
                          <SelectItem value="production">
                            🚀 Production - Live deployment
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Summary */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-medium">Project Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{form.watch("name") || "-"}</span>
                    <span className="text-muted-foreground">Organization:</span>
                    <span>{form.watch("organization") || "-"}</span>
                    <span className="text-muted-foreground">Business Sensitivity:</span>
                    <span className={getSensitivityColor(form.watch("business_sensitivity"))}>
                      {form.watch("business_sensitivity")}
                    </span>
                    <span className="text-muted-foreground">Data Sensitivity:</span>
                    <span className={getSensitivityColor(form.watch("data_sensitivity"))}>
                      {form.watch("data_sensitivity")}
                    </span>
                    <span className="text-muted-foreground">Environment:</span>
                    <span>{form.watch("environment")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Back
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
