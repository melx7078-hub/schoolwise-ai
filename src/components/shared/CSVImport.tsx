import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CSVImportProps {
  type: "students" | "teachers";
  schoolId: string;
  classId?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ValidationError[];
}

const REQUIRED_FIELDS = {
  students: ["full_name", "email"],
  teachers: ["full_name", "email"],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CSVImport({ type, schoolId, classId, onSuccess, onClose }: CSVImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  };

  const validateData = (data: Record<string, string>[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const requiredFields = REQUIRED_FIELDS[type];
    const seenEmails = new Set<string>();

    data.forEach((row, index) => {
      // Check required fields
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].trim() === "") {
          errors.push({
            row: index + 2, // +2 for header row and 0-indexing
            field,
            message: `${field.replace("_", " ")} is required`,
          });
        }
      });

      // Validate email format
      if (row.email && !EMAIL_REGEX.test(row.email)) {
        errors.push({
          row: index + 2,
          field: "email",
          message: "Invalid email format",
        });
      }

      // Check for duplicate emails
      if (row.email) {
        if (seenEmails.has(row.email.toLowerCase())) {
          errors.push({
            row: index + 2,
            field: "email",
            message: "Duplicate email in file",
          });
        }
        seenEmails.add(row.email.toLowerCase());
      }

      // Validate name length
      if (row.full_name && row.full_name.length > 100) {
        errors.push({
          row: index + 2,
          field: "full_name",
          message: "Name too long (max 100 characters)",
        });
      }
    });

    return errors;
  };

  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const data = parseCSV(content);
      setParsedData(data);
      const errors = validateData(data);
      setValidationErrors(errors);
    };
    reader.readAsText(selectedFile);
  }, [type]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file || validationErrors.length > 0) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("import-csv", {
        body: {
          type,
          schoolId,
          classId,
          data: parsedData,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Import failed");
      }

      const importResult = response.data as ImportResult;
      setResult(importResult);
      setProgress(100);

      if (importResult.success > 0) {
        toast.success(`Successfully imported ${importResult.success} ${type}`);
        onSuccess?.();
      }

      if (importResult.failed > 0) {
        toast.warning(`${importResult.failed} rows failed to import`);
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import data");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers =
      type === "students"
        ? "full_name,email,date_of_birth,gender,address,emergency_contact"
        : "full_name,email,phone,specialization";
    const example =
      type === "students"
        ? "\nJohn Doe,john@example.com,2010-05-15,male,123 Main St,+237123456789"
        : "\nJane Smith,jane@example.com,+237987654321,Mathematics";

    const blob = new Blob([headers + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="capitalize">Import {type}</CardTitle>
          <CardDescription>
            Upload a CSV file to bulk import {type}
          </CardDescription>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Download */}
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="mb-4"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>

        {/* Drop Zone */}
        {!file && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">Drop your CSV file here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse (max 5MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* File Preview */}
        {file && !result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} rows found
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetUpload}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-destructive">
                    {validationErrors.length} validation error(s) found
                  </span>
                </div>
                <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {validationErrors.slice(0, 10).map((error, i) => (
                    <li key={i} className="text-destructive/80">
                      Row {error.row}: {error.message} ({error.field})
                    </li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="text-destructive/60">
                      ...and {validationErrors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetUpload}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || validationErrors.length > 0}
                className="flex-1"
              >
                {isUploading ? "Uploading..." : `Import ${parsedData.length} ${type}`}
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium text-success">
                  Import Complete
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p>✓ {result.success} {type} imported successfully</p>
                {result.failed > 0 && (
                  <p className="text-destructive">
                    ✗ {result.failed} rows failed
                  </p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="font-medium text-destructive mb-2">
                  Failed Rows:
                </p>
                <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((error, i) => (
                    <li key={i} className="text-destructive/80">
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={resetUpload} className="w-full">
              Import More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
