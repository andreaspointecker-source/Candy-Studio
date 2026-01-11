/**
 * Jest Setup File
 * 
 * Wird ausgeführt, bevor jeder Test-Datei läuft
 * Importiert @testing-library/jest-dom für benutzerdefinierte Matcher
 */

import '@testing-library/jest-dom';

// Globale Konfiguration für alle Tests
jest.setTimeout(10000); // 10 Sekunden Timeout für alle Tests

// Fake Timers können in Tests aktiviert werden
// jest.useFakeTimers();

// Mock-Konfiguration kann hier global konfiguriert werden
// Zum Beispiel:
// global.fetch = jest.fn();
