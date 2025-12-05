import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateModel } from "@/hooks/useModels";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check, Brain, Server, Settings, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const modelSchema = z.object({
  name: z.string().min(2, "Model name must be at least 2 characters"),
  description: z.string().optional(),
  model_type: z.enum(["LLM", "ML", "NLP", "Computer Vision", "Recommendation", "Other"]),
  provider: z.string().optional(),
  version: z.string().default("1.0.0"),
  use_case: z.string().optional(),
  endpoint: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ModelFormData = z.infer<typeof modelSchema>;

interface ModelRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, name: "Basic Info", icon: Brain },
  { id: 2, name: "Provider", icon: Server },
  { id: 3, name: "Configuration", icon: Settings },
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

const providers = [
  { value: "OpenAI", label: "OpenAI", description: "GPT-4, GPT-3.5, DALL-E" },
  { value: "Anthropic", label: "Anthropic", description: "Claude models" },
  { value: "Google", label: "Google", description: "Gemini, PaLM" },
  { value: "Hugging Face", label: "Hugging Face", description: "Open source models" },
  { value: "Azure", label: "Azure ML", description: "Microsoft Azure models" },
  { value: "AWS", label: "AWS SageMaker", description: "Amazon ML services" },
  { value: "Custom", label: "Custom/Self-hosted", description: "Your own infrastructure" },
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

export function ModelRegistrationForm({ open, onOpenChange }: ModelRegistrationFormProps) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const createModel = useCreateModel();

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: "",
      description: "",
      model_type: "LLM",
      provider: "",
      version: "1.0.0",
      use_case: "",
      endpoint: "",
    },
  });

  const onSubmit = async (data: ModelFormData) => {
    try {
      const result = await createModel.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        model_type: data.model_type,
        provider: data.provider || undefined,
        version: data.version,
        use_case: data.use_case || undefined,
        endpoint: data.endpoint || undefined,
      });
      
      toast.success("Model registered successfully!");
      onOpenChange(false);
      form.reset();
      setStep(1);
      navigate(`/models/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to register model");
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(["name", "model_type"]);
      if (!valid) return;
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const formValues = form.watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Register New Model</DialogTitle>
          <DialogDescription>
            Add a new AI/ML model to your registry for governance and monitoring.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                step >= s.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-border text-muted-foreground"
              )}>
                {step > s.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <s.icon className="w-5 h-5" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-12 md:w-20 h-0.5 mx-2",
                  step > s.id ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the fundamental details about your model.
                </p>
                
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
                      <FormLabel>Description</FormLabel>
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
              </div>
            )}

            {/* Step 2: Provider */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Model Provider</h3>
                <p className="text-sm text-muted-foreground">
                  Select the provider or platform hosting this model.
                </p>

                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {providers.map((provider) => (
                          <div
                            key={provider.value}
                            onClick={() => field.onChange(provider.value)}
                            className={cn(
                              "p-4 rounded-xl border-2 cursor-pointer transition-all",
                              field.value === provider.value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <p className="font-medium text-foreground">{provider.label}</p>
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Configuration */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure version, use case, and endpoint details.
                </p>

                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Semantic version number (e.g., 1.0.0, 2.1.0)
                      </FormDescription>
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
                            <SelectValue placeholder="Select primary use case" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {useCases.map((uc) => (
                            <SelectItem key={uc} value={uc}>{uc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The primary use case helps determine risk classification.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/v1/model" {...field} />
                      </FormControl>
                      <FormDescription>
                        The API endpoint for running evaluations (optional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Review & Submit</h3>
                <p className="text-sm text-muted-foreground">
                  Review your model configuration before registering.
                </p>

                <div className="bg-secondary/50 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Model Name</p>
                      <p className="font-medium text-foreground">{formValues.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{formValues.model_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Provider</p>
                      <p className="font-medium text-foreground">{formValues.provider || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Version</p>
                      <p className="font-medium text-foreground">{formValues.version}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Use Case</p>
                      <p className="font-medium text-foreground">{formValues.use_case || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Endpoint</p>
                      <p className="font-medium text-foreground text-xs truncate">{formValues.endpoint || "Not configured"}</p>
                    </div>
                  </div>
                  
                  {formValues.description && (
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm text-foreground">{formValues.description}</p>
                    </div>
                  )}
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm text-foreground">
                    <strong>Next Steps:</strong> After registration, you can run RAI evaluations to assess fairness, robustness, privacy, and safety scores.
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
                disabled={step === 1}
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
                      Registering...
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
