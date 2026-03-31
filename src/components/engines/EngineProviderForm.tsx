import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { Loader2, Check, ExternalLink } from "lucide-react";

const modelSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  model_type: z.string().min(1, "Please select a model type"),
  huggingface_model_id: z.string().min(1, "Hugging Face Model ID is required"),
  huggingface_endpoint: z.string().url("Please enter a valid endpoint URL"),
  huggingface_api_token: z.string().min(1, "API token is required"),
  project_id: z.string().min(1, "Please select a project"),
});

type ModelFormData = z.infer<typeof modelSchema>;

interface HuggingFaceModelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const modelTypes = [
  { value: "text-generation", label: "Text Generation" },
  { value: "text-classification", label: "Text Classification" },
  { value: "sentiment-analysis", label: "Sentiment Analysis" },
  { value: "question-answering", label: "Question Answering" },
  { value: "summarization", label: "Summarization" },
  { value: "translation", label: "Translation" },
  { value: "embeddings", label: "Embeddings" },
  { value: "other-llm", label: "Other LLM" },
];

const steps = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Hugging Face Config" },
  { id: 3, title: "API Token" },
  { id: 4, title: "Review" },
];

export function HuggingFaceModelForm({ open, onOpenChange }: HuggingFaceModelFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: projects } = useProjects();

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: "",
      description: "",
      model_type: "",
      huggingface_model_id: "",
      huggingface_endpoint: "",
      huggingface_api_token: "",
      project_id: "",
    },
  });

  const onSubmit = async (data: ModelFormData) => {
    setIsSubmitting(true);
    try {
      // Step 1: Create the System first (transactional pattern)
      const { data: systemData, error: systemError } = await supabase
        .from("systems")
        .insert({
          project_id: data.project_id,
          name: data.name,
          provider: "Hugging Face",
          system_type: "model",
          model_name: data.huggingface_model_id,
          endpoint: data.huggingface_endpoint,
          api_token_encrypted: data.huggingface_api_token,
          status: "draft",
          deployment_status: "draft",
          owner_id: user?.id,
        })
        .select()
        .single();

      if (systemError) throw systemError;

      // Step 2: Create the Model linked to the System
      const { error: modelError } = await supabase.from("models").insert({
        name: data.name,
        description: data.description || null,
        model_type: data.model_type,
        huggingface_model_id: data.huggingface_model_id,
        huggingface_endpoint: data.huggingface_endpoint,
        huggingface_api_token: data.huggingface_api_token,
        provider: "huggingface",
        owner_id: user?.id,
        status: "draft",
        project_id: data.project_id,
        system_id: systemData.id,
      });

      if (modelError) {
        // Rollback: delete the system if model creation fails
        await supabase.from("systems").delete().eq("id", systemData.id);
        throw modelError;
      }

      toast({
        title: "Model Registered",
        description: "Your Hugging Face model has been registered successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      form.reset();
      setCurrentStep(1);
      setConnectionTested(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register model",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const testConnection = async () => {
    const endpoint = form.getValues("huggingface_endpoint");
    const token = form.getValues("huggingface_api_token");

    if (!endpoint || !token) {
      toast({
        title: "Missing Information",
        description: "Please enter both endpoint URL and API token",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: "Test connection" }),
      });

      if (response.ok || response.status === 503) {
        // 503 means model is loading, which is still a valid connection
        setConnectionTested(true);
        toast({
          title: "Connection Successful",
          description: response.status === 503 
            ? "Model endpoint is valid but model is still loading" 
            : "Successfully connected to Hugging Face endpoint",
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to the endpoint",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof ModelFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ["name", "model_type", "project_id"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["huggingface_model_id", "huggingface_endpoint"];
    } else if (currentStep === 3) {
      fieldsToValidate = ["huggingface_api_token"];
    }

    const result = await form.trigger(fieldsToValidate);
    if (result) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Hugging Face Model</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The project this model belongs to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., My LLaMA Model" {...field} />
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
                          placeholder="Brief description of your model..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modelTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 2: Hugging Face Config */}
            {currentStep === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="huggingface_model_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hugging Face Model ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., meta-llama/Llama-2-7b-chat-hf" {...field} />
                      </FormControl>
                      <FormDescription>
                        The model identifier from Hugging Face Hub
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="huggingface_endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inference Endpoint URL *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://api-inference.huggingface.co/models/..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="flex items-center gap-1">
                        Your Hugging Face Inference API endpoint
                        <a 
                          href="https://huggingface.co/inference-endpoints" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 3: API Token */}
            {currentStep === 3 && (
              <>
                <FormField
                  control={form.control}
                  name="huggingface_api_token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hugging Face API Token *</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="hf_..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="flex items-center gap-1">
                        Get your token from
                        <a 
                          href="https://huggingface.co/settings/tokens" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          Hugging Face Settings
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="w-full"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : connectionTested ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Connection Verified
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Review Your Model</h3>
                <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{form.getValues("name")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {modelTypes.find(t => t.value === form.getValues("model_type"))?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model ID:</span>
                    <span className="font-medium font-mono text-xs">
                      {form.getValues("huggingface_model_id")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <span className="font-medium font-mono text-xs truncate max-w-[200px]">
                      {form.getValues("huggingface_endpoint")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Token:</span>
                    <span className="font-medium">••••••••</span>
                  </div>
                </div>
                {form.getValues("description") && (
                  <div>
                    <span className="text-muted-foreground text-sm">Description:</span>
                    <p className="text-sm mt-1">{form.getValues("description")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t border-border">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register Model"
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
