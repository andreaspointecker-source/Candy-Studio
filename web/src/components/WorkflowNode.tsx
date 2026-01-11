/**
 * Workflow Node Component
 * 
 * Custom React Flow Node für die Visualisierung von Workflow Nodes
 */

"use client";

import { memo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import {
  WorkflowNodeKind,
  WorkflowNodeStatus,
} from "../lib/workflow";
import {
  type WorkflowNodeData,
  formatDuration,
  formatTime,
  isNodeRunning,
  isNodeCompleted,
  isNodeFailed,
} from "../lib/workflow-visualizer";

const NODE_STYLES: Record<WorkflowNodeKind, string> = {
  [WorkflowNodeKind.TASK]: "bg-blue-500/10 border-blue-500",
  [WorkflowNodeKind.CONDITION]: "bg-orange-500/10 border-orange-500",
  [WorkflowNodeKind.LOOP]: "bg-green-500/10 border-green-500",
  [WorkflowNodeKind.PARALLEL]: "bg-purple-500/10 border-purple-500",
  [WorkflowNodeKind.DELAY]: "bg-slate-500/10 border-slate-500",
  [WorkflowNodeKind.SUB_WORKFLOW]: "bg-pink-500/10 border-pink-500",
};

const NODE_ICONS: Record<WorkflowNodeKind, string> = {
  [WorkflowNodeKind.TASK]: "⚡",
  [WorkflowNodeKind.CONDITION]: "◇",
  [WorkflowNodeKind.LOOP]: "↻",
  [WorkflowNodeKind.PARALLEL]: "∥",
  [WorkflowNodeKind.DELAY]: "⏱",
  [WorkflowNodeKind.SUB_WORKFLOW]: "⊞",
};

function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const style = NODE_STYLES[nodeData.kind];
  const icon = NODE_ICONS[nodeData.kind];
  const isRunning = isNodeRunning(nodeData.status);
  const isCompleted = isNodeCompleted(nodeData.status);
  const isFailed = isNodeFailed(nodeData.status);

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 bg-slate-900/95
        backdrop-blur-sm transition-all duration-200
        ${style}
        ${selected ? "ring-2 ring-white/50 ring-offset-2" : ""}
        ${isRunning ? "animate-pulse" : ""}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !border-slate-600"
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-sm text-white">{nodeData.name}</h3>
        {nodeData.status && (
          <span
            className={`
              ml-auto px-2 py-0.5 rounded text-xs font-medium
              ${
                nodeData.status === WorkflowNodeStatus.RUNNING
                  ? "bg-blue-500/20 text-blue-400"
                  : nodeData.status === WorkflowNodeStatus.COMPLETED
                    ? "bg-green-500/20 text-green-400"
                    : nodeData.status === WorkflowNodeStatus.FAILED
                      ? "bg-red-500/20 text-red-400"
                      : nodeData.status === WorkflowNodeStatus.SKIPPED
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-slate-500/20 text-slate-400"
              }
            `}
          >
            {nodeData.status.toLowerCase()}
          </span>
        )}
      </div>

      {/* Node Description */}
      <p className="text-xs text-slate-400 mb-2">
        {nodeData.description}
      </p>

      {/* Dependencies */}
      {nodeData.dependencies.length > 0 && (
        <div className="text-xs text-slate-500 mb-2">
          Depends on: {nodeData.dependencies.join(", ")}
        </div>
      )}

      {/* Execution Info */}
      {nodeData.execution && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          {nodeData.execution.startTime && (
            <div className="text-xs text-slate-500">
              Started: {formatTime(nodeData.execution.startTime)}
            </div>
          )}
          {nodeData.execution.endTime && (
            <div className="text-xs text-slate-500">
              Ended: {formatTime(nodeData.execution.endTime)}
            </div>
          )}
          {nodeData.execution.duration !== undefined && (
            <div className="text-xs text-slate-500">
              Duration: {formatDuration(nodeData.execution.duration)}
            </div>
          )}
          {(nodeData.execution.retryCount ?? 0) > 0 && (
            <div className="text-xs text-orange-400">
              Retries: {nodeData.execution.retryCount}
            </div>
          )}
          {nodeData.execution.error && (
            <div className="text-xs text-red-400 mt-1">
              Error: {nodeData.execution.error}
            </div>
          )}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400 !border-slate-600"
      />
    </div>
  );
}

export default memo(WorkflowNode);
