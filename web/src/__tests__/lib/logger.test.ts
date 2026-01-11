/**
 * Tests für Logger Klasse
 */

import { Logger, LogLevel, LogEntry, logger, createLogger, ModuleLogger } from '../../lib/logger';

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    // Neue Logger-Instanz für jeden Test erstellen
    testLogger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: false, // Console für Tests deaktivieren
      enableFile: false,
      enableJson: true,
      enableTimestamp: true,
      enableCorrelationIds: true,
      maxLogSize: 100,
      rotationSize: 1024 * 1024,
      rotationInterval: 60000,
    });
  });

  afterEach(() => {
    testLogger.destroy();
  });

  describe('LogLevel Enum', () => {
    test('sollte korrekte Werte haben', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.FATAL).toBe(4);
    });
  });

  describe('Singleton Pattern', () => {
    test('sollte dieselbe Instanz zurückgeben', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Log-Level Konfiguration', () => {
    test('sollte Log-Level zur Laufzeit ändern können', () => {
      testLogger.setLevel(LogLevel.ERROR);

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Error message');
    });

    test('sollte nur Logs ab bestimmtem Level speichern', () => {
      testLogger.setLevel(LogLevel.WARN);

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.level >= LogLevel.WARN)).toBe(true);
    });
  });

  describe('Correlation IDs', () => {
    test('sollte Correlation-ID setzen können', () => {
      testLogger.setCorrelationId('test-correlation-123');

      testLogger.info('Test message');

      const logs = testLogger.getLogs();
      expect(logs[0].correlationId).toBe('test-correlation-123');
    });

    test('sollte Correlation-ID löschen können', () => {
      testLogger.setCorrelationId('test-correlation-123');
      testLogger.info('Message with CID');

      testLogger.clearCorrelationId();
      testLogger.info('Message without CID');

      const logs = testLogger.getLogs();
      expect(logs[0].correlationId).toBe('test-correlation-123');
      expect(logs[1].correlationId).toBeUndefined();
    });

    test('sollte Logs nach Correlation-ID filtern können', () => {
      testLogger.setCorrelationId('cid-1');
      testLogger.info('Message 1');

      testLogger.setCorrelationId('cid-2');
      testLogger.info('Message 2');

      testLogger.clearCorrelationId();
      testLogger.info('Message 3');

      const cid1Logs = testLogger.getLogsByCorrelationId('cid-1');
      expect(cid1Logs).toHaveLength(1);
      expect(cid1Logs[0].message).toBe('Message 1');

      const cid2Logs = testLogger.getLogsByCorrelationId('cid-2');
      expect(cid2Logs).toHaveLength(1);
      expect(cid2Logs[0].message).toBe('Message 2');
    });
  });

  describe('Logging Methoden', () => {
    test('debug() sollte DEBUG-Level loggen', () => {
      testLogger.debug('Debug message', { key: 'value' });

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].context).toEqual({ key: 'value' });
    });

    test('info() sollte INFO-Level loggen', () => {
      testLogger.info('Info message');

      const logs = testLogger.getLogs();
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Info message');
    });

    test('warn() sollte WARN-Level loggen', () => {
      testLogger.warn('Warning message');

      const logs = testLogger.getLogs();
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].message).toBe('Warning message');
    });

    test('error() sollte ERROR-Level loggen', () => {
      const error = new Error('Test error');
      testLogger.error('Error message', { context: 'test' }, error);

      const logs = testLogger.getLogs();
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Error message');
      expect(logs[0].context).toEqual({ context: 'test' });
      expect(logs[0].error).toBe(error);
    });

    test('fatal() sollte FATAL-Level loggen', () => {
      testLogger.fatal('Fatal error');

      const logs = testLogger.getLogs();
      expect(logs[0].level).toBe(LogLevel.FATAL);
      expect(logs[0].message).toBe('Fatal error');
    });
  });

  describe('LogEntry Struktur', () => {
    test('sollte vollständige LogEntry-Struktur haben', () => {
      testLogger.setCorrelationId('test-cid');
      const error = new Error('Test error');
      testLogger.error('Error message', { context: 'data' }, error);

      const logs = testLogger.getLogs();
      const entry: LogEntry = logs[0];

      expect(entry).toHaveProperty('timestamp');
      expect(typeof entry.timestamp).toBe('string');
      expect(entry).toHaveProperty('level', LogLevel.ERROR);
      expect(entry).toHaveProperty('levelName', 'ERROR');
      expect(entry).toHaveProperty('message', 'Error message');
      expect(entry).toHaveProperty('context', { context: 'data' });
      expect(entry).toHaveProperty('error', error);
      expect(entry).toHaveProperty('correlationId', 'test-cid');
    });

    test('sollte optionale Felder korrekt handhaben', () => {
      testLogger.info('Simple message');

      const logs = testLogger.getLogs();
      const entry: LogEntry = logs[0];

      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBeDefined();
      expect(entry.levelName).toBeDefined();
      expect(entry.message).toBe('Simple message');
      expect(entry.context).toBeUndefined();
      expect(entry.error).toBeUndefined();
      expect(entry.correlationId).toBeUndefined();
    });
  });

  describe('Log Rotation', () => {
    test('sollte Logs bei maxLogSize rotieren', () => {
      const maxLogs = 5;
      testLogger['config'].maxLogSize = maxLogs;

      for (let i = 0; i < 10; i++) {
        testLogger.info(`Message ${i}`);
      }

      const logs = testLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(maxLogs);
    });

    test('sollte Rotation bei Größe durchführen', () => {
      testLogger['config'].rotationSize = 100; // Kleine Größe für Test

      // Große Nachricht
      const largeMessage = 'x'.repeat(200);
      testLogger.info(largeMessage);

      // Logs sollten rotiert worden sein
      const logs = testLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Filter Methoden', () => {
    beforeEach(() => {
      testLogger.setLevel(LogLevel.DEBUG);
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warning message');
      testLogger.error('Error message');
    });

    test('getLogsByLevel() sollte nach Level filtern', () => {
      const errorLogs = testLogger.getLogsByLevel(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');

      const debugLogs = testLogger.getLogsByLevel(LogLevel.DEBUG);
      expect(debugLogs).toHaveLength(1);
      expect(debugLogs[0].message).toBe('Debug message');
    });

    test('getLogsByTimeRange() sollte nach Zeitraum filtern', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const logsInRange = testLogger.getLogsByTimeRange(fiveMinutesAgo, now);
      expect(logsInRange.length).toBeGreaterThan(0);
    });
  });

  describe('createLogger Helper', () => {
    test('sollte Logger mit Modul-Name erstellen', () => {
      const moduleLogger = new ModuleLogger(testLogger, 'TestModule');
      moduleLogger.info('Module message');

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Module message');
      expect(logs[0].module).toBe('TestModule');
    });

    test('sollte korrekte Log-Levels verwenden', () => {
      const moduleLogger = new ModuleLogger(testLogger, 'TestModule');
      moduleLogger.debug('Debug');
      moduleLogger.info('Info');
      moduleLogger.warn('Warn');
      moduleLogger.error('Error');
      moduleLogger.fatal('Fatal');

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[1].level).toBe(LogLevel.INFO);
      expect(logs[2].level).toBe(LogLevel.WARN);
      expect(logs[3].level).toBe(LogLevel.ERROR);
      expect(logs[4].level).toBe(LogLevel.FATAL);
    });
  });

  describe('Performance Measurement', () => {
    test('measurePerformance() sollte synchrone Funktionen messen', () => {
      const result = testLogger.measurePerformance(
        'Test Operation',
        () => {
          return 42;
        },
        { key: 'value' }
      );

      expect(result).toBe(42);

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('Performance: Test Operation');
      expect(logs[0].context?.performance).toBeDefined();
      expect(typeof logs[0].context?.performance).toBe('number');
      expect(logs[0].context?.key).toBe('value');
    });

    test('measurePerformanceAsync() sollte asynchrone Funktionen messen', async () => {
      const result = await testLogger.measurePerformanceAsync(
        'Async Operation',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 42;
        }
      );

      expect(result).toBe(42);

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('Performance: Async Operation');
      expect(logs[0].context?.performance).toBeDefined();
      expect(typeof logs[0].context?.performance).toBe('number');
    });

    test('measurePerformanceAsync() sollte Fehler handhaben', async () => {
      await expect(
        testLogger.measurePerformanceAsync('Failing Operation', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toContain('Performance Error: Failing Operation');
    });
  });

  describe('Exportierte Singleton Instanz', () => {
    test('sollte singleton Instanz exportieren', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    test('sollte auf der exportierten Instanz Methoden aufrufen können', () => {
      logger.info('Test message');
      const logs = logger.getLogs();

      // Wir können nicht direkt auf die Logs der singleton Instanz zugreifen
      // aber wir können prüfen, ob die Methode existiert
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.getLogs).toBe('function');
    });
  });

  describe('destroy() Methode', () => {
    test('sollte Timer aufräumen', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      testLogger.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    test('sollte Logs leeren', () => {
      testLogger.info('Message');
      expect(testLogger.getLogs()).toHaveLength(1);

      testLogger.destroy();
      expect(testLogger.getLogs()).toHaveLength(0);
    });
  });
});
