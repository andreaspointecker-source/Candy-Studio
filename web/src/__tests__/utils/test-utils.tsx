/**
 * Test Utilities
 * 
 * Hilfsfunktionen für Tests
 */

import { render, type RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Benutzerdefinierter Render-Funktion mit zusätzlichen Optionen
 */
export function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Mock für Async-Funktionen
 */
export const mockAsyncFunction = () => {
  const promise = new Promise<any>((resolve, reject) => {
    const fn = jest.fn().mockImplementation(() => promise);
    
    return {
      fn,
      resolve,
      reject,
      promise,
    };
  });
  
  return promise;
};

/**
 * Wartet auf asynchrone Updates
 */
export const waitForAsync = (ms = 0) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Mock für localStorage
 */
export const mockLocalStorage = () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  return localStorageMock;
};

/**
 * Mock für sessionStorage
 */
export const mockSessionStorage = () => {
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });

  return sessionStorageMock;
};

/**
 * Mock für Fetch API
 */
export const mockFetch = () => {
  const fetchMock = jest.fn();
  
  global.fetch = fetchMock as any;
  
  return fetchMock;
};

/**
 * Reset aller Mocks nach Test
 */
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};
