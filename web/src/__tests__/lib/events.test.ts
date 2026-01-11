/**
 * EventManager Tests
 * 
 * Tests für das Event-System
 */

import { EventManager, EventType, eventManager, emit, emitAsync, on, once, off, removeAllListeners } from '@/lib/events';

describe('EventManager', () => {
  let emitter: EventManager;

  beforeEach(() => {
    emitter = new EventManager();
  });

  afterEach(() => {
    emitter.removeAllListeners();
  });

  describe('on - Event Listener Registrierung', () => {
    it('sollte einen Listener registrieren', () => {
      const listener = jest.fn();
      emitter.on(EventType.TASK_START, listener);
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'test' })
      );
    });

    it('sollte mehrere Listener für das gleiche Event registrieren', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on(EventType.TASK_START, listener1);
      emitter.on(EventType.TASK_START, listener2);
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('sollte eine eindeutige ID für jeden Listener zurückgeben', () => {
      const id1 = emitter.on(EventType.TASK_START, jest.fn());
      const id2 = emitter.on(EventType.TASK_START, jest.fn());
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });

  describe('off - Event Listener Entfernung', () => {
    it('sollte einen Listener anhand seiner ID entfernen', () => {
      const listener = jest.fn();
      const id = emitter.on(EventType.TASK_START, listener);
      
      emitter.off(EventType.TASK_START, id);
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('sollte nicht-entfernte Listener weiterhin aufrufen', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const id1 = emitter.on(EventType.TASK_START, listener1);
      emitter.on(EventType.TASK_START, listener2);
      
      emitter.off(EventType.TASK_START, id1);
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('emit - Event Dispatching', () => {
    it('sollte Events synchron ausführen', () => {
      const listener = jest.fn();
      let executionOrder: number[] = [];
      
      listener.mockImplementation(() => {
        executionOrder.push(Date.now());
      });
      
      emitter.on(EventType.TASK_START, listener);
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(executionOrder.length).toBe(1);
    });

    it('sollte Payload an Listener übergeben', () => {
      const listener = jest.fn();
      const payload = { taskId: 'test', data: 'value' };
      
      emitter.on(EventType.TASK_START, listener);
      emitter.emit(EventType.TASK_START, payload);
      
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it('sollte Events ohne Listener ignorieren', () => {
      expect(() => {
        emitter.emit(EventType.TASK_START, { taskId: 'test' });
      }).not.toThrow();
    });
  });

  describe('emitAsync - Asynchrone Events', async () => {
    it('sollte Events asynchron ausführen', async () => {
      const listener = jest.fn().mockResolvedValue(undefined);
      
      emitter.on(EventType.TASK_START, listener);
      
      const result = await emitter.emitAsync(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it('sollte auf Fehler asynchroner Listener reagieren', async () => {
      const error = new Error('Test error');
      const listener = jest.fn().mockRejectedValue(error);
      
      emitter.on(EventType.TASK_START, listener);
      
      await expect(emitter.emitAsync(EventType.TASK_START, { taskId: 'test' }))
        .rejects.toThrow();
    });
  });

  describe('removeAllListeners', () => {
    it('sollte alle Listener eines Events entfernen', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on(EventType.TASK_START, listener1);
      emitter.on(EventType.TASK_START, listener2);
      
      emitter.removeAllListeners(EventType.TASK_START);
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('sollte alle Listener aller Events entfernen', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on(EventType.TASK_START, listener1);
      emitter.on(EventType.TASK_COMPLETE, listener2);
      
      emitter.removeAllListeners();
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      emitter.emit(EventType.TASK_COMPLETE, { taskId: 'test' });
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('once - Einmaliger Listener', () => {
    it('sollte Listener nur einmal ausführen', () => {
      const listener = jest.fn();
      
      emitter.once(EventType.TASK_START, listener);
      
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      emitter.emit(EventType.TASK_START, { taskId: 'test2' });
      emitter.emit(EventType.TASK_START, { taskId: 'test3' });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('sollte Listener nach Ausführung automatisch entfernen', () => {
      const listener = jest.fn();
      
      emitter.once(EventType.TASK_START, listener);
      emitter.emit(EventType.TASK_START, { taskId: 'test' });
      
      emitter.emit(EventType.TASK_START, { taskId: 'test2' });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
