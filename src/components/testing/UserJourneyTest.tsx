import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { runUserJourneyTest } from '@/tests/userJourneyTest';
import { ErrorLog, SuccessLog, TestResults } from '@/tests/journey/types';
import { TEST_ARTIST_ID, TEST_ARTIST_NAME } from '@/tests/journey/config';

interface UserJourneyTestProps {
  customArtistId?: string;
  customArtistName?: string;
}

const UserJourneyTest: React.FC<UserJourneyTestProps> = ({ 
  customArtistId,
  customArtistName
}) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const artistId = customArtistId || TEST_ARTIST_ID;
  const artistName = customArtistName || TEST_ARTIST_NAME;

  const runTest = async () => {
    try {
      setLoading(true);
      setResults(null);
      toast.info(`Starting test with artist: ${artistName}`);
      
      const testResults = await runUserJourneyTest(artistId, artistName);
      setResults(testResults);
      
      if (testResults.completed) {
        toast.success("Test completed successfully!");
      } else {
        toast.error("Test failed. See details for more information.");
      }
    } catch (error) {
      console.error("Error running test:", error);
      toast.error("An unexpected error occurred while running the test");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetTest = () => {
    setResults(null);
    setExpanded({});
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Journey Test</span>
            {results && (
              <Badge variant={results.completed ? "default" : "destructive"}>
                {results.completed ? "PASSED" : "FAILED"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <h3 className="text-sm font-medium mb-2">Test Configuration</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Artist ID:</span>
              </div>
              <div>{artistId}</div>
              <div>
                <span className="text-muted-foreground">Artist Name:</span>
              </div>
              <div>{artistName}</div>
            </div>
          </div>
          
          {!results ? (
            <div className="flex justify-center">
              <Button 
                onClick={runTest} 
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                {loading ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Test
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <h3 className="text-sm font-medium mb-2">Test Results</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start time:</span>
                    </div>
                    <div>{results.startTime.toLocaleString()}</div>
                    
                    <div>
                      <span className="text-muted-foreground">End time:</span>
                    </div>
                    <div>{results.endTime?.toLocaleString()}</div>
                    
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                    </div>
                    <div>
                      {results.endTime 
                        ? `${((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(2)} seconds` 
                        : 'N/A'}
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Success steps:</span>
                    </div>
                    <div>{results.successes.length}</div>
                    
                    <div>
                      <span className="text-muted-foreground">Error steps:</span>
                    </div>
                    <div>{results.errors.length}</div>
                    
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                    </div>
                    <div>
                      {results.completed ? (
                        <span className="text-green-600 font-medium">PASSED ✓</span>
                      ) : (
                        <span className="text-red-600 font-medium">FAILED ❌</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {results.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Test Failed</AlertTitle>
                    <AlertDescription>
                      {results.errors.length} errors encountered during the test.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="font-medium">Detailed Logs:</h3>
                  
                  {/* Success Logs */}
                  {results.successes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-green-600">Success Steps:</h4>
                      {results.successes.map((success: SuccessLog, index: number) => (
                        <div 
                          key={`success-${index}`}
                          className="rounded-md border border-green-200 bg-green-50 p-3"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">{success.step}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(success.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{success.message}</p>
                              
                              {success.details && (
                                <div className="mt-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => toggleExpand(`success-${index}`)}
                                    className="text-xs h-7 px-2"
                                  >
                                    {expanded[`success-${index}`] ? 'Hide' : 'Show'} Details
                                  </Button>
                                  
                                  {expanded[`success-${index}`] && (
                                    <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-auto">
                                      {JSON.stringify(success.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Error Logs */}
                  {results.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-red-600">Error Steps:</h4>
                      {results.errors.map((error: ErrorLog, index: number) => (
                        <div 
                          key={`error-${index}`}
                          className="rounded-md border border-red-200 bg-red-50 p-3"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">{error.step}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                                {error.source}
                              </span>
                              <p className="text-sm mt-1">{error.message}</p>
                              
                              {error.details && (
                                <div className="mt-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => toggleExpand(`error-${index}`)}
                                    className="text-xs h-7 px-2"
                                  >
                                    {expanded[`error-${index}`] ? 'Hide' : 'Show'} Details
                                  </Button>
                                  
                                  {expanded[`error-${index}`] && (
                                    <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-auto">
                                      {JSON.stringify(error.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
        {results && (
          <CardFooter className="flex justify-center">
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetTest}>
                Reset Test
              </Button>
              <Button onClick={runTest} disabled={loading}>
                {loading ? 'Running...' : 'Run Again'}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default UserJourneyTest;
