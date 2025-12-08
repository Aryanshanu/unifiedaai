import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, TestTube, Trash2 } from "lucide-react";
import { useCreateEvaluationSuite } from "@/hooks/useEvaluations";
import { toast } from "sonner";

interface TestCase {
  id: string;
  prompt: string;
  engine: string;
  expected_behavior: string;
}

const engineOptions = [
  { id: 'fairness', label: 'Fairness' },
  { id: 'toxicity', label: 'Toxicity' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'hallucination', label: 'Hallucination' },
  { id: 'explainability', label: 'Explainability' },
];

export function EvaluationSuiteForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEngines, setSelectedEngines] = useState<string[]>(['fairness', 'toxicity']);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: '1', prompt: '', engine: 'fairness', expected_behavior: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSuite = useCreateEvaluationSuite();

  const handleEngineToggle = (engineId: string) => {
    setSelectedEngines(prev => 
      prev.includes(engineId) 
        ? prev.filter(e => e !== engineId)
        : [...prev, engineId]
    );
  };

  const addTestCase = () => {
    setTestCases(prev => [...prev, {
      id: crypto.randomUUID(),
      prompt: '',
      engine: selectedEngines[0] || 'fairness',
      expected_behavior: '',
    }]);
  };

  const removeTestCase = (id: string) => {
    setTestCases(prev => prev.filter(tc => tc.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    ));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Suite name is required');
      return;
    }
    if (selectedEngines.length === 0) {
      toast.error('Select at least one engine');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSuite.mutateAsync({
        name,
        description,
        test_count: testCases.filter(tc => tc.prompt.trim()).length,
      });

      toast.success('Evaluation suite created');
      setIsOpen(false);
      setName("");
      setDescription("");
      setTestCases([{ id: '1', prompt: '', engine: 'fairness', expected_behavior: '' }]);
    } catch (error: any) {
      toast.error('Failed to create suite: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Suite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-primary" />
            Create Evaluation Suite
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Suite Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production Safety Suite"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive safety evaluation for production deployment..."
                rows={2}
              />
            </div>
          </div>
          
          {/* Engine Selection */}
          <div className="grid gap-3">
            <Label>Target Engines</Label>
            <div className="flex flex-wrap gap-2">
              {engineOptions.map((engine) => (
                <div
                  key={engine.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedEngines.includes(engine.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleEngineToggle(engine.id)}
                >
                  <Checkbox
                    checked={selectedEngines.includes(engine.id)}
                    onCheckedChange={() => handleEngineToggle(engine.id)}
                  />
                  <span className="text-sm">{engine.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Test Cases */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Test Cases</Label>
              <Button variant="ghost" size="sm" onClick={addTestCase}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-3">
              {testCases.map((testCase, index) => (
                <div key={testCase.id} className="p-4 rounded-lg border border-border bg-secondary/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Test Case {index + 1}</span>
                    {testCases.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="iconSm" 
                        onClick={() => removeTestCase(testCase.id)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label className="text-xs">Test Prompt</Label>
                      <Textarea
                        value={testCase.prompt}
                        onChange={(e) => updateTestCase(testCase.id, 'prompt', e.target.value)}
                        placeholder="Enter test prompt..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label className="text-xs">Engine</Label>
                        <select
                          value={testCase.engine}
                          onChange={(e) => updateTestCase(testCase.id, 'engine', e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {engineOptions.map(e => (
                            <option key={e.id} value={e.id}>{e.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label className="text-xs">Expected Behavior</Label>
                        <Input
                          value={testCase.expected_behavior}
                          onChange={(e) => updateTestCase(testCase.id, 'expected_behavior', e.target.value)}
                          placeholder="Should pass / Should flag..."
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {testCases.filter(tc => tc.prompt.trim()).length} test cases
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Create Suite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
