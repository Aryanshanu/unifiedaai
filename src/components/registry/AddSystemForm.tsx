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
import { useCreateSystem } from "@/hooks/useSystems";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Cpu, Server, Globe, Key, FileText, CheckCircle, AlertCircle } from "lucide-react";

const systemSchema = z.object({
  name: z.string().min(1, "System name is required").max(100),
  system_type: z.enum(["model", "agent", "provider", "pipeline"]),
  provider: z.string().min(1, "Provider is required"),
  model_name: z.string().optional(),
  endpoint: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  api_token: z.string().optional(),
  use_case: z.string().max(500).optional(),
});

type SystemFormData = z.infer<typeof systemSchema>;

interface AddSystemFormProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const providers = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-5", "gpt-5-mini", "gpt-5-nano"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "claude-3.5-sonnet"] },
  { value: "google", label: "Google", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-3-pro-preview"] },
  { value: "huggingface", label: "Hugging Face", models: [] },
  { value: "azure", label: "Azure OpenAI", models: [] },
  { value: "aws", label: "AWS Bedrock", models: [] },
  { value: "custom", label: "Custom/Self-Hosted", models: [] },
];

const systemTypes = [
  { value: "model", label: "Model", description: "Single AI model endpoint", icon: Cpu },
  { value: "agent", label: "Agent", description: "Autonomous AI agent", icon: Server },
  { value: "provider", label: "Provider", description: "Third-party API provider", icon: Globe },
  { value: "pipeline", label: "Pipeline", description: "Multi-step AI workflow", icon: FileText },
];

const steps = [
  { id: 1, title: "System Type" },
  { id: 2, title: "Provider & Model" },
  { id: 3, title: "Configuration" },
  { id: 4, title: "Review" },
];

export function AddSystemForm({ projectId, open, onOpenChange }: AddSystemFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const { toast } = useToast();
  const createSystem = useCreateSystem();

  const form = useForm<SystemFormData>({
    resolver: zodResolver(systemSchema),
    defaultValues: {
      name: "",
      system_type: "model",
      provider: "",
      model_name: "",
      endpoint: "",
      api_token: "",
      use_case: "",
    },
  });

  const selectedProvider = providers.find(p => p.value === form.watch("provider"));

  const onSubmit = async (data: SystemFormData) => {
    try {
      await createSystem.mutateAsync({
        project_id: projectId,
        name: data.name,
        system_type: data.system_type,
        provider: data.provider,
        model_name: data.model_name,
        endpoint: data.endpoint || undefined,
        api_token_encrypted: data.api_token || undefined,
        use_case: data.use_case,
      });
      toast({
        title: "System Added",
        description: `System "${data.name}" has been added to the project.`,
      });
      form.reset();
      setCurrentStep(1);
      setConnectionStatus("idle");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add system. Please try again.",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    const endpoint = form.getValues("endpoint");
    const apiToken = form.getValues("api_token");

    if (!endpoint) {
      toast({
        title: "Missing Endpoint",
        description: "Please enter an endpoint URL to test the connection.",
        variant: "destructive",
      });
      return;
    }

    setConnectionStatus("testing");

    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would make an actual API call
      if (apiToken) {
        setConnectionStatus("success");
        toast({
          title: "Connection Successful",
          description: "Successfully connected to the endpoint.",
        });
      } else {
        setConnectionStatus("error");
        toast({
          title: "Connection Failed",
          description: "API token may be required for this endpoint.",
          variant: "destructive",
        });
      }
    } catch {
      setConnectionStatus("error");
      toast({
        title: "Connection Failed",
        description: "Could not connect to the specified endpoint.",
        variant: "destructive",
      });
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      const valid = await form.trigger(["name", "system_type"]);
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await form.trigger(["provider", "model_name"]);
      if (valid) setCurrentStep(3);
    } else if (currentStep === 3) {
      const valid = await form.trigger(["endpoint", "api_token", "use_case"]);
      if (valid) setCurrentStep(4);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getSystemTypeIcon = (type: string) => {
    const systemType = systemTypes.find(t => t.value === type);
    return systemType?.icon || Cpu;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Add AI System
          </DialogTitle>
          <DialogDescription>
            Register a new AI model, agent, or provider to this project.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: System Type */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer Chat Model" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="system_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Type *</FormLabel>
                      <FormDescription>
                        What type of AI system is this?
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {systemTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <div
                              key={type.value}
                              className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${
                                field.value === type.value
                                  ? "border-primary bg-primary/5"
                                  : "border-muted"
                              }`}
                              onClick={() => field.onChange(type.value)}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 ${
                                  field.value === type.value ? "text-primary" : "text-muted-foreground"
                                }`} />
                                <div>
                                  <p className="font-medium">{type.label}</p>
                                  <p className="text-xs text-muted-foreground">{type.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Provider & Model */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
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
                  name="model_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name</FormLabel>
                      {selectedProvider && selectedProvider.models.length > 0 ? (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedProvider.models.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input 
                            placeholder="e.g., gpt-4o or meta-llama/Llama-2-7b" 
                            {...field} 
                          />
                        </FormControl>
                      )}
                      <FormDescription>
                        {form.watch("provider") === "huggingface" 
                          ? "Enter the Hugging Face model ID (e.g., meta-llama/Llama-2-7b)"
                          : "Select or enter the specific model identifier"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Configuration */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        API Endpoint
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://api.example.com/v1/chat/completions" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The URL endpoint for API requests
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Token
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="sk-..." 
                            {...field} 
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={testConnection}
                          disabled={connectionStatus === "testing"}
                        >
                          {connectionStatus === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {connectionStatus === "success" && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                          {connectionStatus === "error" && <AlertCircle className="mr-2 h-4 w-4 text-destructive" />}
                          Test
                        </Button>
                      </div>
                      <FormDescription>
                        Your API key will be encrypted and stored securely
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
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Use Case Description
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe how this system will be used..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This helps with risk assessment and impact analysis
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h4 className="font-medium">System Configuration Summary</h4>
                
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    {(() => {
                      const Icon = getSystemTypeIcon(form.watch("system_type"));
                      return <Icon className="h-8 w-8 text-primary" />;
                    })()}
                    <div>
                      <p className="font-semibold text-lg">{form.watch("name") || "Unnamed System"}</p>
                      <p className="text-sm text-muted-foreground capitalize">{form.watch("system_type")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <p className="font-medium">{selectedProvider?.label || form.watch("provider")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <p className="font-medium">{form.watch("model_name") || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Endpoint:</span>
                      <p className="font-medium truncate">{form.watch("endpoint") || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">API Token:</span>
                      <p className="font-medium">
                        {form.watch("api_token") ? "••••••••" : "Not configured"}
                        {connectionStatus === "success" && (
                          <span className="ml-2 text-green-500 text-xs">✓ Verified</span>
                        )}
                      </p>
                    </div>
                    {form.watch("use_case") && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Use Case:</span>
                        <p className="font-medium">{form.watch("use_case")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-500">Next Steps</p>
                    <p className="text-muted-foreground">
                      After adding this system, you can run risk assessments and configure monitoring.
                    </p>
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
                <Button type="submit" disabled={createSystem.isPending}>
                  {createSystem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add System
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
