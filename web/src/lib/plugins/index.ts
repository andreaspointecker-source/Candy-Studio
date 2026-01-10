/**
 * Plugin-System für Kaiban Studio
 * 
 * Erweiterbare Architektur durch Plugins.
 * Ermögält das Hinzufügen von Custom Tools, Agents und Event-Handlern.
 */

import { eventManager, EventType } from '../events';
import { Agent, Task } from '../schema';

/**
 * Plugin-Interface
 * 
 * Alle Plugins müssen dieses Interface implementieren.
 */
export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  
  // Optionale Komponenten
  tools?: Tool[];
  agents?: AgentDefinition[];
  eventHandlers?: Partial<Record<EventType, () => void>>;
  
  // Lifecycle Hooks
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  
  // Abhängigkeiten
  dependencies?: string[];
}

/**
 * Tool-Interface für Plugins
 * 
 * Tools können von Agenten verwendet werden.
 */
export interface Tool {
  name: string;
  description: string;
  execute: (context: ToolContext) => Promise<ToolResult>;
  parameters?: Record<string, unknown>;
}

/**
 * Kontext für Tool-Ausführung
 */
export interface ToolContext {
  projectId?: string;
  taskId?: string;
  agentId?: string;
  workspace?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Ergebnis eines Tool-Aufrufs
 */
export interface ToolResult {
  success: boolean;
  output?: string;
  data?: unknown;
  error?: string;
}

/**
 * Agent-Definition für Plugins
 * 
 * Ermögält das Hinzufügen von vordefinierten Agenten.
 */
export interface AgentDefinition {
  id?: string;
  name: string;
  role: string;
  goal: string;
  capabilities?: string[];
  systemPrompt?: string;
}

/**
 * Plugin-Registry
 * 
 * Verwaltet alle geladenen Plugins.
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private tools: Map<string, Tool> = new Map();
  private agents: Map<string, AgentDefinition> = new Map();
  private loaded: boolean = false;

  /**
   * Ein Plugin registrieren
   * 
   * @param plugin - Das zu registrierende Plugin
   * @throws Error wenn Plugin bereits registriert oder Dependencies fehlen
   */
  async register(plugin: Plugin): Promise<void> {
    // Prüfen ob Plugin bereits registriert
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Dependencies prüfen
    if (plugin.dependencies) {
      const missingDeps = plugin.dependencies.filter(
        (dep) => !this.plugins.has(dep)
      );
      if (missingDeps.length > 0) {
        throw new Error(
          `Plugin '${plugin.name}' has missing dependencies: ${missingDeps.join(', ')}`
        );
      }
    }

    // Plugin hinzufügen
    this.plugins.set(plugin.name, plugin);

    // Tools registrieren
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.tools.set(`${plugin.name}:${tool.name}`, tool);
      }
    }

    // Agents registrieren
    if (plugin.agents) {
      for (const agent of plugin.agents) {
        const agentId = agent.id || `${plugin.name}:${agent.name}`;
        this.agents.set(agentId, { ...agent, id: agentId });
      }
    }

    // Event-Handler registrieren
    if (plugin.eventHandlers) {
      for (const [eventType, handler] of Object.entries(plugin.eventHandlers)) {
        eventManager.on(eventType as EventType, handler, {
          priority: 10,
        });
      }
    }

    // onLoad Hook aufrufen
    if (plugin.onLoad) {
      await plugin.onLoad();
    }

    console.log(`[PluginManager] Plugin '${plugin.name}' v${plugin.version} registered`);
  }

  /**
   * Ein Plugin deregistrieren
   * 
   * @param name - Name des Plugins
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    // Event-Handler entfernen
    if (plugin.eventHandlers) {
      for (const eventType of Object.keys(plugin.eventHandlers)) {
        eventManager.removeAllListeners(eventType as EventType);
      }
    }

    // onUnload Hook aufrufen
    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    // Tools entfernen
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.tools.delete(`${name}:${tool.name}`);
      }
    }

    // Agents entfernen
    if (plugin.agents) {
      for (const agent of plugin.agents) {
        const agentId = agent.id || `${name}:${agent.name}`;
        this.agents.delete(agentId);
      }
    }

    // Plugin entfernen
    this.plugins.delete(name);

    console.log(`[PluginManager] Plugin '${name}' unregistered`);
  }

  /**
   * Ein Tool abrufen
   * 
   * @param name - Vollständiger Name des Tools (plugin:tool)
   * @returns Das Tool oder undefined
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Alle Tools eines Plugins abrufen
   * 
   * @param pluginName - Name des Plugins
   * @returns Array von Tools
   */
  getToolsByPlugin(pluginName: string): Tool[] {
    const tools: Tool[] = [];
    for (const [key, tool] of this.tools.entries()) {
      if (key.startsWith(`${pluginName}:`)) {
        tools.push(tool);
      }
    }
    return tools;
  }

  /**
   * Alle registrierten Tools abrufen
   * 
   * @returns Map von Tool-Namen zu Tools
   */
  getAllTools(): Map<string, Tool> {
    return new Map(this.tools);
  }

  /**
   * Einen Tool ausführen
   * 
   * @param name - Vollständiger Name des Tools
   * @param context - Ausführungskontext
   * @returns Promise mit ToolResult
   */
  async executeTool(name: string, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      const result = await tool.execute(context);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Eine Agent-Definition abrufen
   * 
   * @param id - ID des Agents
   * @returns AgentDefinition oder undefined
   */
  getAgent(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * Alle Agents eines Plugins abrufen
   * 
   * @param pluginName - Name des Plugins
   * @returns Array von AgentDefinitions
   */
  getAgentsByPlugin(pluginName: string): AgentDefinition[] {
    const agents: AgentDefinition[] = [];
    for (const [id, agent] of this.agents.entries()) {
      if (id.startsWith(`${pluginName}:`)) {
        agents.push(agent);
      }
    }
    return agents;
  }

  /**
   * Alle registrierten Agents abrufen
   * 
   * @returns Map von Agent-IDs zu AgentDefinitions
   */
  getAllAgents(): Map<string, AgentDefinition> {
    return new Map(this.agents);
  }

  /**
   * Ein Plugin abrufen
   * 
   * @param name - Name des Plugins
   * @returns Plugin oder undefined
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Alle registrierten Plugins abrufen
   * 
   * @returns Array von Plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Prüfen ob ein Plugin geladen ist
   * 
   * @param name - Name des Plugins
   * @returns boolean
   */
  isLoaded(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Alle Plugins deregistrieren
   */
  async unloadAll(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());
    for (const name of pluginNames) {
      await this.unregister(name);
    }
  }

  /**
   * System-Informationen abrufen
   * 
   * @returns Objekt mit System-Status
   */
  getSystemInfo() {
    return {
      loaded: this.loaded,
      pluginCount: this.plugins.size,
      toolCount: this.tools.size,
      agentCount: this.agents.size,
      plugins: Array.from(this.plugins.keys()),
    };
  }
}

/**
 * Singleton-Instanz des PluginManagers
 */
export const pluginManager = new PluginManager();

/**
 * Convenience-Funktionen
 */
export const registerPlugin = (plugin: Plugin) => {
  return pluginManager.register(plugin);
};

export const unregisterPlugin = (name: string) => {
  return pluginManager.unregister(name);
};

export const getTool = (name: string) => {
  return pluginManager.getTool(name);
};

export const getAllTools = () => {
  return pluginManager.getAllTools();
};

export const executeTool = (name: string, context: ToolContext) => {
  return pluginManager.executeTool(name, context);
};

export const getAgent = (id: string) => {
  return pluginManager.getAgent(id);
};

export const getAllAgents = () => {
  return pluginManager.getAllAgents();
};

export const getPlugin = (name: string) => {
  return pluginManager.getPlugin(name);
};

export const getAllPlugins = () => {
  return pluginManager.getAllPlugins();
};

export const isPluginLoaded = (name: string) => {
  return pluginManager.isLoaded(name);
};

export const unloadAllPlugins = () => {
  return pluginManager.unloadAll();
};

export const getSystemInfo = () => {
  return pluginManager.getSystemInfo();
};
