"use client";

import React, { useState } from "react";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: number;
  status: "pending" | "in-progress" | "completed" | "failed";
  duration?: number;
  error?: string;
  dependencies?: string[];
}

interface TaskTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

export default function TaskTimeline({ events, onEventClick }: TaskTimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusColor = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "pending":
        return "border-gray-300 bg-gray-50";
      case "in-progress":
        return "border-blue-400 bg-blue-50";
      case "completed":
        return "border-green-400 bg-green-50";
      case "failed":
        return "border-red-400 bg-red-50";
    }
  };

  return (
    <div className="w-full space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className={`rounded-lg border-l-4 p-4 transition-all ${getStatusColor(event.status)}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900">
                  {event.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <time dateTime={new Date(event.timestamp).toISOString()}>
                    {new Date(event.timestamp).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {event.duration && <span>• {formatDuration(event.duration)}</span>}
                </div>
              </div>

              {event.description && (
                <p className="mt-1 text-sm text-gray-700">
                  {event.description}
                </p>
              )}

              {event.status === "failed" && event.error && (
                <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{event.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
