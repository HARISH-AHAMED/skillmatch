"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Data table surface: light header row, horizontal dividers only, row hover
 * tint, no vertical column borders. The wrapper owns the border and radius so
 * wide tables scroll inside their own container instead of the page.
 */
export function Table({
  children,
  className,
  wrapperClassName,
}: {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-[#E3E5EA] bg-white",
        wrapperClassName
      )}
    >
      <table className={cn("w-full border-collapse text-left text-[13px]", className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <thead className={cn("bg-[#F8F9FB]", className)}>{children}</thead>;
}

export function TBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

export function TR({
  children,
  className,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      data-selected={selected || undefined}
      className={cn(
        "border-b border-[#EDEEF2] last:border-b-0 transition-colors duration-[180ms]",
        selected && "bg-[#EAF1FE]",
        onClick && "cursor-pointer",
        !selected && "hover:bg-[#F0F3F9]",
        className
      )}
    >
      {children}
    </tr>
  );
}

export interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Renders a sort chevron and makes the header a button. */
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
  align?: "left" | "center" | "right";
}

export function TH({
  children,
  className,
  sortable,
  sorted = false,
  onSort,
  align = "left",
  ...props
}: THProps) {
  const content = (
    <>
      {children}
      {sortable && (
        <span className="ml-1 inline-flex" aria-hidden="true">
          {sorted === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className={cn("h-3.5 w-3.5", !sorted && "opacity-40")} />
          )}
        </span>
      )}
    </>
  );

  return (
    <th
      scope="col"
      aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6272]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex items-center uppercase tracking-[0.03em] cursor-pointer transition-colors hover:text-[#1A1D29]",
            align === "right" && "justify-end",
            align === "center" && "justify-center"
          )}
        >
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

export interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
}

export function TD({ children, className, align = "left", ...props }: TDProps) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle text-[13px] text-[#1A1D29]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
