/**
 * Parallel Task Execution Engine
 * 
 * Führt Tasks parallel aus unter Berücksichtigung von Dependencies
 */

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface Task {
  id: string;
  name: string;
  execute: () => Promise<any>;
  dependencies?: string[]; // Task-IDs, die vorher abgeschlossen sein müssen
  priority?: number; // Höhere Priorität wird zuerst ausgeführt
  timeout?: number; // Max Dauer in ms
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  result?: any;
  error?: Error;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface ExecutionStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalDuration: number;
  averageDuration: number;
  concurrency: number;
}

export class ParallelExecutor {
  private tasks: Map<string, Task> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrency: number;
  private isPaused: boolean = false;
  private cancellationTokens: Map<string, AbortController> = new Map();

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Fügt Tasks zur Ausführung hinzu
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Fügt mehrere Tasks hinzu
   */
  addTasks(tasks: Task[]): void {
    tasks.forEach((task) => this.addTask(task));
  }

  /**
   * Entfernt einen Task
   */
  removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * Setzt die maximale Parallelität
   */
  setMaxConcurrency(concurrency: number): void {
    this.maxConcurrency = Math.max(1, concurrency);
  }

  /**
   * Pausiert die Ausführung
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Setzt die Ausführung fort
   */
  resume(): void {
    this.isPaused = false;
    this.processQueue();
  }

  /**
   * Bricht alle Tasks ab
   */
  cancelAll(): void {
    // Alle laufenden Tasks abbrechen
    for (const [taskId, token] of this.cancellationTokens.entries()) {
      token.abort();
      this.runningTasks.delete(taskId);
      this.taskResults.set(taskId, {
        taskId,
        status: TaskStatus.CANCELLED,
        startTime: Date.now(),
        endTime: Date.now(),
      });
    }
    this.cancellationTokens.clear();
  }

  /**
   * Bricht einen spezifischen Task ab
   */
  cancelTask(taskId: string): boolean {
    const token = this.cancellationTokens.get(taskId);
    if (token) {
      token.abort();
      this.cancellationTokens.delete(taskId);
      this.runningTasks.delete(taskId);
      this.taskResults.set(taskId, {
        taskId,
        status: TaskStatus.CANCELLED,
        startTime: Date.now(),
        endTime: Date.now(),
      });
      return true;
    }
    return false;
  }

  /**
   * Führt alle Tasks aus
   */
  async execute(): Promise<TaskResult[]> {
    // Reset für neue Ausführung
    this.taskResults.clear();
    this.runningTasks.clear();
    this.cancellationTokens.clear();
    this.isPaused = false;

    // Sortieren Tasks nach Priorität
    const sortedTasks = Array.from(this.tasks.values()).sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    // Topological Sort für Dependencies
    const executionOrder = this.topologicalSort(sortedTasks);

    // Tasks parallel ausführen
    for (const task of executionOrder) {
      await this.executeTask(task);
    }

    return Array.from(this.taskResults.values());
  }

  /**
   * Führt einen spezifischen Task aus
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    // Prüfen ob bereits ausgeführt
    if (this.taskResults.has(task.id)) {
      return this.taskResults.get(task.id)!;
    }

    // Prüfen ob Dependencies erfüllt sind
    const dependenciesMet = this.checkDependencies(task);
    if (!dependenciesMet) {
      return {
        taskId: task.id,
        status: TaskStatus.PENDING,
        startTime: Date.now(),
      };
    }

    // Warten auf verfügbaren Slot
    while (
      this.runningTasks.size >= this.maxConcurrency ||
      this.isPaused
    ) {
      await this.delay(100);
    }

    // Task starten
    const abortController = new AbortController();
    this.cancellationTokens.set(task.id, abortController);
    this.runningTasks.add(task.id);

    const startTime = Date.now();
    let result: TaskResult;

    try {
      // Task mit Timeout ausführen
      const taskPromise = task.execute();
      
      // Timeout Promise erstellen
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Task timeout nach ${task.timeout || 60000}ms`));
        }, task.timeout || 60000);
        
        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
        }, { once: true });
      });

      const taskResult = await Promise.race([taskPromise, timeoutPromise]);

      result = {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        result: taskResult,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      };

      console.log(`[ParallelExecutor] Completed task: ${task.name}`);
    } catch (error) {
      result = {
        taskId: task.id,
        status: TaskStatus.FAILED,
        error: error as Error,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      };
      console.error(`[ParallelExecutor] Failed task: ${task.name}`, error);
    } finally {
      this.runningTasks.delete(task.id);
      this.cancellationTokens.delete(task.id);
    }

    this.taskResults.set(task.id, result);

    // Versuche, Tasks in der Queue zu starten
    this.processQueue();

    return result;
  }

  /**
   * Verarbeitet die Queue von Tasks
   */
  private async processQueue(): Promise<void> {
    if (this.isPaused) return;

    // Alle Tasks sammeln, die bereit sind
    const readyTasks: Task[] = [];

    for (const task of this.tasks.values()) {
      if (
        !this.taskResults.has(task.id) && // Nicht ausgeführt
        this.checkDependencies(task) && // Dependencies erfüllt
        !this.runningTasks.has(task.id) // Nicht gerade laufend
      ) {
        readyTasks.push(task);
      }
    }

    // Nach Priorität sortieren
    readyTasks.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    // Tasks ausführen (maxConcurrency)
    for (const task of readyTasks.slice(0, this.maxConcurrency)) {
      this.executeTask(task).catch((error) => {
        console.error(`[ParallelExecutor] Error processing task:`, error);
      });
    }
  }

  /**
   * Prüft ob alle Dependencies eines Tasks erfüllt sind
   */
  private checkDependencies(task: Task): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every((depId) => {
      const result = this.taskResults.get(depId);
      return result?.status === TaskStatus.COMPLETED;
    });
  }

  /**
   * Führt Topological Sort durch
   */
  private topologicalSort(tasks: Task[]): Task[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: Task[] = [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const inDegree = new Map<string, number>();

    // In-Degrees berechnen
    for (const task of tasks) {
      const deps = task.dependencies || [];
      inDegree.set(task.id, deps.length);
    }

    // Topological Sort
    const visit = (taskId: string): void => {
      if (visiting.has(taskId)) {
        // Zyklus erkannt
        throw new Error(`Zyklische Dependencies erkannt bei Task: ${taskId}`);
      }

      visiting.add(taskId);
      const task = taskMap.get(taskId)!;
      const deps = task.dependencies || [];

      for (const depId of deps) {
        if (!visited.has(depId)) {
          visit(depId);
        }
      }

      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(task);
    };

    // Alle Tasks besuchen
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }

    return sorted;
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): ExecutionStats {
    const completed = Array.from(this.taskResults.values());
    const completedTasks = completed.filter(
      (r) => r.status === TaskStatus.COMPLETED
    ).length;
    const failedTasks = completed.filter(
      (r) => r.status === TaskStatus.FAILED
    ).length;

    let totalDuration = 0;
    let completedWithDuration = 0;

    for (const result of completed) {
      if (result.duration) {
        totalDuration += result.duration;
        completedWithDuration++;
      }
    }

    return {
      totalTasks: this.tasks.size,
      completedTasks,
      failedTasks,
      totalDuration,
      averageDuration:
        completedWithDuration > 0 ? totalDuration / completedWithDuration : 0,
      concurrency: this.maxConcurrency,
    };
  }

  /**
   * Gibt Ergebnisse für alle Tasks zurück
   */
  getResults(): TaskResult[] {
    return Array.from(this.taskResults.values());
  }

  /**
   * Gibt Ergebnisse für spezifische Tasks zurück
   */
  getTaskResult(taskId: string): TaskResult | undefined {
    return this.taskResults.get(taskId);
  }

  /**
   * Prüft ob alle Tasks abgeschlossen sind
   */
  isComplete(): boolean {
    return (
      this.taskResults.size === this.tasks.size &&
      Array.from(this.taskResults.values()).every(
        (r) =>
          r.status === TaskStatus.COMPLETED ||
          r.status === TaskStatus.FAILED ||
          r.status === TaskStatus.CANCELLED
      )
    );
  }

  /**
   * Löscht alle Aufgaben und Ergebnisse
   */
  clear(): void {
    this.tasks.clear();
    this.taskResults.clear();
    this.runningTasks.clear();
    this.cancellationTokens.clear();
    this.isPaused = false;
  }

  /**
   * Hilfsfunktion für Delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// --- Singleton-Instance ---

let instance: ParallelExecutor | null = null;

export function getParallelExecutor(
  maxConcurrency?: number
): ParallelExecutor {
  if (!instance) {
    instance = new ParallelExecutor(maxConcurrency);
  }
  return instance;
}
