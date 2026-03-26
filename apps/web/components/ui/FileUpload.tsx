"use client";

import { useCallback, useState, type DragEvent } from "react";
import { Upload, File, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

type UploadState = "idle" | "dragover" | "error";

export function FileUpload({
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSizeMB = 10,
  multiple = false,
  onFilesSelected,
  className,
  disabled = false,
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (fileList: FileList): File[] => {
      const valid: File[] = [];
      const maxBytes = maxSizeMB * 1024 * 1024;

      for (const file of Array.from(fileList)) {
        if (file.size > maxBytes) {
          setError(`${file.name} exceeds ${maxSizeMB}MB limit`);
          setState("error");
          return [];
        }
        valid.push(file);
      }

      setError(null);
      setState("idle");
      return valid;
    },
    [maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;

      const validated = validateFiles(e.dataTransfer.files);
      if (validated.length > 0) {
        const updated = multiple ? [...files, ...validated] : validated;
        setFiles(updated);
        onFilesSelected(updated);
      }
    },
    [disabled, files, multiple, onFilesSelected, validateFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || disabled) return;

      const validated = validateFiles(e.target.files);
      if (validated.length > 0) {
        const updated = multiple ? [...files, ...validated] : validated;
        setFiles(updated);
        onFilesSelected(updated);
      }
    },
    [disabled, files, multiple, onFilesSelected, validateFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      setFiles(updated);
      onFilesSelected(updated);
    },
    [files, onFilesSelected]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setState("dragover");
        }}
        onDragLeave={() => setState(error ? "error" : "idle")}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          state === "dragover" && "border-primary bg-primary/5",
          state === "error" && "border-danger bg-danger/5",
          state === "idle" && "border-border hover:border-text-tertiary",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {state === "error" ? (
          <AlertCircle className="mb-3 h-8 w-8 text-danger" />
        ) : (
          <Upload className="mb-3 h-8 w-8 text-text-tertiary" />
        )}
        <p className="mb-1 text-sm font-medium text-text-primary">
          {state === "dragover"
            ? "Drop files here"
            : "Drag and drop files here"}
        </p>
        <p className="mb-3 text-xs text-text-tertiary">
          or click to browse (max {maxSizeMB}MB)
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
            >
              <File className="h-4 w-4 shrink-0 text-text-tertiary" />
              <span className="flex-1 truncate text-sm text-text-primary">
                {file.name}
              </span>
              <span className="text-xs text-text-tertiary">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-3 hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
