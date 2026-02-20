"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { Upload, File, X, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";

interface UploadResult {
  key: string;
  cdnUrl: string;
  audioDuration?: number;
  originalKey?: string;
  converted?: boolean;
}

interface AdminFileUploadProps {
  label: string;
  accept?: string;
  folder?: string;
  onUploadComplete: (result: UploadResult) => void;
  currentFile?: string;
  maxSizeMB?: number;
  error?: string;
  required?: boolean;
  className?: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function AdminFileUpload({
  label,
  accept = "*/*",
  folder = "uploads",
  onUploadComplete,
  currentFile,
  maxSizeMB = 50,
  error,
  required = false,
  className,
}: AdminFileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImageAccept = accept.startsWith("image/") || accept === "image/*";

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setUploadError(`File exceeds ${maxSizeMB}MB limit`);
        setStatus("error");
        return;
      }

      // Validate file type against accept
      if (accept !== "*/*") {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const fileTypeMatch = acceptedTypes.some((accepted) => {
          if (accepted.endsWith("/*")) {
            const category = accepted.replace("/*", "");
            return file.type.startsWith(category);
          }
          return file.type === accepted || file.name.endsWith(accepted);
        });
        if (!fileTypeMatch) {
          setUploadError(`File type not accepted. Expected: ${accept}`);
          setStatus("error");
          return;
        }
      }

      const fileIsWav =
        file.name.toLowerCase().endsWith(".wav") ||
        file.type === "audio/wav" ||
        file.type === "audio/x-wav";

      setFileName(file.name);
      setUploadError(null);
      setStatus("uploading");
      setProgress(0);
      setIsConverting(fileIsWav && folder === "audio/tracks");

      // Generate image preview if applicable
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }

      // Extract audio duration if this is an audio file
      let audioDuration: number | undefined;
      if (file.type.startsWith("audio/")) {
        try {
          audioDuration = await new Promise<number>((resolve, reject) => {
            const audioEl = new Audio();
            const objectUrl = URL.createObjectURL(file);
            audioEl.addEventListener("loadedmetadata", () => {
              const dur = audioEl.duration;
              URL.revokeObjectURL(objectUrl);
              resolve(isFinite(dur) ? dur : 0);
            });
            audioEl.addEventListener("error", () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error("Could not read audio duration"));
            });
            audioEl.src = objectUrl;
          });
        } catch {
          // Duration extraction failed — continue with upload anyway
        }
      }

      try {
        // Upload via our API proxy (avoids S3 CORS issues)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const xhr = new XMLHttpRequest();

        const result = await new Promise<{
          key: string;
          cdnUrl: string;
          originalKey?: string;
          converted?: boolean;
          duration?: number;
        }>(
          (resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                setProgress(Math.round((e.loaded / e.total) * 100));
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch {
                  reject(new Error("Invalid response from server"));
                }
              } else if (xhr.status === 207) {
                // Partial success — WAV saved but conversion failed
                try {
                  const body = JSON.parse(xhr.responseText);
                  reject(new Error(body.error || "Conversion failed"));
                } catch {
                  reject(new Error("WAV conversion failed"));
                }
              } else {
                try {
                  const body = JSON.parse(xhr.responseText);
                  reject(new Error(body.error || `Upload failed (${xhr.status})`));
                } catch {
                  reject(new Error(`Upload failed with status ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener("error", () => reject(new Error("Upload failed")));
            xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

            xhr.open("POST", "/api/admin/upload");
            xhr.send(formData);
          }
        );

        // Prefer server-provided duration (from ffprobe) over client-extracted
        const finalDuration = result.duration ?? audioDuration;

        setStatus("success");
        setProgress(100);
        onUploadComplete({
          key: result.key,
          cdnUrl: result.cdnUrl,
          audioDuration: finalDuration,
          originalKey: result.originalKey,
          converted: result.converted,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        setStatus("error");
        setProgress(0);
      }
    },
    [accept, folder, maxSizeMB, onUploadComplete]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setFileName(null);
    setPreviewUrl(null);
    setUploadError(null);
    setIsConverting(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const displayError = error || uploadError;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium text-text-secondary">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer",
          "border-2 border-dashed transition-all duration-200",
          "bg-white/[0.02]",
          isDragging
            ? "border-accent/50 bg-accent/5"
            : status === "error"
              ? "border-red-400/30 hover:border-red-400/50"
              : status === "success"
                ? "border-green-400/30"
                : "border-white/10 hover:border-white/20 hover:bg-white/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Idle state */}
        {status === "idle" && !currentFile && (
          <>
            <Upload size={20} className="text-text-muted" />
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                Drop file here or{" "}
                <span className="text-accent">browse</span>
              </p>
              <p className="text-xs text-text-dim mt-1">
                {accept !== "*/*" ? accept.replace(/\*/g, "all") : "Any file"}{" "}
                &middot; Max {maxSizeMB}MB
              </p>
            </div>
          </>
        )}

        {/* Current file (no new upload yet) */}
        {status === "idle" && currentFile && (
          <div className="flex items-center gap-2">
            <File size={16} className="text-accent" />
            <span className="text-sm text-text-secondary truncate max-w-[200px]">
              {currentFile}
            </span>
            <span className="text-xs text-text-dim">(click to replace)</span>
          </div>
        )}

        {/* Uploading state */}
        {status === "uploading" && (
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2">
              <File size={16} className="text-accent shrink-0" />
              <span className="text-sm text-text-secondary truncate">
                {fileName}
              </span>
              <span className="text-xs text-text-muted ml-auto shrink-0">
                {progress >= 100 && isConverting
                  ? "Converting to MP3..."
                  : `${progress}%`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300 ease-out",
                  progress >= 100 && isConverting
                    ? "bg-accent/60 animate-pulse"
                    : "bg-accent"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Success state */}
        {status === "success" && (
          <div className="flex items-center gap-3 w-full">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-12 h-12 rounded-md object-cover border border-white/10"
              />
            ) : (
              <CheckCircle size={20} className="text-green-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{fileName}</p>
              <p className="text-xs text-green-400">Upload complete</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="p-1 rounded-md hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex items-center gap-3 w-full">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{fileName}</p>
              <p className="text-xs text-red-400">{uploadError}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="p-1 rounded-md hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Image preview for current file */}
      {status === "idle" && currentFile && isImageAccept && (
        <div className="mt-1">
          <div className="flex items-center gap-1.5 text-xs text-text-dim mb-1">
            <ImageIcon size={12} />
            <span>Current image</span>
          </div>
          <img
            src={currentFile}
            alt="Current"
            className="w-20 h-20 rounded-md object-cover border border-white/10"
          />
        </div>
      )}

      {displayError && status !== "error" && (
        <p className="text-xs text-red-400 mt-0.5">{displayError}</p>
      )}
    </div>
  );
}
