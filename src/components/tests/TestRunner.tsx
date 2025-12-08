import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  RefreshCw,
  Wrench,
  Clock,
  Zap
} from 'lucide-react';
import { runAllTests, ALL_TESTS } from '@/tests/e2e/full-regression.test';
import { TestResult, TestSuiteResult, TEST_CATEGORIES } from '@/tests/fixtures/expected-data';
import { cn } from '@/lib/utils';

interface TestRunnerProps {
  autoRun?: boolean;
}

export function TestRunner({ autoRun = true }: TestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [suiteResult, setSuiteResult] = useState<TestSuiteResult | null>(null);
  const [currentTest, setCurrentTest] = useState<number>(0);
  const [enableHealing, setEnableHealing] = useState(true);

  const handleProgress = useCallback((result: TestResult) => {
    setResults(prev => [...prev, result]);
    setCurrentTest(result.id);
  }, []);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setSuiteResult(null);
    setCurrentTest(0);

    try {
      const result = await runAllTests(handleProgress, enableHealing);
      setSuiteResult(result);
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, [handleProgress, enableHealing]);

  useEffect(() => {
    if (autoRun) {
      const timer = setTimeout(runTests, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoRun, runTests]);

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const healedCount = results.filter(r => r.healingSucceeded).length;
  const progress = (results.length / ALL_TESTS.length) * 100;

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const consoleOutput = `🚀 FRACTAL RAI-OS AUTOMATED TEST SUITE - DECEMBER 2025
═══════════════════════════════════════════════════════
Running ${ALL_TESTS.length} tests...

${results.map(r => `${r.passed ? '✅' : '❌'} Test ${r.id}: ${r.name}${r.error ? `\n   └─ Error: ${r.error}` : ''}`).join('\n')}

${suiteResult ? `═══════════════════════════════════════════════════════
📊 RESULTS: ${passedCount}/${results.length} passed, ${failedCount} failed, ${healedCount} healed
⏱️  Duration: ${(suiteResult.duration / 1000).toFixed(2)}s

${suiteResult.verdict === 'PASS' 
  ? '🎉 FRACTAL RAI-OS: 100% FUNCTIONAL. ALL 42 TESTS PASSED. THE GAP DOCUMENT IS DEAD.' 
  : '❌ FRACTAL RAI-OS REGRESSION FAILURE'}` : ''}`;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-auto">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="border-2 border-primary/20">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Zap className="w-8 h-8 text-primary" />
                Fractal RAI-OS Test Suite
              </CardTitle>
              <Badge variant="outline" className="text-sm">
                December 2025
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{passedCount} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium">{failedCount} Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium">{healedCount} Healed</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {suiteResult ? `${(suiteResult.duration / 1000).toFixed(2)}s` : 'Running...'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {isRunning ? `Running test ${currentTest}/${ALL_TESTS.length}...` : 'Complete'}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {suiteResult && (
              <div className={cn(
                "p-4 rounded-lg text-center font-bold text-lg",
                suiteResult.verdict === 'PASS' 
                  ? "bg-green-500/20 text-green-500 border border-green-500/30" 
                  : "bg-red-500/20 text-red-500 border border-red-500/30"
              )}>
                {suiteResult.verdict === 'PASS' 
                  ? "🎉 FRACTAL RAI-OS: 100% FUNCTIONAL — DEC 2025" 
                  : `❌ ${failedCount} TESTS FAILED — AUTO-HEALING ATTEMPTED`}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run All Tests
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEnableHealing(!enableHealing)}
                className="gap-2"
              >
                <Wrench className="w-4 h-4" />
                Auto-Heal: {enableHealing ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {Object.entries(groupedResults).map(([category, categoryResults]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {categoryResults.map((result) => (
                        <div 
                          key={result.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md text-sm",
                            result.passed 
                              ? "bg-green-500/10" 
                              : "bg-red-500/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {result.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className={cn(
                              result.passed ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                            )}>
                              {result.id}. {result.name}
                            </span>
                            {result.healingSucceeded && (
                              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600/30">
                                <Wrench className="w-3 h-3 mr-1" />
                                Healed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {result.duration && <span>{result.duration}ms</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {results.length === 0 && !isRunning && (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Run All Tests" to start the test suite</p>
                  </div>
                )}

                {isRunning && results.length === 0 && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Initializing test suite...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="mt-4 border border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-mono">Console Output</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="bg-muted/50 p-4 text-xs font-mono overflow-auto max-h-[200px] text-muted-foreground">
              {consoleOutput}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TestRunnerOverlay() {
  const [showRunner, setShowRunner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === '1') {
      setShowRunner(true);
    }
  }, []);

  if (!showRunner) return null;

  return <TestRunner autoRun={true} />;
}

export default TestRunner;
