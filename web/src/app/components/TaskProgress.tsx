"use client";

import React, { useState, useEffect } from "react";

interface TaskStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  duration?: number;
}

interface TaskProgressProps {
  steps: TaskStep[];
  title?: string;
  showPercentage?: boolean;
  showDuration?: boolean;
  onCancel?: () => void;
}

export default function TaskProgress({
  steps,
  title = "Fortschritt",
  showPercentage = true,
  showDuration = true,
  onCancel,
}: TaskProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const runningSteps = steps.filter((s) => s.status === "running").length;
  const failedSteps = steps.filter((s) => s.status === "failed").length;
  const percentage = Math.round((completedSteps / steps.length) * 100);
  const isRunning = runningSteps > 0;
  const hasFailed = failedSteps > 0;

  // Timer für die Gesamtzeit
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getStatusIcon = (status: TaskStep["status"]) => {
    switch (status) {
      case "completed":
        return (
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "running":
        return (
          <svg
            className="h-5 w-5 text-blue-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case "failed":
        return (
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "pending":
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
        );
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {onCancel && isRunning && (
            <button
              onClick={onCancel}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {completedSteps} von {steps.length} Schritten abgeschlossen
          </span>
          {showPercentage && (
            <span className="font-semibold text-gray-900">{percentage}%</span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              hasFailed ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Elapsed Time */}
      {isRunning && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Vergangene Zeit: {formatDuration(elapsedTime)}</span>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`rounded-md border p-3 transition-colors ${
              step.status === "failed"
                ? "border-red-200 bg-red-50"
                : step.status === "running"
                  ? "border-blue-200 bg-blue-50"
                  : step.status === "completed"
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm font-medium ${
                      step.status === "failed"
                        ? "text-red-900"
                        : step.status === "running"
                          ? "text-blue-900"
                          : step.status === "completed"
                            ? "text-green-900"
                            : "text-gray-900"
                    }`}
                  >
                    {step.label}
                  </p>
                  {showDuration && step.duration && (
                    <span className="text-xs text-gray-600">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>
                {step.error && (
                  <p className="mt-1 text-xs text-red-700">{step.error}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {hasFailed && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-900">
                {failedSteps} {failedSteps === 1 ? "Fehler" : "Fehler"}
              </p>
              <p className="mt-1 text-sm text-red-800">
                Einige Schritte sind fehlgeschlagen. Überprüfen Sie die
                Fehlerdetails oben.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isRunning && !hasFailed && completedSteps === steps.length && (
        <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-900">
                Alle Aufgaben abgeschlossen!
              </p>
              <p className="mt-1 text-sm text-green-800">
                {steps.length} Schritte wurden erfolgreich ausgeführt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
