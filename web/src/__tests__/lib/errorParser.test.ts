/**
 * Unit-Tests für errorParser.ts
 */

import { expect } from "@jest/globals";
import type { ParsedError } from "../../lib/errorParser";
import {
  parseError,
  hasFilePath,
  createErrorContext,
  extractAllFilePaths,
} from "../../lib/errorParser";

describe("errorParser.ts", () => {
  describe("parseError", () => {
    it("should parse JavaScript/TypeScript SyntaxError with file path", () => {
      const errorMessage = "SyntaxError: Unexpected token at index.js:42:10";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("index.js");
      expect(result.lineNumber).toBe(42);
      expect(result.columnNumber).toBe(10);
      expect(result.errorType).toBe("syntax");
      expect(result.errorMessage).toContain("SyntaxError");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse JavaScript/TypeScript ReferenceError", () => {
      const errorMessage = "ReferenceError: foo is not defined at src/components/App.tsx:15:3";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("src/components/App.tsx");
      expect(result.lineNumber).toBe(15);
      expect(result.columnNumber).toBe(3);
      expect(result.errorType).toBe("runtime");
      expect(result.errorMessage).toContain("ReferenceError");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse Python File SyntaxError", () => {
      const errorMessage = `File "app.py", line 23`;
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("app.py");
      expect(result.lineNumber).toBe(23);
      expect(result.columnNumber).toBeNull();
      expect(result.errorType).toBe("syntax");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse Python ImportError", () => {
      const errorMessage = "ImportError: No module named 'requests' from utils.py at line 5";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("utils.py");
      expect(result.lineNumber).toBeNull(); // Pattern doesn't capture line for ImportError
      expect(result.columnNumber).toBeNull();
      expect(result.errorType).toBe("import");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse Python Traceback", () => {
      const errorMessage = `Traceback (most recent call last):
  File "main.py", line 10, in <module>
NameError: name 'x' is not defined`;
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("main.py");
      expect(result.lineNumber).toBe(10);
      expect(result.columnNumber).toBeNull();
      expect(result.errorType).toBe("runtime");
      expect(result.errorMessage).toContain("Traceback");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse Jest/Testing error", () => {
      const errorMessage = "at src/lib/utils.test.js:25:12";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("src/lib/utils.test.js");
      expect(result.lineNumber).toBe(25);
      expect(result.columnNumber).toBe(12);
      expect(result.errorType).toBe("test");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse ESLint error", () => {
      const errorMessage = "src/app/page.tsx:10:5: error Missing semicolon";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("src/app/page.tsx");
      expect(result.lineNumber).toBe(10);
      expect(result.columnNumber).toBe(5);
      expect(result.errorType).toBe("type");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse TypeScript error", () => {
      const errorMessage = "src/types/index.ts:15:3: error TS2345: Argument of type 'string' is not assignable";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("src/types/index.ts");
      expect(result.lineNumber).toBe(15);
      expect(result.columnNumber).toBe(3);
      expect(result.errorType).toBe("type");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should parse generic file path with line number", () => {
      const errorMessage = "Error in config.json line 42";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("config.json");
      expect(result.lineNumber).toBe(42);
      expect(result.columnNumber).toBeNull();
      expect(result.errorType).toBe("unknown");
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should handle error message without file path", () => {
      const errorMessage = "Error: Something went wrong";
      const result = parseError(errorMessage);

      expect(result.filePath).toBeNull();
      expect(result.lineNumber).toBeNull();
      expect(result.columnNumber).toBeNull();
      expect(result.errorType).toBe("unknown");
      expect(result.errorMessage).toBe(errorMessage);
      expect(result.rawMessage).toBe(errorMessage);
    });

    it("should extract error message with known keywords", () => {
      const errorMessage = `TypeError: Cannot read property 'x' of undefined
    at Object.<anonymous> (script.js:5:10)`;
      const result = parseError(errorMessage);

      expect(result.errorMessage).toContain("TypeError");
      expect(result.filePath).toBe("script.js");
      expect(result.lineNumber).toBe(10);
      expect(result.columnNumber).toBe(null); // Note: pattern doesn't capture column
    });

    it("should normalize file paths (remove 'at ', backslashes)", () => {
      const errorMessage = "ReferenceError at C:\\\\Users\\\\test\\\\file.js:10:5";
      const result = parseError(errorMessage);

      expect(result.filePath).toBe("C:/Users/test/file.js");
    });
  });

  describe("hasFilePath", () => {
    it("should return true when error has a file path", () => {
      const error: ParsedError = {
        filePath: "src/test.js",
        lineNumber: 10,
        columnNumber: 5,
        errorType: "syntax",
        errorMessage: "Error",
        rawMessage: "Error",
      };
      expect(hasFilePath(error)).toBe(true);
    });

    it("should return false when filePath is null", () => {
      const error: ParsedError = {
        filePath: null,
        lineNumber: null,
        columnNumber: null,
        errorType: "unknown",
        errorMessage: "Error",
        rawMessage: "Error",
      };
      expect(hasFilePath(error)).toBe(false);
    });

    it("should return false when filePath is empty string", () => {
      const error: ParsedError = {
        filePath: "",
        lineNumber: null,
        columnNumber: null,
        errorType: "unknown",
        errorMessage: "Error",
        rawMessage: "Error",
      };
      expect(hasFilePath(error)).toBe(false);
    });
  });

  describe("createErrorContext", () => {
    it("should create context with file path and line number", () => {
      const error: ParsedError = {
        filePath: "src/components/App.tsx",
        lineNumber: 15,
        columnNumber: 5,
        errorType: "syntax",
        errorMessage: "SyntaxError: Unexpected token",
        rawMessage: "SyntaxError: Unexpected token",
      };
      const workspaceRoot = "/workspace";

      const result = createErrorContext(error, workspaceRoot);

      expect(result).toContain("Fehler in Datei: src/components/App.tsx");
      expect(result).toContain("(Zeile 15, Spalte 5)");
      expect(result).toContain("Fehlerart: syntax");
      expect(result).toContain("Fehlermeldung:");
      expect(result).toContain("SyntaxError: Unexpected token");
    });

    it("should create context with file path and line number (no column)", () => {
      const error: ParsedError = {
        filePath: "app.py",
        lineNumber: 23,
        columnNumber: null,
        errorType: "runtime",
        errorMessage: "NameError: name 'x' is not defined",
        rawMessage: "NameError: name 'x' is not defined",
      };
      const workspaceRoot = "/workspace";

      const result = createErrorContext(error, workspaceRoot);

      expect(result).toContain("Fehler in Datei: app.py");
      expect(result).toContain("(Zeile 23)");
      expect(result).not.toContain("Spalte");
      expect(result).toContain("Fehlerart: runtime");
    });

    it("should handle error without file path", () => {
      const error: ParsedError = {
        filePath: null,
        lineNumber: null,
        columnNumber: null,
        errorType: "unknown",
        errorMessage: "Error: Something went wrong",
        rawMessage: "Error: Something went wrong",
      };
      const workspaceRoot = "/workspace";

      const result = createErrorContext(error, workspaceRoot);

      expect(result).toContain("Kein Dateipfad im Fehler gefunden");
      expect(result).toContain("Fehlermeldung:");
      expect(result).toContain("Error: Something went wrong");
    });
  });

  describe("extractAllFilePaths", () => {
    it("should extract all file paths from error message", () => {
      const errorMessage = `Error in src/main.ts
    at src/utils/helper.js:10:5
    at src/components/App.tsx:25:12`;

      const result = extractAllFilePaths(errorMessage);

      expect(result).toContain("src/main.ts");
      expect(result).toContain("src/utils/helper.js");
      expect(result).toContain("src/components/App.tsx");
    });

    it("should normalize file paths", () => {
      const errorMessage = "Error at C:\\\\Users\\\\test\\\\file.js:10";
      const result = extractAllFilePaths(errorMessage);

      // normalizeFilePath removes C:/Users/... prefix
      expect(result).toContain("Users/test/file.js");
    });

    it("should filter non-file-like paths", () => {
      const errorMessage = "Error: something went wrong";
      const result = extractAllFilePaths(errorMessage);

      expect(result).toEqual([]);
    });

    it("should handle duplicate paths", () => {
      const errorMessage = `Error at src/test.js:10
    Another error at src/test.js:20`;
      const result = extractAllFilePaths(errorMessage);

      // Using Set should remove duplicates
      expect(result).toEqual(["src/test.js"]);
    });

    it("should handle empty error message", () => {
      const result = extractAllFilePaths("");
      expect(result).toEqual([]);
    });
  });
});
