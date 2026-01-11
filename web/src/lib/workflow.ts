/**
 * Workflow Execution Engine
 * 
 * Basiert auf dem Workflow-Definition-System
 * mit Unterstützung für:
 * - Sequentielle und parallele Ausführung
 * - Condition Nodes (if/else)
 * - Loop Nodes
 * - State Management
 * - Pause/Resume/Cancellation
 */

// ============================================================================
// Interfaces
// ============================================================================

export enum WorkflowNodeStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
  CANCELLED = "cancelled",
}

export enum WorkflowNodeKind {
  TASK = "task",
  CONDITION = "condition",
  LOOP = "loop",
  PARALLEL = "parallel",
  DELAY = "delay",
  SUB_WORKFLOW = "sub_workflow",
}

export interface WorkflowNodeExecution {
  nodeId: string;
  status: WorkflowNodeStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: Error;
  retryCount: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  kind: WorkflowNodeKind;
  dependencies: string[]; // IDs von abhängigen Nodes
  parameters?: Record<string, any>;
  execution?: WorkflowNodeExecution;
  // Kind-spezifische Eigenschaften
  condition?: (context: WorkflowContext) => boolean;
  loopCount?: number;
  loopVariable?: string;
  subWorkflowId?: string;
  delay?: number; // in ms
  // Custom Handler
  handler?: (context: WorkflowContext) => Promise<any>;
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  input: any;
  output: any;
  nodeId?: string; // Aktueller Node
  metadata: Record<string, any>;
}

export interface WorkflowExecutionState {
  workflowId: string;
  executionId: string;
  status: WorkflowNodeStatus;
  currentNodes: string[];
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];
  startTime: number;
  endTime?: number;
  duration?: number;
  context: WorkflowContext;
  nodeExecutions: Map<string, WorkflowNodeExecution>;
  isPaused: boolean;
  isCancelled: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: Map<string, WorkflowNode>;
  startNodeId: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ============================================================================
// Workflow Execution Engine
// ============================================================================

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecutionState> = new Map();
  private maxRetries: number = 3;
  private concurrencyLimit: number = 5;

  /**
   * Registriert einen Workflow
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    console.log(`[WorkflowEngine] Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  /**
   * Startet eine Workflow-Ausführung
   */
  async executeWorkflow(
    workflowId: string,
    input: any,
    executionId?: string
  ): Promise<WorkflowExecutionState> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} nicht gefunden`);
    }

    const id = executionId || this.generateExecutionId();
    const context: WorkflowContext = {
      workflowId,
      executionId: id,
      variables: { ...workflow.variables },
      input,
      output: {},
      metadata: {},
    };

    const state: WorkflowExecutionState = {
      workflowId,
      executionId: id,
      status: WorkflowNodeStatus.RUNNING,
      currentNodes: [workflow.startNodeId],
      completedNodes: [],
      failedNodes: [],
      skippedNodes: [],
      startTime: Date.now(),
      context,
      nodeExecutions: new Map(),
      isPaused: false,
      isCancelled: false,
    };

    this.executions.set(id, state);
    console.log(`[WorkflowEngine] Started execution: ${id}`);

    try {
      await this.executeNodes(state);
      state.status = WorkflowNodeStatus.COMPLETED;
      state.endTime = Date.now();
      state.duration = state.endTime - state.startTime;
      state.context.output = context.output;
      console.log(`[WorkflowEngine] Execution completed: ${id}`);
    } catch (error) {
      state.status = WorkflowNodeStatus.FAILED;
      state.endTime = Date.now();
      state.duration = state.endTime - state.startTime;
      console.error(`[WorkflowEngine] Execution failed: ${id}`, error);
      throw error;
    }

    return state;
  }

  /**
   * Führt Nodes sequentiell oder parallel aus
   */
  private async executeNodes(state: WorkflowExecutionState): Promise<void> {
    const workflow = this.workflows.get(state.workflowId)!;

    while (
      state.currentNodes.length > 0 &&
      !state.isPaused &&
      !state.isCancelled
    ) {
      // Prüfen ob alle Dependencies erfüllt sind
      const readyNodes = state.currentNodes.filter((nodeId) => {
        const node = workflow.nodes.get(nodeId);
        if (!node) return false;

        // Prüfen ob alle Dependencies completed sind
        return node.dependencies.every(
          (depId) => state.completedNodes.includes(depId)
        );
      });

      if (readyNodes.length === 0) {
        // Keine Nodes bereit - prüfen ob fehlende Nodes fehlgeschlagen sind
        const allNodesComplete = state.currentNodes.every((nodeId) => {
          const node = workflow.nodes.get(nodeId);
          if (!node) return false;
          return node.dependencies.some((depId) =>
            state.failedNodes.includes(depId)
          );
        });

        if (allNodesComplete) {
          break; // Alle abhängigen Nodes fehlgeschlagen
        }

        // Warten auf Dependencies
        await this.sleep(100);
        continue;
      }

      // Nodes parallel ausführen (bis zum Concurrency Limit)
      const batchSize = Math.min(readyNodes.length, this.concurrencyLimit);
      const batch = readyNodes.slice(0, batchSize);

      // Parallele Ausführung
      await Promise.all(
        batch.map((nodeId) => this.executeNode(nodeId, state))
      );

      // Aktualisiere currentNodes
      state.currentNodes = state.currentNodes.filter(
        (id) => !state.completedNodes.includes(id)
      );

      // Füge neue Nodes hinzu (Nodes deren Dependencies jetzt erfüllt sind)
      const allNodes = Array.from(workflow.nodes.values());
      const newNodes = allNodes.filter(
        (node) =>
          !state.completedNodes.includes(node.id) &&
          !state.failedNodes.includes(node.id) &&
          !state.currentNodes.includes(node.id) &&
          node.dependencies.every((depId) =>
            state.completedNodes.includes(depId)
          )
      );

      state.currentNodes.push(...newNodes.map((node) => node.id));
    }
  }

  /**
   * Führt einen einzelnen Node aus
   */
  private async executeNode(
    nodeId: string,
    state: WorkflowExecutionState
  ): Promise<void> {
    const workflow = this.workflows.get(state.workflowId)!;
    const node = workflow.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} nicht gefunden`);
    }

    // Prüfen ob bereits ausgeführt
    if (state.completedNodes.includes(nodeId)) {
      return;
    }

    console.log(`[WorkflowEngine] Executing node: ${nodeId} (${node.kind})`);

    // Execution Record erstellen
    const execution: WorkflowNodeExecution = {
      nodeId,
      status: WorkflowNodeStatus.RUNNING,
      startTime: Date.now(),
      retryCount: 0,
    };

    state.nodeExecutions.set(nodeId, execution);
    state.context.nodeId = nodeId;

    try {
      // Retry-Loop
      let result: any;
      let attempt = 0;

      while (attempt <= this.maxRetries) {
        try {
          result = await this.executeNodeByKind(node, state);
          break;
        } catch (error) {
          attempt++;
          execution.retryCount = attempt;

          if (attempt <= this.maxRetries) {
            console.warn(
              `[WorkflowEngine] Node ${nodeId} failed, retry ${attempt}/${this.maxRetries}`
            );
            await this.sleep(1000 * attempt); // Exponential backoff
          } else {
            throw error;
          }
        }
      }

      execution.status = WorkflowNodeStatus.COMPLETED;
      execution.endTime = Date.now();
      execution.duration = (execution.endTime ?? 0) - (execution.startTime ?? 0);
      execution.result = result;

      state.completedNodes.push(nodeId);
      state.context.output[nodeId] = result;

      console.log(`[WorkflowEngine] Node ${nodeId} completed`);
    } catch (error) {
      execution.status = WorkflowNodeStatus.FAILED;
      execution.endTime = Date.now();
      execution.duration = (execution.endTime ?? 0) - (execution.startTime ?? 0);
      execution.error = error as Error;

      state.failedNodes.push(nodeId);

      console.error(`[WorkflowEngine] Node ${nodeId} failed:`, error);
      throw error;
    }
  }

  /**
   * Führt einen Node basierend auf seinem Kind aus
   */
  private async executeNodeByKind(
    node: WorkflowNode,
    state: WorkflowExecutionState
  ): Promise<any> {
    switch (node.kind) {
      case WorkflowNodeKind.TASK:
        return await this.executeTaskNode(node, state);

      case WorkflowNodeKind.CONDITION:
        return await this.executeConditionNode(node, state);

      case WorkflowNodeKind.LOOP:
        return await this.executeLoopNode(node, state);

      case WorkflowNodeKind.PARALLEL:
        return await this.executeParallelNode(node, state);

      case WorkflowNodeKind.DELAY:
        return await this.executeDelayNode(node, state);

      case WorkflowNodeKind.SUB_WORKFLOW:
        return await this.executeSubWorkflowNode(node, state);

      default:
        throw new Error(`Unbekannter Node Kind: ${node.kind}`);
    }
  }

  /**
   * Führt einen Task-Node aus
   */
  private async executeTaskNode(
    node: WorkflowNode,
    state: WorkflowExecutionState
  ): Promise<any> {
    if (!node.handler) {
      throw new Error(`Task Node ${node.id} hat keinen Handler`);
    }

    return await node.handler(state.context);
  }

  /**
   * Führt einen Condition-Node aus
   */
  private async executeConditionNode(
    node: WorkflowNode,
    state: WorkflowExecutionState
  ): Promise<boolean> {
    if (!node.condition) {
      throw new Error(`Condition Node ${node.id} hat keine Condition`);
    }

    const result = node.condition(state.context);
    console.log(`[WorkflowEngine] Condition ${node.id}: ${result}`);

    return result;
  }

  /**
   * Führt einen Loop-Node aus
   */
  private async executeLoopNode(
    node: WorkflowNode,
    state: WorkflowExecutionState
  ): Promise<any[]> {
    const count = node.loopCount || 1;
    const loopVar = node.loopVariable || "i";
    const results: any[] = [];

    for (let i = 0; i < count; i++) {
      // Loop Variable setzen
      state.context.variables[loopVar] = i;

      // Handler ausführen (falls vorhanden)
      if (node.handler) {
        const result = await node.handler(state.context);
        results.push(result);
      }

      console.log(`[WorkflowEngine] Loop ${node.id} iteration ${i + 1}/${count}`);
    }

    return results;
  }

  /**
   * Führt einen Parallel-Node aus
   */
  private async executeParallelNode(
    node: WorkflowNode,
    state: WorkflowExecutionState
  ): Promise<any[]> {
    const tasks = node.parameters?.tasks || [];
    const results = await Promise.all(
      tasks.map((task: () => Promise<any>) => task())
    );

    console.log(`[WorkflowEngine] Parallel ${node.id} completed ${tasks.length} tasks`);
    return results;
  }

  /**
   * Führt einen Delay-Node aus
   */
  private async executeDelayNode(
    node: WorkflowNode,
    _state: WorkflowExecutionState
  ): Promise<void> {
    const delay = node.delay || 1000;
    console.log(`[WorkflowEngine] Delay ${node.id}: ${delay}ms`);
    await this.sleep(delay);
  }

  /**
   * Führt einen Sub-Workflow aus
   */
  private async executeSubWorkflowNode(
    node: WorkflowNode,
    state: WorkflowExecutionState
  ): Promise<any> {
    const subWorkflowId = node.subWorkflowId;
    if (!subWorkflowId) {
      throw new Error(`Sub-Workflow Node ${node.id} hat keine subWorkflowId`);
    }

    const subState = await this.executeWorkflow(
      subWorkflowId,
      state.context.input
    );

    return subState.context.output;
  }

  /**
   * Pausiert eine Ausführung
   */
  pauseExecution(executionId: string): void {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} nicht gefunden`);
    }

    state.isPaused = true;
    state.status = WorkflowNodeStatus.PENDING;
    console.log(`[WorkflowEngine] Paused execution: ${executionId}`);
  }

  /**
   * Resumed eine Ausführung
   */
  async resumeExecution(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} nicht gefunden`);
    }

    state.isPaused = false;
    state.status = WorkflowNodeStatus.RUNNING;
    console.log(`[WorkflowEngine] Resumed execution: ${executionId}`);

    await this.executeNodes(state);
  }

  /**
   * Cancelled eine Ausführung
   */
  cancelExecution(executionId: string): void {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} nicht gefunden`);
    }

    state.isCancelled = true;
    state.status = WorkflowNodeStatus.CANCELLED;
    state.endTime = Date.now();
    state.duration = state.endTime - state.startTime;

    console.log(`[WorkflowEngine] Cancelled execution: ${executionId}`);
  }

  /**
   * Holt den Status einer Ausführung
   */
  getExecutionStatus(executionId: string): WorkflowExecutionState | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Holt alle Ausführungen
   */
  getAllExecutions(): WorkflowExecutionState[] {
    return Array.from(this.executions.values());
  }

  /**
   * Löscht eine Ausführung
   */
  deleteExecution(executionId: string): boolean {
    return this.executions.delete(executionId);
  }

  /**
   * Löscht alle Ausführungen
   */
  clearExecutions(): void {
    this.executions.clear();
  }

  /**
   * Validiert einen Workflow
   */
  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Start Node muss existieren
    if (!workflow.nodes.has(workflow.startNodeId)) {
      errors.push(`Start Node ${workflow.startNodeId} existiert nicht`);
    }

    // Alle Nodes validieren
    for (const [nodeId, node] of workflow.nodes) {
      // Dependencies müssen existieren
      for (const depId of node.dependencies) {
        if (!workflow.nodes.has(depId)) {
          errors.push(
            `Node ${nodeId}: Dependency ${depId} existiert nicht`
          );
        }
      }

      // Kind-spezifische Validierung
      if (node.kind === WorkflowNodeKind.CONDITION && !node.condition) {
        errors.push(`Node ${nodeId}: Condition Node braucht eine Condition`);
      }

      if (node.kind === WorkflowNodeKind.SUB_WORKFLOW && !node.subWorkflowId) {
        errors.push(
          `Node ${nodeId}: Sub-Workflow Node braucht eine subWorkflowId`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Exportiert einen Workflow als JSON
   */
  exportWorkflow(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} nicht gefunden`);
    }

    return JSON.stringify(
      {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        nodes: Array.from(workflow.nodes.values()),
        startNodeId: workflow.startNodeId,
        variables: workflow.variables,
        metadata: workflow.metadata,
      },
      null,
      2
    );
  }

  /**
   * Importiert einen Workflow aus JSON
   */
  importWorkflow(json: string): Workflow {
    const data = JSON.parse(json);

    const workflow: Workflow = {
      id: data.id,
      name: data.name,
      description: data.description,
      version: data.version,
      nodes: new Map(data.nodes.map((node: WorkflowNode) => [node.id, node])),
      startNodeId: data.startNodeId,
      variables: data.variables,
      metadata: data.metadata,
    };

    this.registerWorkflow(workflow);
    return workflow;
  }

  // ============================================================================
  // Hilfsfunktionen
  // ============================================================================

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): {
    totalWorkflows: number;
    totalExecutions: number;
    runningExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
  } {
    const executions = Array.from(this.executions.values());

    return {
      totalWorkflows: this.workflows.size,
      totalExecutions: this.executions.size,
      runningExecutions: executions.filter(
        (e) => e.status === WorkflowNodeStatus.RUNNING
      ).length,
      completedExecutions: executions.filter(
        (e) => e.status === WorkflowNodeStatus.COMPLETED
      ).length,
      failedExecutions: executions.filter(
        (e) => e.status === WorkflowNodeStatus.FAILED
      ).length,
    };
  }
}

let instance: WorkflowEngine | null = null;

export function getWorkflowEngine(): WorkflowEngine {
  if (!instance) {
    instance = new WorkflowEngine();
  }
  return instance;
}
