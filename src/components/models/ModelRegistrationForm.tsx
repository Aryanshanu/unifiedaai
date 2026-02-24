import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateModel } from "@/hooks/useModels";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check, Brain, Shield, FileCheck, FolderOpen, Scale, ExternalLink, AlertTriangle, Database, Zap, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const modelSchema = z.object({
  name: z.string().min(2, "Model name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500),
  model_type: z.enum(["LLM", "ML", "NLP", "Computer Vision", "Recommendation", "Other"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g., 1.0.0)").default("1.0.0"),
  use_case: z.string().optional(),
  project_id: z.string().min(1, "Project is required"),
  // Governance fields
  business_owner_email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  license: z.enum(["apache-2.0", "mit", "gpl-3.0", "proprietary", "restricted", "other", ""]).optional(),
  base_model: z.string().optional(),
  model_card_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  access_tier: z.enum(["internal-only", "partner", "customer", "public"]).default("internal-only"),
  sla_tier: z.enum(["best-effort", "standard", "premium", "mission-critical"]).default("best-effort"),
  training_dataset_id: z.string().optional(),
  limitations: z.string().optional(),
  intended_use: z.string().optional(),
  risk_classification: z.enum(["minimal", "limited", "high", "unacceptable", ""]).optional(),
});

type ModelFormData = z.infer<typeof modelSchema>;

interface ModelRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

const steps = [
  { id: 1, name: "Project", icon: FolderOpen },
  { id: 2, name: "Basic Info", icon: Brain },
  { id: 3, name: "Governance", icon: Shield },
  { id: 4, name: "Review", icon: FileCheck },
];

const modelTypes = [
  { value: "LLM", label: "Large Language Model", description: "GPT, Claude, Llama, etc." },
  { value: "ML", label: "Machine Learning", description: "Classification, Regression, etc." },
  { value: "NLP", label: "NLP Model", description: "Sentiment, NER, Summarization" },
  { value: "Computer Vision", label: "Computer Vision", description: "Image Classification, Detection" },
  { value: "Recommendation", label: "Recommendation", description: "Personalization, Suggestions" },
  { value: "Other", label: "Other", description: "Custom model type" },
];

const useCases = [
  "Customer Service Chatbot",
  "Content Generation",
  "Document Analysis",
  "Code Generation",
  "Sentiment Analysis",
  "Fraud Detection",
  "Image Classification",
  "Recommendation Engine",
  "Translation",
  "Summarization",
  "Other",
];

function LinkedSemanticDefinitions() {
  const { data: definitions } = useQuery({
    queryKey: ['active-semantic-definitions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('semantic_definitions')
        .select('id, name, display_name')
        .eq('status', 'active')
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  if (!definitions || definitions.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-1">
        <BookOpen className="w-4 h-4" /> Linked Semantic Definitions
      </label>
      <p className="text-xs text-muted-foreground">
        Active metric definitions that this model computes or depends on.
      </p>
      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-secondary/30">
        {definitions.map((def: any) => (
          <Badge key={def.id} variant="outline" className="text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            {def.display_name || def.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ModelRegistrationForm({ open, onOpenChange, defaultProjectId }: ModelRegistrationFormProps) {
  const [step, setStep] = useState(defaultProjectId ? 2 : 1);
  const navigate = useNavigate();
  const createModel = useCreateModel();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const { data: approvedDatasets } = useQuery({
    queryKey: ["approved-datasets-for-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("id, name, row_count")
        .eq("ai_approval_status", "approved")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: "",
      description: "",
      model_type: "LLM",
      version: "1.0.0",
      use_case: "",
      project_id: defaultProjectId || "",
      business_owner_email: "",
      license: "",
      base_model: "",
      model_card_url: "",
      access_tier: "internal-only",
      sla_tier: "best-effort",
      training_dataset_id: "",
      limitations: "",
      intended_use: "",
      risk_classification: "",
    },
  });

  const onSubmit = async (data: ModelFormData) => {
    try {
      const result = await createModel.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        model_type: data.model_type,
        version: data.version,
        use_case: data.use_case || undefined,
        project_id: data.project_id,
        // Auto-configured gateway
        provider: 'Lovable',
        endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
        // Governance fields
        business_owner_email: data.business_owner_email || undefined,
        license: data.license || undefined,
        base_model: data.base_model || undefined,
        model_card_url: data.model_card_url || undefined,
        access_tier: data.access_tier,
        sla_tier: data.sla_tier,
        training_dataset_id: data.training_dataset_id || undefined,
        limitations: data.limitations || undefined,
        intended_use: data.intended_use || undefined,
        risk_classification: data.risk_classification || undefined,
      });
      
      toast.success("Model registered and system created!", {
        description: "Run Risk & Impact assessments next.",
      });
      onOpenChange(false);
      form.reset();
      setStep(defaultProjectId ? 2 : 1);
      navigate(`/systems/${result.system.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to register model");
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(["project_id"]);
      if (!valid) return;
    }
    if (step === 2) {
      const valid = await form.trigger(["name", "model_type", "description"]);
      if (!valid) return;
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const formValues = form.watch();
  const selectedProject = projects?.find(p => p.id === formValues.project_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Register New Model</DialogTitle>
          <DialogDescription>
            Add a new AI/ML model to your registry. A governed System will be created automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors",
                step >= s.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-border text-muted-foreground"
              )}>
                {step > s.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-12 md:w-20 h-0.5 mx-1",
                  step > s.id ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Project Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Select Project</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the project this model belongs to. A governed System will be created in this project.
                </p>
                
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      {projectsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading projects...
                        </div>
                      ) : projects?.length === 0 ? (
                        <div className="p-4 rounded-lg border border-border bg-secondary/50 text-center">
                          <p className="text-sm text-muted-foreground">No projects found.</p>
                          <Button 
                            type="button" 
                            variant="link" 
                            className="mt-2"
                            onClick={() => {
                              onOpenChange(false);
                              navigate('/projects');
                            }}
                          >
                            Create a project first
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
                          {projects?.map((project) => (
                            <div
                              key={project.id}
                              onClick={() => field.onChange(project.id)}
                              className={cn(
                                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                field.value === project.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <FolderOpen className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="font-medium text-foreground">{project.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {project.organization || 'No organization'} • {project.environment}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the fundamental details about your model.
                </p>
                
                {selectedProject && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      Project: <strong>{selectedProject.name}</strong>
                    </span>
                  </div>
                )}

                {/* AI Gateway Banner */}
                <Alert className="bg-primary/5 border-primary/20">
                  <Zap className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-foreground text-sm">
                    This model will be evaluated using the <strong>Fractal AI Gateway</strong> (Gemini 3 Flash Preview). 
                    No API key or endpoint configuration needed — all inference is routed automatically.
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer Support GPT-4" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name to identify this model.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modelTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <span className="font-medium">{type.label}</span>
                                <span className="text-muted-foreground ml-2 text-xs">{type.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this model does and its intended purpose..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input placeholder="1.0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="use_case"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Use Case</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select use case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {useCases.map((uc) => (
                              <SelectItem key={uc} value={uc}>{uc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Governance */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Governance & Compliance</h3>
                <p className="text-sm text-muted-foreground">
                  Configure accountability, licensing, and access controls for this model.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="business_owner_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Owner Email</FormLabel>
                        <FormControl>
                          <Input placeholder="owner@company.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="license"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select license" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apache-2.0">Apache 2.0</SelectItem>
                            <SelectItem value="mit">MIT</SelectItem>
                            <SelectItem value="gpl-3.0">GPL 3.0</SelectItem>
                            <SelectItem value="proprietary">Proprietary</SelectItem>
                            <SelectItem value="restricted">Restricted Use</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="access_tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Shield className="w-4 h-4" /> Access Tier
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Who can access?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal-only">Internal Only</SelectItem>
                            <SelectItem value="partner">Partners</SelectItem>
                            <SelectItem value="customer">Customers</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sla_tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Scale className="w-4 h-4" /> SLA Tier
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Service level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="best-effort">Best Effort</SelectItem>
                            <SelectItem value="standard">Standard (99%)</SelectItem>
                            <SelectItem value="premium">Premium (99.9%)</SelectItem>
                            <SelectItem value="mission-critical">Mission Critical (99.99%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="training_dataset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Database className="w-4 h-4" /> Training Dataset
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI-approved dataset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedDatasets?.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No AI-approved datasets available
                            </div>
                          ) : (
                            approvedDatasets?.map((ds) => (
                              <SelectItem key={ds.id} value={ds.id}>
                                <div className="flex items-center gap-2">
                                  <span>{ds.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {(ds.row_count || 0).toLocaleString()} rows
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="risk_classification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> EU AI Act Risk Classification
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minimal">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Minimal</Badge>
                              <span className="text-muted-foreground text-xs">Low risk</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="limited">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Limited</Badge>
                              <span className="text-muted-foreground text-xs">Transparency required</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">High</Badge>
                              <span className="text-muted-foreground text-xs">Strict compliance</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="unacceptable">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Unacceptable</Badge>
                              <span className="text-muted-foreground text-xs">Prohibited</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="limitations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Known Limitations</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Document known limitations..." className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Linked Semantic Definitions */}
                <LinkedSemanticDefinitions />
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Review & Submit</h3>

                <div className="bg-secondary/50 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Basic Info</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Project</p>
                      <p className="font-medium text-foreground">{selectedProject?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Model Name</p>
                      <p className="font-medium text-foreground">{formValues.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{formValues.model_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Version</p>
                      <p className="font-medium text-foreground">{formValues.version}</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">AI Gateway</h4>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Zap className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Fractal AI Gateway</p>
                        <p className="text-xs text-muted-foreground">google/gemini-3-flash-preview • Auto-configured</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Governance</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Business Owner</p>
                        <p className="font-medium text-foreground">{formValues.business_owner_email || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">License</p>
                        <p className="font-medium text-foreground">{formValues.license || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Access Tier</p>
                        <p className="font-medium text-foreground capitalize">{formValues.access_tier?.replace("-", " ") || "Internal only"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SLA Tier</p>
                        <p className="font-medium text-foreground capitalize">{formValues.sla_tier?.replace("-", " ") || "Best effort"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Classification</p>
                        <p className="font-medium text-foreground capitalize">{formValues.risk_classification || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm text-foreground">
                    <strong>What happens next:</strong> A governed System will be created in the selected project. 
                    You'll be redirected to run Risk & Impact assessments before deployment.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={step === 1 || (!!defaultProjectId && step === 2)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {step < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-gradient-primary"
                  disabled={createModel.isPending}
                >
                  {createModel.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Register Model
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
