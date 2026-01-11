/**
 * Workflow Visualization Page
 * 
 * Interaktive Visualisierung von Workflows mit React Flow
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import WorkflowNode from "../../components/WorkflowNode";
import {
  getWorkflowEngine,
  Workflow,
  WorkflowNodeKind,
  WorkflowNodeStatus,
} from "../../lib/workflow";
import {
  workflowToGraph,
  optimizeLayout,
  analyzeGraph,
} from "../../lib/workflow-visualizer";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

export default function WorkflowPage() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initialen Sample Workflow
  const sampleWorkflow = useMemo(() => {
    const engine = getWorkflowEngine();
    const sample: Workflow = {
      id: "sample-workflow",
      name: "Sample Workflow",
      description: "Ein Beispiel-Workflow mit verschiedenen Node-Typen",
      version: "1.0.0",
      startNodeId: "start",
      nodes: new Map<string, any>([
        [
          "start",
          {
            id: "start",
            name: "Start",
            kind: WorkflowNodeKind.TASK,
            dependencies: [],
            handler: async (ctx: any) => {
              console.log("Start Node executed");
              ctx.variables.started = true;
              return { message: "Workflow gestartet" };
            },
          },
        ],
        [
          "process",
          {
            id: "process",
            name: "Process Data",
            kind: WorkflowNodeKind.TASK,
            dependencies: ["start"],
            handler: async (ctx: any) => {
              console.log("Processing data");
              ctx.variables.processed = true;
              return { message: "Daten verarbeitet" };
            },
          },
        ],
        [
          "check",
          {
            id: "check",
            name: "Check Condition",
            kind: WorkflowNodeKind.CONDITION,
            dependencies: ["process"],
            condition: (ctx: any) => ctx.variables.processed === true,
          },
        ],
        [
          "parallel-task-1",
          {
            id: "parallel-task-1",
            name: "Parallel Task 1",
            kind: WorkflowNodeKind.TASK,
            dependencies: ["check"],
            handler: async (ctx: any) => {
              console.log("Parallel task 1 executed");
              return { message: "Task 1 abgeschlossen" };
            },
          },
        ],
        [
          "parallel-task-2",
          {
            id: "parallel-task-2",
            name: "Parallel Task 2",
            kind: WorkflowNodeKind.TASK,
            dependencies: ["check"],
            handler: async (ctx: any) => {
              console.log("Parallel task 2 executed");
              return { message: "Task 2 abgeschlossen" };
            },
          },
        ],
        [
          "delay",
          {
            id: "delay",
            name: "Delay",
            kind: WorkflowNodeKind.DELAY,
            dependencies: ["parallel-task-1"],
            delay: 1000,
          },
        ],
        [
          "loop",
          {
            id: "loop",
            name: "Loop",
            kind: WorkflowNodeKind.LOOP,
            dependencies: ["parallel-task-2"],
            loopCount: 3,
            loopVariable: "iteration",
          },
        ],
        [
          "end",
          {
            id: "end",
            name: "End",
            kind: WorkflowNodeKind.TASK,
            dependencies: ["delay", "loop"],
            handler: async (ctx: any) => {
              console.log("End Node executed");
              return { message: "Workflow beendet" };
            },
          },
        ],
      ]),
    };
    engine.registerWorkflow(sample);
    return sample;
  }, []);

  // Workflow initialisieren
  const currentWorkflow = workflow || sampleWorkflow;

  // Graph konvertieren
  const engine = getWorkflowEngine();
  const executionState = executionId ? engine.getExecutionStatus(executionId) : undefined;

  const graph = useMemo(() => {
    const rawGraph = workflowToGraph(currentWorkflow, executionState);
    return optimizeLayout(rawGraph);
  }, [currentWorkflow, executionState]);

  // Graph Analyse
  const graphAnalysis = useMemo(() => {
    if (!currentWorkflow) return null;
    return analyzeGraph(currentWorkflow);
  }, [currentWorkflow]);

  // React Flow Callbacks
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Nodes können nicht direkt verschoben werden, da Positionen durch Workflow bestimmt werden
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Edges können nicht direkt geändert werden
    },
    []
  );

  // Workflow ausführen
  const executeWorkflow = async () => {
    if (!currentWorkflow) return;
    setIsExecuting(true);
    try {
      const result = await engine.executeWorkflow(
        currentWorkflow.id,
        { input: "sample data" }
      );
      setExecutionId(result.executionId);
      setWorkflow(currentWorkflow);
      console.log("Workflow executed:", result);
    } catch (error) {
      console.error("Workflow execution failed:", error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Workflow zurücksetzen
  const resetWorkflow = () => {
    setExecutionId(null);
    setWorkflow(currentWorkflow);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Workflow Visualizer
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {currentWorkflow?.name}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isExecuting ? "Läuft..." : "Workflow starten"}
            </button>
            {executionId && (
              <button
                onClick={resetWorkflow}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#0f172a" gap={20} />
            <Controls />
            <MiniMap
              nodeColor="#1e293b"
              maskColor="#0f172a"
            />
          </ReactFlow>
        </div>

        {/* Sidebar */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-white mb-4">
            Workflow Info
          </h2>

          {currentWorkflow && (
            <div className="space-y-4">
              {/* Workflow Details */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">
                  Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white">{currentWorkflow.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Version:</span>
                    <span className="text-white">{currentWorkflow.version}</span>
                  </div>
                  {currentWorkflow.description && (
                    <div>
                      <span className="text-slate-400 block mb-1">
                        Beschreibung:
                      </span>
                      <span className="text-white text-xs">
                        {currentWorkflow.description}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Graph Analyse */}
              {graphAnalysis && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Analyse
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nodes:</span>
                      <span className="text-white">{graphAnalysis.totalNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Edges:</span>
                      <span className="text-white">{graphAnalysis.totalEdges}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Level:</span>
                      <span className="text-white">{graphAnalysis.maxLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Branches:</span>
                      <span className="text-white">{graphAnalysis.branches}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Status */}
              {executionState && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Ausführung
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span
                        className={`font-medium ${
                          executionState.status === WorkflowNodeStatus.COMPLETED
                            ? "text-green-400"
                            : executionState.status === WorkflowNodeStatus.RUNNING
                              ? "text-blue-400"
                              : executionState.status === WorkflowNodeStatus.FAILED
                                ? "text-red-400"
                                : "text-slate-400"
                        }`}
                      >
                        {executionState.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed:</span>
                      <span className="text-white">
                        {executionState.completedNodes.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Failed:</span>
                      <span className="text-white">
                        {executionState.failedNodes.length}
                      </span>
                    </div>
                    {executionState.duration && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white">
                          {(executionState.duration / 1000).toFixed(2)}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Node Types Legend */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">
                  Node-Typen
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500 flex items-center justify-center">
                      ⚡
                    </span>
                    <span className="text-white">Task</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500 flex items-center justify-center">
                      ◇
                    </span>
                    <span className="text-white">Condition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
                      ↻
                    </span>
                    <span className="text-white">Loop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                      ∥
                    </span>
                    <span className="text-white">Parallel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-slate-500/20 border border-slate-500 flex items-center justify-center">
                      ⏱
                    </span>
                    <span className="text-white">Delay</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
