/**
 * Workflow Visualizer
 * 
 * Konvertiert Workflows in React Flow kompatible Nodes und Edges
 * für die interaktive Visualisierung.
 */

import {
  type Node,
  type Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import {
  Workflow,
  WorkflowNode,
  WorkflowNodeKind,
  WorkflowNodeStatus,
  WorkflowExecutionState,
} from "./workflow";

// ============================================================================
// Types für React Flow
// ============================================================================

export interface WorkflowNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  kind: WorkflowNodeKind;
  status?: WorkflowNodeStatus;
  description?: string;
  dependencies: string[];
  parameters?: Record<string, any>;
  execution?: {
    startTime?: number;
    endTime?: number;
    duration?: number;
    retryCount?: number;
    error?: string;
  };
}

export type WorkflowFlowNode = Node<WorkflowNodeData>;

export interface WorkflowGraph {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
}

// ============================================================================
// Node-Konfiguration
// ============================================================================

interface NodeStyleConfig {
  color: string;
  borderColor: string;
  icon: string;
  backgroundColor: string;
}

const NODE_STYLES: Record<WorkflowNodeKind, NodeStyleConfig> = {
  [WorkflowNodeKind.TASK]: {
    color: "#3b82f6",
    borderColor: "#2563eb",
    icon: "⚡",
    backgroundColor: "#1e40af",
  },
  [WorkflowNodeKind.CONDITION]: {
    color: "#f59e0b",
    borderColor: "#d97706",
    icon: "◇",
    backgroundColor: "#b45309",
  },
  [WorkflowNodeKind.LOOP]: {
    color: "#10b981",
    borderColor: "#059669",
    icon: "↻",
    backgroundColor: "#047857",
  },
  [WorkflowNodeKind.PARALLEL]: {
    color: "#8b5cf6",
    borderColor: "#7c3aed",
    icon: "∥",
    backgroundColor: "#6d28d9",
  },
  [WorkflowNodeKind.DELAY]: {
    color: "#64748b",
    borderColor: "#475569",
    icon: "⏱",
    backgroundColor: "#334155",
  },
  [WorkflowNodeKind.SUB_WORKFLOW]: {
    color: "#ec4899",
    borderColor: "#db2777",
    icon: "⊞",
    backgroundColor: "#be185d",
  },
};

const STATUS_STYLES: Record<WorkflowNodeStatus, string> = {
  [WorkflowNodeStatus.PENDING]: "#94a3b8",
  [WorkflowNodeStatus.RUNNING]: "#3b82f6",
  [WorkflowNodeStatus.COMPLETED]: "#22c55e",
  [WorkflowNodeStatus.FAILED]: "#ef4444",
  [WorkflowNodeStatus.SKIPPED]: "#f59e0b",
  [WorkflowNodeStatus.CANCELLED]: "#94a3b8",
};

// ============================================================================
// Workflow zu Graph Konvertierung
// ============================================================================

/**
 * Konvertiert einen Workflow in React Flow Nodes und Edges
 */
export function workflowToGraph(
  workflow: Workflow,
  executionState?: WorkflowExecutionState
): WorkflowGraph {
  const nodes: WorkflowFlowNode[] = [];
  const edges: Edge[] = [];

  // Topologische Sortierung für die Positionierung
  const sortedNodes = topologicalSort(workflow);
  const levels = calculateLevels(sortedNodes, workflow);

  // Nodes erstellen
  sortedNodes.forEach((nodeId, index) => {
    const node = workflow.nodes.get(nodeId)!;
    const level = levels.get(nodeId) || 0;
    const position = calculateNodePosition(level, index, levels);

    // Status aus Execution State
    let status: WorkflowNodeStatus | undefined;
    if (executionState) {
      const nodeExecution = executionState.nodeExecutions.get(nodeId);
      status = nodeExecution?.status;
    }

    const flowNode: WorkflowFlowNode = {
      id: nodeId,
      type: "workflowNode",
      position,
      data: {
        id: node.id,
        name: node.name,
        kind: node.kind,
        status,
        description: node.kind,
        dependencies: node.dependencies,
        parameters: node.parameters,
        execution: executionState?.nodeExecutions.get(nodeId)
          ? {
              startTime: executionState.nodeExecutions.get(nodeId)!.startTime,
              endTime: executionState.nodeExecutions.get(nodeId)!.endTime,
              duration: executionState.nodeExecutions.get(nodeId)!.duration,
              retryCount: executionState.nodeExecutions.get(nodeId)!.retryCount,
              error: executionState.nodeExecutions.get(nodeId)!.error?.message,
            }
          : undefined,
      },
    };

    nodes.push(flowNode);
  });

  // Edges erstellen
  nodes.forEach((node) => {
    const workflowNode = workflow.nodes.get(node.id)!;
    workflowNode.dependencies.forEach((depId) => {
      const edge: Edge = {
        id: `${depId}-${node.id}`,
        source: depId,
        target: node.id,
        type: "smoothstep",
        animated: node.data.status === WorkflowNodeStatus.RUNNING,
        style: {
          stroke: node.data.status ? STATUS_STYLES[node.data.status] : "#64748b",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: node.data.status ? STATUS_STYLES[node.data.status] : "#64748b",
        },
      };
      edges.push(edge);
    });
  });

  return { nodes, edges };
}

/**
 * Führt topologische Sortierung durch
 */
function topologicalSort(workflow: Workflow): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(nodeId: string): void {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new Error(`Zyklus erkannt: ${nodeId}`);
    }

    visiting.add(nodeId);

    const node = workflow.nodes.get(nodeId);
    if (node) {
      node.dependencies.forEach((depId) => visit(depId));
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    sorted.push(nodeId);
  }

  // Alle Nodes besuchen
  workflow.nodes.forEach((_, nodeId) => {
    visit(nodeId);
  });

  return sorted;
}

/**
 * Berechnet Level für jeden Node (Abstand vom Start)
 */
function calculateLevels(sortedNodes: string[], workflow: Workflow): Map<string, number> {
  const levels = new Map<string, number>();

  // Start Node
  const startNode = workflow.nodes.get(workflow.startNodeId);
  if (startNode) {
    levels.set(startNode.id, 0);
  }

  // Level für jeden Node berechnen
  sortedNodes.forEach((nodeId) => {
    const node = workflow.nodes.get(nodeId)!;
    if (nodeId === workflow.startNodeId) return;

    const maxDepLevel = Math.max(
      0,
      ...node.dependencies.map((depId) => levels.get(depId) || 0)
    );
    levels.set(nodeId, maxDepLevel + 1);
  });

  return levels;
}

/**
 * Berechnet Position für einen Node
 */
function calculateNodePosition(
  level: number,
  index: number,
  levels: Map<string, number>
): { x: number; y: number } {
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 100;
  const LEVEL_GAP = 300;
  const NODE_GAP = 50;

  // Zählen wie viele Nodes auf dem gleichen Level sind
  const nodesInLevel = Array.from(levels.values()).filter((l) => l === level).length;

  // Y-Position basierend auf Index im Level
  const levelIndex = Array.from(levels.entries())
    .filter(([_, l]) => l === level)
    .findIndex(([id]) => {
      const allEntries = Array.from(levels.entries());
      return allEntries[index]?.[0] === id;
    });

  const y = levelIndex * (NODE_HEIGHT + NODE_GAP) + 100;
  const x = level * LEVEL_GAP + 100;

  return { x, y };
}

// ============================================================================
// Node Rendering
// ============================================================================

export function getNodeType(kind: WorkflowNodeKind): string {
  return `workflowNode-${kind}`;
}

export function getNodeColor(kind: WorkflowNodeKind): string {
  return NODE_STYLES[kind].color;
}

export function getNodeBorderColor(kind: WorkflowNodeKind, status?: WorkflowNodeStatus): string {
  if (status && status !== WorkflowNodeStatus.PENDING) {
    return STATUS_STYLES[status];
  }
  return NODE_STYLES[kind].borderColor;
}

export function getNodeBackgroundColor(kind: WorkflowNodeKind): string {
  return NODE_STYLES[kind].backgroundColor;
}

export function getNodeIcon(kind: WorkflowNodeKind): string {
  return NODE_STYLES[kind].icon;
}

// ============================================================================
// Status Helpers
// ============================================================================

export function isNodeRunning(status?: WorkflowNodeStatus): boolean {
  return status === WorkflowNodeStatus.RUNNING;
}

export function isNodeCompleted(status?: WorkflowNodeStatus): boolean {
  return status === WorkflowNodeStatus.COMPLETED;
}

export function isNodeFailed(status?: WorkflowNodeStatus): boolean {
  return status === WorkflowNodeStatus.FAILED;
}

export function isNodeSkipped(status?: WorkflowNodeStatus): boolean {
  return status === WorkflowNodeStatus.SKIPPED;
}

export function getStatusColor(status?: WorkflowNodeStatus): string {
  return status ? STATUS_STYLES[status] : "#64748b";
}

// ============================================================================
// Formatierung Helpers
// ============================================================================

export function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatTime(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ============================================================================
// Graph Analyse
// ============================================================================

export function analyzeGraph(workflow: Workflow): {
  totalNodes: number;
  totalEdges: number;
  maxLevel: number;
  criticalPath: string[];
  branches: number;
} {
  const levels = calculateLevels(
    topologicalSort(workflow),
    workflow
  );

  const totalNodes = workflow.nodes.size;
  const totalEdges = Array.from(workflow.nodes.values()).reduce(
    (sum, node) => sum + node.dependencies.length,
    0
  );
  const maxLevel = Math.max(...Array.from(levels.values()));

  // Kritischer Pfad berechnen (längster Pfad vom Start zum Ende)
  const criticalPath = calculateCriticalPath(workflow);

  // Zweige zählen (Nodes mit >1 Dependencies oder >1 abhängigen Nodes)
  const branches = Array.from(workflow.nodes.values()).filter(
    (node) =>
      node.dependencies.length > 1 ||
      Array.from(workflow.nodes.values()).filter((n) =>
        n.dependencies.includes(node.id)
      ).length > 1
  ).length;

  return {
    totalNodes,
    totalEdges,
    maxLevel,
    criticalPath,
    branches,
  };
}

function calculateCriticalPath(workflow: Workflow): string[] {
  const longestPaths = new Map<string, number>();

  function calculateLongestPath(nodeId: string): number {
    if (longestPaths.has(nodeId)) {
      return longestPaths.get(nodeId)!;
    }

    const node = workflow.nodes.get(nodeId)!;
    if (node.dependencies.length === 0) {
      longestPaths.set(nodeId, 0);
      return 0;
    }

    const maxDep = Math.max(
      ...node.dependencies.map((depId) => calculateLongestPath(depId))
    );
    longestPaths.set(nodeId, maxDep + 1);
    return maxDep + 1;
  }

  // Längsten Pfad für alle Nodes berechnen
  Array.from(workflow.nodes.keys()).forEach((nodeId) => {
    calculateLongestPath(nodeId);
  });

  // Node mit dem längsten Pfad finden
  const endNode = Array.from(longestPaths.entries()).reduce(
    (max, [id, length]) => (length > max.length ? { id, length } : max),
    { id: "", length: 0 }
  );

  // Pfad zurückverfolgen
  const path: string[] = [];
  let currentId = endNode.id;

  while (currentId) {
    path.unshift(currentId);
    const node = workflow.nodes.get(currentId)!;

    // Vorgänger mit maximalem Pfad finden
    if (node.dependencies.length === 0) break;

    let maxDepId = "";
    let maxLength = -1;

    node.dependencies.forEach((depId) => {
      const length = longestPaths.get(depId) || 0;
      if (length > maxLength) {
        maxLength = length;
        maxDepId = depId;
      }
    });

    currentId = maxDepId;
  }

  return path;
}

// ============================================================================
// Layout-Optimierung
// ============================================================================

/**
 * Optimiert das Layout um Kollisionen zu vermeiden
 */
export function optimizeLayout(graph: WorkflowGraph): WorkflowGraph {
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];

  // Einfache Kollisionsvermeidung: Nodes die zu nah sind verschieben
  const MIN_DISTANCE_Y = 120;

  nodes.sort((a, b) => a.position.y - b.position.y);

  for (let i = 1; i < nodes.length; i++) {
    const prevNode = nodes[i - 1];
    const currentNode = nodes[i];

    if (
      currentNode.position.y - prevNode.position.y < MIN_DISTANCE_Y &&
      Math.abs(currentNode.position.x - prevNode.position.x) < 50
    ) {
      currentNode.position.y = prevNode.position.y + MIN_DISTANCE_Y;
    }
  }

  return { nodes, edges };
}
