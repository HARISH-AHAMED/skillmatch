import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileToBase64(file: File, maxSizeMB: number = 1.5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`File "${file.name}" is too large. Please select a file under ${maxSizeMB}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

