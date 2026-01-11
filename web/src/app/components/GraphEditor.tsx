"use client";

import React, { useCallback, useMemo, useState } from "react";
import ReactFlow from "reactflow";
import {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeChange,
  NodeTypes,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  EdgeChange,
  EdgeTypes,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

// Custom Node Types
const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  conditionNode: ConditionNode,
  loopNode: LoopNode,
};

// Custom Edge Types
const edgeTypes: EdgeTypes = {
  default: {
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#95a5a6",
    },
    style: { strokeWidth: 2 },
  },
  success: {
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#27ae60",
    },
    style: { strokeWidth: 2, stroke: "#27ae60" },
  },
  failure: {
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#e74c3c",
    },
    style: { strokeWidth: 2, stroke: "#e74c3c" },
  },
};

// Task Node Component
function TaskNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[150px]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <div className="font-bold">{data.label}</div>
      </div>
      {data.agent && (
        <div className="text-xs text-gray-500 mt-1">{data.agent}</div>
      )}
      {data.status && (
        <div className={`text-xs mt-1 ${
          data.status === "completed" ? "text-green-600" :
          data.status === "running" ? "text-blue-600" :
          data.status === "failed" ? "text-red-600" :
          "text-gray-600"
        }`}>
          {data.status}
        </div>
      )}
    </div>
  );
}

// Condition Node Component
function ConditionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-50 border-2 border-yellow-400 min-w-[150px]">
      <div className="font-bold text-yellow-800">{data.label}</div>
      <div className="text-xs text-yellow-700 mt-1">
        {data.condition || "condition"}
      </div>
    </div>
  );
}

// Loop Node Component
function LoopNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-50 border-2 border-purple-400 min-w-[150px]">
      <div className="font-bold text-purple-800">{data.label}</div>
      <div className="text-xs text-purple-700 mt-1">
        {data.iterations || "0"} iterations
      </div>
    </div>
  );
}

interface GraphEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  readOnly?: boolean;
}

export default function GraphEditor({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  readOnly = false,
}: GraphEditorProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeInternal(changes);
    if (onNodesChange) {
      onNodesChange(nodes);
    }
  }, [nodes, onNodesChangeInternal, onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChangeInternal(changes);
    if (onEdgesChange) {
      onEdgesChange(edges);
    }
  }, [edges, onEdgesChangeInternal, onEdgesChange]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                const newNode: Node = {
                  id: `node-${Date.now()}`,
                  type: "taskNode",
                  position: { x: Math.random() * 400, y: Math.random() * 400 },
                  data: { label: "New Task", agent: "Agent", status: "pending" },
                };
                setNodes((nds: Node[]) => [...nds, newNode]);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              + Add Task
            </button>
            <button
              onClick={() => {
                const newNode: Node = {
                  id: `condition-${Date.now()}`,
                  type: "conditionNode",
                  position: { x: Math.random() * 400, y: Math.random() * 400 },
                  data: { label: "Condition", condition: "expression" },
                };
                setNodes((nds: Node[]) => [...nds, newNode]);
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              + Add Condition
            </button>
            <button
              onClick={() => {
                const newNode: Node = {
                  id: `loop-${Date.now()}`,
                  type: "loopNode",
                  position: { x: Math.random() * 400, y: Math.random() * 400 },
                  data: { label: "Loop", iterations: "0" },
                };
                setNodes((nds: Node[]) => [...nds, newNode]);
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              + Add Loop
            </button>
            <button
              onClick={() => {
                if (selectedNode) {
                  setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== selectedNode.id));
                  setSelectedNode(null);
                }
              }}
              disabled={!selectedNode}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <div className="w-full h-[600px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "conditionNode") return "#fcd34d";
                if (node.type === "loopNode") return "#c084fc";
                return "#3b82f6";
              }}
              maskColor="rgb(240, 242, 245, 0.6)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && !readOnly && (
        <div className="p-4 border-t bg-gray-50">
          <h3 className="font-bold mb-2">Selected: {selectedNode.data.label}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label htmlFor="label-input" className="block font-medium mb-1">Label:</label>
              <input
                id="label-input"
                type="text"
                placeholder="Enter label"
                value={selectedNode.data.label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setNodes((nds: Node[]) =>
                    nds.map((n: Node) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, label: e.target.value } }
                        : n
                    )
                  );
                }}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            {selectedNode.type === "taskNode" && (
              <div>
                <label htmlFor="agent-input" className="block font-medium mb-1">Agent:</label>
                <input
                  id="agent-input"
                  type="text"
                  placeholder="Enter agent name"
                  value={selectedNode.data.agent || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNodes((nds: Node[]) =>
                      nds.map((n: Node) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, agent: e.target.value } }
                          : n
                      )
                    );
                  }}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
            {selectedNode.type === "conditionNode" && (
              <div>
                <label htmlFor="condition-input" className="block font-medium mb-1">Condition:</label>
                <input
                  id="condition-input"
                  type="text"
                  placeholder="Enter condition"
                  value={selectedNode.data.condition || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNodes((nds: Node[]) =>
                      nds.map((n: Node) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, condition: e.target.value } }
                          : n
                      )
                    );
                  }}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
