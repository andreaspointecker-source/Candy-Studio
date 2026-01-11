import { NextRequest } from "next/server";
import { EventEmitter } from "events";

// Erstelle einen globalen Event Emitter
const emitter = new EventEmitter();

// Exportiere den Emitter für andere Module
export function getEventEmitter() {
  return emitter;
}

// Interface für Events
export interface ServerEvent {
  type: "task:started" | "task:progress" | "task:completed" | "task:failed" | "task:cancelled";
  timestamp: number;
  data: unknown;
}

// GET Endpoint für SSE (Server-Sent Events)
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) => {
      // Funktion zum Senden von Events
      const sendEvent = (data: ServerEvent) => {
        const message = "data: " + JSON.stringify(data) + "\n\n";
        controller.enqueue(encoder.encode(message));
      };

      // Sende Initialisierungsnachricht
      sendEvent({
        type: "task:started",
        timestamp: Date.now(),
        data: { message: "SSE Verbindung hergestellt" },
      });

      // Event Listener
      const eventHandler = (event: ServerEvent) => {
        sendEvent(event);
      };

      // Registriere Listener für alle Events
      emitter.on("event", eventHandler);

      // Heartbeat alle 30 Sekunden um Verbindung am Leben zu halten
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      // Cleanup wenn Verbindung geschlossen wird
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        emitter.off("event", eventHandler);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Hilfsfunktion zum Senden von Events von überall aus
export function emitEvent(event: ServerEvent) {
  emitter.emit("event", event);
}
