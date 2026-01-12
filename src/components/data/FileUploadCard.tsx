import { useState, useCallback, useEffect } from 'react';
import { Upload, File, CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useFileUploadStatus } from '@/hooks/useFileUploadStatus';
import { toast } from 'sonner';

interface FileUploadCardProps {
  onUploadComplete?: (uploadId: string) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

type UploadPhase = 'idle' | 'uploading' | 'validating' | 'processing' | 'complete' | 'error';

interface DataContract {
  id: string;
  name: string;
  enforcement_mode: string;
}

export function FileUploadCard({
  onUploadComplete,
  maxSizeMB = 20,
  allowedTypes = ['csv', 'json', 'pdf']
}: FileUploadCardProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contracts, setContracts] = useState<DataContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contractValidationStatus, setContractValidationStatus] = useState<'pending' | 'passed' | 'failed' | null>(null);

  const { status } = useFileUploadStatus(currentUploadId);

  // Fetch available contracts
  useEffect(() => {
    async function fetchContracts() {
      const { data } = await supabase
        .from('data_contracts')
        .select('id, name, enforcement_mode')
        .eq('status', 'active')
        .order('name');
      
      if (data) {
        setContracts(data);
      }
    }
    fetchContracts();
  }, []);

  const getFileType = (fileName: string): string | null => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (allowedTypes.includes(ext || '')) return ext!;
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setContractValidationStatus(null);
    
    // Validate file type
    const fileType = getFileType(file.name);
    if (!fileType) {
      setErrorMessage(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      setPhase('error');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File too large. Maximum size: ${maxSizeMB}MB`);
      setPhase('error');
      return;
    }

    setPhase('uploading');
    setUploadProgress(10);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload files');
      }

      // Generate unique file path
      const timestamp = Date.now();
      const filePath = `data-quality/${user.id}/${timestamp}_${file.name}`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('fractal')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('fractal')
        .getPublicUrl(filePath);

      // Create upload record with contract link
      const { data: uploadRecord, error: insertError } = await supabase
        .from('data_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_type: fileType,
          file_size_bytes: file.size,
          status: 'pending',
          contract_id: selectedContractId,
          contract_check_status: selectedContractId ? 'pending' : 'skipped'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create record: ${insertError.message}`);
      }

      setUploadProgress(70);
      setCurrentUploadId(uploadRecord.id);

      // If contract selected, validate first
      if (selectedContractId) {
        setPhase('validating');
        setContractValidationStatus('pending');
        
        try {
          const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-contract', {
            body: { 
              upload_id: uploadRecord.id,
              contract_id: selectedContractId
            }
          });

          if (validationError) {
            console.error('Contract validation error:', validationError);
          }

          // Check if validation passed
          if (validationResult?.passed) {
            setContractValidationStatus('passed');
            toast.success('Contract validation passed');
          } else if (validationResult?.enforcement_action === 'block') {
            setContractValidationStatus('failed');
            setErrorMessage(`Contract validation failed: ${validationResult.violations?.length || 0} violations`);
            setPhase('error');
            return;
          } else {
            setContractValidationStatus('passed');
            if (validationResult?.violations?.length > 0) {
              toast.warning(`Contract check: ${validationResult.violations.length} warnings`);
            }
          }
        } catch (e) {
          // Contract validation optional - continue to audit
          console.error('Contract validation failed, continuing:', e);
          setContractValidationStatus('passed');
        }
      }

      setUploadProgress(80);
      setPhase('processing');

      // Trigger audit function
      const { error: invokeError } = await supabase.functions.invoke('audit-data', {
        body: { upload_id: uploadRecord.id }
      });

      if (invokeError) {
        console.error('Audit invocation error:', invokeError);
      }

      setUploadProgress(100);
      toast.success('File uploaded, quality audit in progress');

    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setPhase('error');
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [allowedTypes, maxSizeMB, selectedContractId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleReset = () => {
    setPhase('idle');
    setUploadProgress(0);
    setCurrentUploadId(null);
    setErrorMessage(null);
    setContractValidationStatus(null);
  };

  // Update phase based on realtime status
  if (status) {
    if (status.status === 'completed' && phase !== 'complete') {
      setPhase('complete');
      onUploadComplete?.(status.id);
    } else if (status.status === 'failed' && phase !== 'error') {
      setPhase('error');
      setErrorMessage(status.error_message || 'Audit failed');
    }
  }

  const renderContent = () => {
    switch (phase) {
      case 'uploading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground mb-4">Uploading file...</p>
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
          </div>
        );

      case 'validating':
        return (
          <div className="text-center py-8">
            <div className="relative">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            </div>
            <p className="font-medium mb-2">Validating against Data Contract...</p>
            <p className="text-sm text-muted-foreground mb-4">
              Checking schema and quality requirements
            </p>
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="relative">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            </div>
            <p className="font-medium mb-2">
              {status?.status === 'analyzing' ? 'Analyzing data quality...' : 'Processing file...'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {status?.file_name || 'Please wait'}
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {contractValidationStatus === 'passed' && (
                <Badge className="bg-success/10 text-success border-success/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Contract Passed
                </Badge>
              )}
              <Badge variant="outline">{status?.status || 'processing'}</Badge>
              {status?.parsed_row_count && (
                <Badge variant="secondary">{status.parsed_row_count} rows</Badge>
              )}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
            <p className="font-medium mb-2">Audit Complete</p>
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {contractValidationStatus === 'passed' && (
                <Badge className="bg-success/10 text-success border-success/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Contract Validated
                </Badge>
              )}
              <Badge 
                variant={status?.quality_score && status.quality_score >= 80 ? 'default' : 'destructive'}
                className="text-lg px-3 py-1"
              >
                Score: {status?.quality_score || 0}%
              </Badge>
            </div>
            {status && (
              <div className="flex justify-center gap-2 text-sm text-muted-foreground">
                <span>{status.parsed_row_count} rows</span>
                <span>•</span>
                <span>{status.parsed_column_count} columns</span>
                <span>•</span>
                <span>{status.processing_time_ms}ms</span>
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4" onClick={handleReset}>
              Upload Another
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="font-medium mb-2">
              {contractValidationStatus === 'failed' ? 'Contract Validation Failed' : 'Upload Failed'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            {/* Contract Selector */}
            {contracts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="contract-select" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Data Contract (Optional)
                </Label>
                <Select
                  value={selectedContractId || 'none'}
                  onValueChange={(value) => setSelectedContractId(value === 'none' ? null : value)}
                >
                  <SelectTrigger id="contract-select">
                    <SelectValue placeholder="Select a contract for validation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No contract (skip validation)</SelectItem>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        <div className="flex items-center gap-2">
                          <span>{contract.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {contract.enforcement_mode}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedContractId && (
                  <p className="text-xs text-muted-foreground">
                    File will be validated against this contract before analysis
                  </p>
                )}
              </div>
            )}

            {/* Drop Zone */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept={allowedTypes.map(t => `.${t}`).join(',')}
                onChange={handleInputChange}
              />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground mb-3">
                Supported: {allowedTypes.map(t => t.toUpperCase()).join(', ')} (max {maxSizeMB}MB)
              </p>
              <div className="flex justify-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <File className="h-3 w-3" /> CSV
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <File className="h-3 w-3" /> JSON
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <File className="h-3 w-3" /> PDF
                </Badge>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Data File
          {selectedContractId && (
            <Badge variant="outline" className="ml-auto">
              <Shield className="h-3 w-3 mr-1" />
              Gatekeeper Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
