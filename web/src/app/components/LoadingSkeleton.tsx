"use client";

import React from "react";

// Shimmer Animation für Skeleton
const shimmer = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(
      to right,
      #f6f7f8 4%,
      #edeef1 25%,
      #f6f7f8 36%,
      #f6f7f8 45%,
      #edeef1 50%,
      #f6f7f8 55%,
      #edeef1 66%,
      #f6f7f8 75%,
      #f6f7f8 100%
    );
    background-size: 1000px 100%;
  }
`;

interface SkeletonProps {
  className?: string;
  variant?: "default" | "circle" | "text" | "button";
  width?: string;
  height?: string;
}

export default function Skeleton({
  className = "",
  variant = "default",
  width,
  height,
}: SkeletonProps) {
  const baseClasses = "animate-shimmer rounded-md";
  const variantClasses = {
    default: "h-4 w-full bg-gray-200",
    circle: `rounded-full bg-gray-200`,
    text: "h-4 w-3/4 bg-gray-200",
    button: "h-10 w-24 bg-gray-200",
  };

  const sizeClasses = width && height ? `w-[${width}] h-[${height}]` : "";

  return (
    <>
      <style>{shimmer}</style>
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${className}`}
      />
    </>
  );
}

// Card Skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton variant="circle" width="40px" height="40px" />
            <Skeleton width="100px" />
          </div>
          <Skeleton className="mb-2" />
          <Skeleton className="mb-2" />
          <Skeleton className="mb-4" />
          <div className="flex gap-2">
            <Skeleton variant="button" />
            <Skeleton variant="button" />
          </div>
        </div>
      ))}
    </div>
  );
}

// List Skeleton
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton variant="circle" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" />
            <Skeleton />
          </div>
          <Skeleton variant="button" />
        </div>
      ))}
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={`${100 / columns}%`} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-100 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width={`${100 / columns}%`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Form Skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <Skeleton className="mb-2" width="150px" />
        <Skeleton className="mb-4" height="48px" />
      </div>
      <div>
        <Skeleton className="mb-2" width="150px" />
        <Skeleton className="mb-4" height="48px" />
      </div>
      <div>
        <Skeleton className="mb-2" width="150px" />
        <Skeleton className="mb-4" height="120px" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <Skeleton className="mb-3" width="80px" />
            <Skeleton className="mb-2" height="32px" />
            <Skeleton width="60%" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="mb-4" width="200px" height="24px" />
            <Skeleton className="mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton variant="circle" width="32px" height="32px" />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="70%" />
                    <Skeleton />
                  </div>
                  <Skeleton variant="button" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="mb-4" width="150px" height="20px" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton variant="circle" width="24px" height="24px" />
                  <Skeleton width="80%" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
