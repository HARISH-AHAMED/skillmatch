"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2, RefreshCw } from "lucide-react";

interface ProjectBannerUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

/**
 * Optional project banner/cover picker. Reuses the existing /api/upload
 * endpoint (same one used by the company profile logo/banner), so no new
 * storage architecture is introduced.
 */
export function ProjectBannerUpload({ value, onChange, label = "Project Banner Image (Optional)" }: ProjectBannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url as string);
    } catch (err: any) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>

      <div className="relative w-full overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
        {value ? (
          <img src={value} alt="Project banner preview" className="h-44 w-full object-cover sm:h-56" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 text-slate-500 transition-colors hover:bg-slate-100 sm:h-56"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-xs font-medium">
              {uploading ? "Uploading..." : "Click to add a cover image"}
            </span>
            <span className="text-[10px] text-slate-400">PNG, JPG or WEBP • up to 5MB • can be skipped</span>
          </button>
        )}
      </div>

      {value && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Replace
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:border-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      )}

      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
