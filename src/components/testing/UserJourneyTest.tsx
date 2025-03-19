import React, { useState, useRef } from 'react';
import { runUserJourneyTest } from '@/tests/userJourneyTest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, Copy, Play, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface ErrorLog {
  step: string;
  source: "API" | "Database" | "Client";
  message: string;
  timestamp: Date;
  details?: any;
}

interface SuccessLog {
  step: string;
  message: string;
  timestamp: Date;
  details?: any;
}

interface TestResults {
  startTime: Date;
  endTime: Date | null;
  errors: ErrorLog[];
  successes: SuccessLog[];
  completed: boolean;
}

const UserJourneyTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("visual");
  const copyableTextRef = useRef<HTMLPreElement>(null);

  const runTest = async () => {
    setIsRunning(true);
    setResults(null);
    setExpandedLogs({});
    
    try {
      const testResults = await runUserJourneyTest();
      setResults(testResults);
    } catch (error) {
      console.error("Error running test:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleLogExpansion = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDuration = () => {
    if (!results?.startTime || !results?.endTime) return "N/A";
    const duration = results.endTime.getTime() - results.startTime.getTime();
    return `${(duration / 1000).toFixed(2)} seconds`;
  };

  const copyLogsToClipboard = () => {
    if (!copyableTextRef.current) return;
    
    const text = copyableTextRef.current.innerText;
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Logs copied to clipboard"))
      .catch(() => toast.error("Failed to copy logs"));
  };

  const generateCopyableText = () => {
    if (!results) return "";
    
    const logEntries = [...results.successes, ...results.errors]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let text = `USER JOURNEY TEST RESULTS\n`;
    text += `==============================\n`;
    text += `Start time: ${results.startTime.toLocaleString()}\n`;
    text += `End time: ${results.endTime?.toLocaleString() || 'N/A'}\n`;
    text += `Duration: ${formatDuration()}\n`;
    text += `Status: ${results.completed ? 'PASSED ✅' : 'FAILED ❌'}\n`;
    text += `Success steps: ${results.successes.length}\n`;
    text += `Error steps: ${results.errors.length}\n\n`;
    text += `DETAILED LOGS:\n`;
    text += `==============================\n\n`;
    
    logEntries.forEach((log, index) => {
      const isError = 'source' in log;
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      
      text += `[${timestamp}] ${isError ? '❌ ERROR' : '✅ SUCCESS'}: ${log.step}\n`;
      if (isError) {
        text += `  Source: ${(log as ErrorLog).source}\n`;
      }
      text += `  Message: ${log.message}\n`;
      
      if (log.details) {
        text += `  Details: ${JSON.stringify(log.details, null, 2)}\n`;
      }
      text += `\n`;
    });
    
    return text;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Complete User Journey Test</span>
          {results && (
            <Badge 
              variant={results.completed ? "success" : "destructive"}
              className={results.completed ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {results.completed ? "Passed" : "Failed"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Tests the complete user flow from artist search to song selection, adding to setlist, and voting
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!results && !isRunning && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground mb-5">Click the button below to run the user journey test</p>
            <Button onClick={runTest} className="mx-auto" size="lg">
              <Play className="mr-2 h-4 w-4" />
              Run Test
            </Button>
          </div>
        )}
        
        {isRunning && (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Running test...</p>
            <p className="text-muted-foreground mt-2">This may take a few moments</p>
          </div>
        )}
        
        {results && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <Clock className="mr-2 h-4 w-4" />
                  Duration
                </div>
                <p className="text-xl font-medium">{formatDuration()}</p>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Success Steps
                </div>
                <p className="text-xl font-medium">{results.successes.length}</p>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                  Error Steps
                </div>
                <p className="text-xl font-medium">{results.errors.length}</p>
              </div>
            </div>
            
            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Test Failed</AlertTitle>
                <AlertDescription>
                  {results.errors.length} errors encountered during the test
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="visual" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual">Visual Log</TabsTrigger>
                <TabsTrigger value="copyable">Copyable Log</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visual" className="mt-4">
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4 space-y-4">
                    {[...results.successes, ...results.errors]
                      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                      .map((log, index) => {
                        const isError = 'source' in log;
                        const logId = `log-${index}`;
                        const isExpanded = expandedLogs[logId] || false;
                        
                        return (
                          <div 
                            key={logId}
                            className={`rounded-lg p-4 ${isError ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}
                          >
                            <div 
                              className="flex items-start justify-between cursor-pointer"
                              onClick={() => toggleLogExpansion(logId)}
                            >
                              <div>
                                <div className="flex items-center">
                                  {isError ? (
                                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                  )}
                                  <span className="font-medium">
                                    {log.step}
                                  </span>
                                  {isError && (
                                    <Badge 
                                      variant="outline"
                                      className="ml-2 text-red-500 border-red-500/50"
                                    >
                                      {(log as ErrorLog).source}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm mt-1 text-muted-foreground">{log.message}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            
                            {isExpanded && log.details && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="copyable" className="mt-4">
                <div className="relative">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="absolute right-2 top-2 z-10"
                    onClick={copyLogsToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <ScrollArea className="h-[400px] rounded-md border bg-muted">
                    <pre 
                      ref={copyableTextRef}
                      className="p-4 text-xs font-mono whitespace-pre-wrap"
                    >
                      {generateCopyableText()}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline" 
          onClick={() => {
            setResults(null);
            setExpandedLogs({});
          }}
          disabled={!results || isRunning}
        >
          Clear Results
        </Button>
        
        <Button 
          onClick={runTest} 
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {results ? 'Run Again' : 'Run Test'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserJourneyTest;
