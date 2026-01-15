import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, Loader2, Play, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DQFileUploaderProps {
  onDatasetCreated: (datasetId: string, datasetName: string) => void;
  onRunPipeline: (datasetId: string) => void;
  isRunning?: boolean;
}

interface ParsedData {
  rowCount: number;
  columns: string[];
  sampleRows: Record<string, unknown>[];
}

export function DQFileUploader({ onDatasetCreated, onRunPipeline, isRunning }: DQFileUploaderProps) {
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [pastedData, setPastedData] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [createdDatasetId, setCreatedDatasetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseData = useCallback((content: string, fileName?: string): ParsedData | null => {
    try {
      // Try JSON first
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const columns = Object.keys(parsed[0]);
        return {
          rowCount: parsed.length,
          columns,
          sampleRows: parsed.slice(0, 10)
        };
      }
    } catch {
      // Try CSV
      const lines = content.trim().split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const rows: Record<string, unknown>[] = [];
        for (let i = 1; i < Math.min(lines.length, 11); i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const row: Record<string, unknown> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || null;
          });
          rows.push(row);
        }
        return {
          rowCount: lines.length - 1,
          columns: headers,
          sampleRows: rows
        };
      }
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB.');
      return;
    }

    const allowedTypes = ['application/json', 'text/csv', 'text/plain', 'application/vnd.ms-excel'];
    const allowedExtensions = ['.json', '.csv', '.txt', '.xlsx'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      toast.error('Invalid file type. Please upload CSV, JSON, or XLSX files.');
      return;
    }

    setSelectedFile(file);
    if (!datasetName) {
      setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Parse file content
    try {
      const content = await file.text();
      const parsed = parseData(content, file.name);
      if (parsed) {
        setParsedData(parsed);
        toast.success(`Parsed ${parsed.rowCount} rows with ${parsed.columns.length} columns`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
    }
  }, [datasetName, parseData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePastedDataChange = useCallback((value: string) => {
    setPastedData(value);
    if (value.trim()) {
      const parsed = parseData(value);
      setParsedData(parsed);
    } else {
      setParsedData(null);
    }
  }, [parseData]);

  const handleCreateAndRun = async () => {
    if (!datasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    if (!selectedFile && !pastedData.trim()) {
      toast.error('Please upload a file or paste sample data');
      return;
    }

    setIsUploading(true);
    try {
      // Create dataset record
      const { data: dataset, error } = await supabase
        .from('datasets')
        .insert({
          name: datasetName.trim(),
          description: datasetDescription.trim() || null,
          source: selectedFile ? 'file_upload' : 'manual_entry',
          row_count: parsedData?.rowCount || null,
          data_types: parsedData?.columns || null,
          consent_status: 'pending',
          environment: 'development'
        })
        .select()
        .single();

      if (error) throw error;

      // If we have sample rows, insert them into bronze_data
      if (parsedData?.sampleRows && parsedData.sampleRows.length > 0) {
        const bronzeRecords = parsedData.sampleRows.map((row, idx) => ({
          upload_id: dataset.id, // Using dataset id as upload reference
          row_index: idx,
          raw_data: row
        }));

        // First create a data_upload record
        const { data: upload } = await supabase
          .from('data_uploads')
          .insert({
            file_name: selectedFile?.name || `${datasetName}_manual.json`,
            file_path: `/uploads/${dataset.id}`,
            status: 'completed',
            parsed_row_count: parsedData.rowCount,
            parsed_column_count: parsedData.columns.length,
            quality_score: null
          })
          .select()
          .single();

        if (upload) {
          const bronzeData = parsedData.sampleRows.map((row, idx) => ({
            upload_id: upload.id,
            row_index: idx,
            raw_data: row as unknown as Record<string, never>
          }));

          await supabase.from('bronze_data').insert(bronzeData);
        }
      }

      setCreatedDatasetId(dataset.id);
      toast.success('Dataset created successfully!');
      onDatasetCreated(dataset.id, dataset.name);

      // Auto-run pipeline
      setTimeout(() => {
        onRunPipeline(dataset.id);
      }, 300);

    } catch (error) {
      console.error('Error creating dataset:', error);
      toast.error('Failed to create dataset');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Create New Dataset</h3>
          </div>
          {createdDatasetId && (
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Created
            </Badge>
          )}
        </div>

        {/* Dataset Name & Description */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dataset-name">Dataset Name *</Label>
            <Input
              id="dataset-name"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g., Customer Transactions Q1 2026"
              disabled={isUploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataset-description">Description</Label>
            <Input
              id="dataset-description"
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              placeholder="Brief description of the dataset..."
              disabled={isUploading}
            />
          </div>
        </div>

        {/* File Upload Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
            selectedFile && "border-success bg-success/5"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            disabled={isUploading}
          />
          
          {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <FileText className="h-8 w-8 text-success" />
              </div>
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                  {parsedData && ` • ${parsedData.rowCount} rows • ${parsedData.columns.length} columns`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium text-muted-foreground">
                Drop file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports: CSV, JSON, XLSX (up to 50MB)
              </p>
            </>
          )}
        </div>

        {/* OR Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or paste data directly</span>
          </div>
        </div>

        {/* Paste Data Area */}
        <div className="space-y-2">
          <Label htmlFor="paste-data">Sample Data (JSON Array or CSV)</Label>
          <Textarea
            id="paste-data"
            value={pastedData}
            onChange={(e) => handlePastedDataChange(e.target.value)}
            placeholder={`[\n  {"id": 1, "name": "John", "email": "john@example.com", "age": 30},\n  {"id": 2, "name": "Jane", "email": null, "age": 25}\n]`}
            className="font-mono text-sm min-h-[120px]"
            disabled={isUploading || !!selectedFile}
          />
          <p className="text-xs text-muted-foreground">
            Paste JSON array or CSV with headers. This data will be used for profiling and rule generation.
          </p>
        </div>

        {/* Parsed Data Preview */}
        {parsedData && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Data Preview</span>
              <Badge variant="secondary">
                {parsedData.rowCount} rows × {parsedData.columns.length} columns
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedData.columns.slice(0, 10).map((col) => (
                <Badge key={col} variant="outline" className="text-xs">
                  {col}
                </Badge>
              ))}
              {parsedData.columns.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{parsedData.columns.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleCreateAndRun}
            disabled={isUploading || isRunning || !datasetName.trim() || (!selectedFile && !pastedData.trim())}
            className="gap-2"
          >
            {isUploading || isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isUploading ? 'Creating...' : 'Running Pipeline...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Create & Run Pipeline
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
