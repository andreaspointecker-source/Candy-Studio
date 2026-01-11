/**
 * Agent-Kommunikations-System
 * 
 * Ermöglicht Kommunikation zwischen multiplen Agents mit
 * Message-Bus, Routing und Conversation-History
 */

export enum MessageType {
  REQUEST = "request",
  RESPONSE = "response",
  NOTIFICATION = "notification",
  ERROR = "error",
}

export interface AgentMessage {
  id: string;
  type: MessageType;
  sender: string;
  receiver?: string; // undefined = broadcast
  content: string;
  timestamp: number;
  correlationId?: string; // Für Request-Response Matching
  priority?: number; // 1-10, 10 = höchste
  metadata?: {
    conversationId?: string;
    replyTo?: string;
    toolCall?: string;
    toolResult?: any;
  };
}

export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  isAvailable: boolean;
}

export class AgentCommunicator {
  private messageBus: Map<string, AgentMessage[]> = new Map(); // agentId -> messages
  private agents: Map<string, Agent> = new Map();
  private pendingRequests: Map<string, {
    resolve: (message: AgentMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private conversationHistories: Map<string, AgentMessage[]> = new Map();
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Registriert einen Agent
   */
  registerAgent(agent: Omit<Agent, "isAvailable">): void {
    const fullAgent: Agent = {
      ...agent,
      isAvailable: true,
    };
    this.agents.set(agent.id, fullAgent);
    console.log(`[AgentCommunicator] Registered agent: ${agent.name} (${agent.id})`);
  }

  /**
   * Entfernt einen Agent
   */
  unregisterAgent(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    if (removed) {
      // Alle Nachrichten dieses Agents entfernen
      this.messageBus.delete(agentId);
      console.log(`[AgentCommunicator] Unregistered agent: ${agentId}`);
    }
    return removed;
  }

  /**
   * Setzt die Verfügbarkeit eines Agents
   */
  setAgentAvailability(agentId: string, isAvailable: boolean): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.isAvailable = isAvailable;
    return true;
  }

  /**
   * Sendet eine Nachricht an einen spezifischen Agent
   */
  async sendToAgent(
    senderId: string,
    receiverId: string,
    content: string,
    metadata?: AgentMessage["metadata"]
  ): Promise<AgentMessage> {
    const receiver = this.agents.get(receiverId);
    if (!receiver) {
      throw new Error(`Agent ${receiverId} nicht gefunden`);
    }

    if (!receiver.isAvailable) {
      throw new Error(`Agent ${receiverId} ist nicht verfügbar`);
    }

    const message: AgentMessage = {
      id: this.generateMessageId(),
      type: MessageType.REQUEST,
      sender: senderId,
      receiver: receiverId,
      content,
      timestamp: Date.now(),
      metadata,
    };

    // Nachricht an Queue des Empfängers hinzufügen
    const queue = this.messageBus.get(receiverId) || [];
    queue.push(message);
    this.messageBus.set(receiverId, queue);

    // Conversation-History speichern
    this.addToConversationHistory(message);

    return message;
  }

  /**
   * Sendet eine Request-Nachricht und wartet auf Response
   */
  async request(
    senderId: string,
    receiverId: string,
    content: string,
    metadata?: AgentMessage["metadata"],
    timeout?: number
  ): Promise<AgentMessage> {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const actualTimeout = timeout || this.defaultTimeout;

    // Promise für Response erstellen
    const promise = new Promise<AgentMessage>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(
          new Error(`Request timeout nach ${actualTimeout}ms`)
        );
      }, actualTimeout);

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutId,
      });
    });

    // Request senden
    await this.sendToAgent(senderId, receiverId, content, {
      ...metadata,
      correlationId,
    });

    return promise;
  }

  /**
   * Broadcastet eine Nachricht an alle Agents
   */
  async broadcast(
    senderId: string,
    content: string,
    messageType: MessageType = MessageType.NOTIFICATION
  ): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      type: messageType,
      sender: senderId,
      content,
      timestamp: Date.now(),
    };

    // An alle Agents senden
    for (const [agentId] of this.agents) {
      if (agentId === senderId) continue; // Nicht an sich selbst senden

      const queue = this.messageBus.get(agentId) || [];
      queue.push({ ...message, receiver: agentId });
      this.messageBus.set(agentId, queue);
    }

    console.log(`[AgentCommunicator] Broadcast from ${senderId} to all agents`);
  }

  /**
   * Empfängt Nachrichten für einen Agent
   */
  receiveMessages(agentId: string): AgentMessage[] {
    const queue = this.messageBus.get(agentId) || [];
    this.messageBus.set(agentId, []); // Queue leeren
    return queue;
  }

  /**
   * Sendet eine Response-Nachricht
   */
  sendResponse(
    senderId: string,
    correlationId: string,
    content: string,
    metadata?: AgentMessage["metadata"]
  ): void {
    const originalRequest = Array.from(this.pendingRequests.entries()).find(
      ([id]) => id === correlationId
    );

    if (!originalRequest) {
      throw new Error(`Kein pending Request für correlationId: ${correlationId}`);
    }

    const message: AgentMessage = {
      id: this.generateMessageId(),
      type: MessageType.RESPONSE,
      sender: senderId,
      content,
      timestamp: Date.now(),
      correlationId,
      metadata,
    };

    // Response senden
    const [, pendingData] = originalRequest;
    clearTimeout(pendingData.timeout);
    this.pendingRequests.delete(correlationId);
    pendingData.resolve(message);

    // Conversation-History speichern
    this.addToConversationHistory(message);
  }

  /**
   * Holt die Conversation-History
   */
  getConversationHistory(conversationId: string, limit?: number): AgentMessage[] {
    const history = this.conversationHistories.get(conversationId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Löscht eine Conversation-History
   */
  clearConversationHistory(conversationId: string): void {
    this.conversationHistories.delete(conversationId);
  }

  /**
   * Gibt alle registrierten Agents zurück
   */
  getRegisteredAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Sucht Agents nach Capabilities
   */
  findAgentsByCapability(capability: string): Agent[] {
    return this.getRegisteredAgents().filter((agent) =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): {
    totalAgents: number;
    availableAgents: number;
    pendingRequests: number;
    totalMessagesQueued: number;
    activeConversations: number;
  } {
    const agents = this.getRegisteredAgents();
    const availableAgents = agents.filter((a) => a.isAvailable);

    let totalMessagesQueued = 0;
    for (const queue of this.messageBus.values()) {
      totalMessagesQueued += queue.length;
    }

    return {
      totalAgents: agents.length,
      availableAgents: availableAgents.length,
      pendingRequests: this.pendingRequests.size,
      totalMessagesQueued,
      activeConversations: this.conversationHistories.size,
    };
  }

  /**
   * Löscht alle pending Requests
   */
  clearPendingRequests(): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Communicator cleared"));
    }
    this.pendingRequests.clear();
  }

  // --- Private Helper-Methoden ---

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToConversationHistory(message: AgentMessage): void {
    const conversationId = message.metadata?.conversationId || "default";
    const history = this.conversationHistories.get(conversationId) || [];
    history.push(message);
    this.conversationHistories.set(conversationId, history);
  }
}

// --- Singleton-Instance ---

let instance: AgentCommunicator | null = null;

export function getAgentCommunicator(): AgentCommunicator {
  if (!instance) {
    instance = new AgentCommunicator();
  }
  return instance;
}
