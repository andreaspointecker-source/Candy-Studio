/**
 * Storage Tests
 * 
 * Tests für das Storage-System
 */

import { storage } from '@/lib/storage';

describe('Storage', () => {
  beforeEach(() => {
    storage.clear();
  });

  afterEach(() => {
    storage.clear();
  });

  describe('CRUD Operationen', () => {
    it('sollte einen Wert speichern und abrufen', () => {
      const key = 'test-key';
      const value = { test: 'data' };

      storage.setItem(key, value);
      const retrieved = storage.getItem(key);

      expect(retrieved).toEqual(value);
    });

    it('sollte null für nicht-existente Keys zurückgeben', () => {
      const retrieved = storage.getItem('non-existent-key');

      expect(retrieved).toBeNull();
    });

    it('sollte einen Wert aktualisieren', () => {
      const key = 'test-key';
      const initialValue = { version: 1 };
      const updatedValue = { version: 2 };

      storage.setItem(key, initialValue);
      storage.setItem(key, updatedValue);

      const retrieved = storage.getItem(key);

      expect(retrieved).toEqual(updatedValue);
    });

    it('sollte einen Wert löschen', () => {
      const key = 'test-key';
      const value = { test: 'data' };

      storage.setItem(key, value);
      storage.removeItem(key);

      const retrieved = storage.getItem(key);

      expect(retrieved).toBeNull();
    });

    it('sollte alle Werte löschen', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      storage.setItem('key3', 'value3');

      storage.clear();

      expect(storage.getItem('key1')).toBeNull();
      expect(storage.getItem('key2')).toBeNull();
      expect(storage.getItem('key3')).toBeNull();
    });

    it('sollte alle Keys zurückgeben', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      storage.setItem('key3', 'value3');

      const keys = storage.getAllKeys();

      expect(keys).toEqual(expect.arrayContaining(['key1', 'key2', 'key3']));
      expect(keys.length).toBe(3);
    });

    it('sollte alle Werte zurückgeben', () => {
      storage.setItem('key1', { value: 1 });
      storage.setItem('key2', { value: 2 });
      storage.setItem('key3', { value: 3 });

      const items = storage.getAll();

      expect(items).toEqual({
        'key1': { value: 1 },
        'key2': { value: 2 },
        'key3': { value: 3 },
      });
    });
  });

  describe('Persistence', () => {
    it('sollte Werte im localStorage speichern', () => {
      const key = 'persist-key';
      const value = { data: 'persistent' };

      storage.setItem(key, value);

      const localStorageItem = localStorage.getItem(`kaiban-${key}`);

      expect(localStorageItem).toBeTruthy();
      expect(JSON.parse(localStorageItem!)).toEqual(value);
    });

    it('sollte Werte aus localStorage laden', () => {
      const key = 'load-key';
      const value = { data: 'loaded' };

      localStorage.setItem(`kaiban-${key}`, JSON.stringify(value));
      storage.clear(); // Clear in-memory storage

      const retrieved = storage.getItem(key);

      expect(retrieved).toEqual(value);
    });
  });

  describe('Error Handling', () => {
    it('sollte mit ungültigen JSON-Daten umgehen können', () => {
      const key = 'json-error-key';
      localStorage.setItem(`kaiban-${key}`, 'invalid json{');

      expect(() => storage.getItem(key)).not.toThrow();
      expect(storage.getItem(key)).toBeNull();
    });

    it('sollte null Keys korrekt handhaben', () => {
      expect(() => storage.getItem(null as any)).not.toThrow();
      expect(() => storage.getItem(undefined as any)).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('sollte verschiedene Datentypen speichern', () => {
      const stringKey = 'string-key';
      const numberKey = 'number-key';
      const objectKey = 'object-key';
      const arrayKey = 'array-key';

      storage.setItem(stringKey, 'string value');
      storage.setItem(numberKey, 42);
      storage.setItem(objectKey, { nested: { data: 'test' });
      storage.setItem(arrayKey, [1, 2, 3]);

      expect(storage.getItem(stringKey)).toBe('string value');
      expect(storage.getItem(numberKey)).toBe(42);
      expect(storage.getItem(objectKey)).toEqual({ nested: { data: 'test' });
      expect(storage.getItem(arrayKey)).toEqual([1, 2, 3]);
    });

    it('sollte komplexe Objekte speichern', () => {
      const complexObject = {
        id: '123',
        name: 'Test Project',
        settings: {
          theme: 'dark',
          language: 'de',
        },
        tasks: [
          { id: '1', title: 'Task 1' },
          { id: '2', title: 'Task 2' },
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      } as const;

      storage.setItem('complex', complexObject);
      const retrieved = storage.getItem('complex');

      expect(retrieved).toEqual(complexObject);
    });
  });
});
