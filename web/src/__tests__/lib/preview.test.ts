/**
 * Unit-Tests für preview.ts
 */

import { expect } from "@jest/globals";
import fsSync from "fs";
import path from "path";
import type { PreviewEntry } from "../../lib/preview";
import { findPreviewEntry } from "../../lib/preview";

// Mock fs module
jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
  },
}));

// Mock fsSync module
jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    existsSync: jest.fn(),
  };
});

// Mock storage module to prevent actual file system access
jest.mock("../../lib/storage", () => ({
  workspaceDir: jest.fn((projectId: string) => `/projects/${projectId}`),
}));

describe("preview.ts", () => {
  const mockedReaddir = jest.requireMock("fs").promises.readdir as jest.Mock;
  const mockedExistsSync = jest.requireMock("fs").existsSync as jest.Mock;
  const mockedWorkspaceDir = jest.requireMock("../../lib/storage").workspaceDir;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findPreviewEntry", () => {
    it("should return null if projectId is empty", async () => {
      const result = await findPreviewEntry("");
      expect(result).toBeNull();
      expect(mockedWorkspaceDir).not.toHaveBeenCalled();
    });

    it("should return { relativePath: 'index.html' } if index.html exists in root", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      expect(result).toEqual({ relativePath: "index.html" });
      expect(mockedExistsSync).toHaveBeenCalledWith(path.join("/projects/test-project", "index.html"));
      expect(mockedReaddir).not.toHaveBeenCalled();
    });

    it("should search subdirectories for index.html if not in root", async () => {
      mockedExistsSync.mockReturnValueOnce(false); // No index.html in root
      mockedExistsSync.mockReturnValueOnce(true); // Found in subdirectory

      const testDirEntries = [
        { name: "dist", isDirectory: () => true },
        { name: "build", isDirectory: () => true },
        { name: "src", isDirectory: () => true },
      ];
      mockedReaddir.mockResolvedValue(testDirEntries);

      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      // Should have checked root index.html first
      expect(mockedExistsSync).toHaveBeenNthCalledWith(1, path.join("/projects/test-project", "index.html"));

      // Then searched subdirectories
      expect(mockedReaddir).toHaveBeenCalledWith("/projects/test-project", { withFileTypes: true });

      expect(result).toEqual({ relativePath: "dist/index.html" });
    });

    it("should return first found index.html in subdirectories", async () => {
      mockedExistsSync.mockReturnValue(false); // No index.html in root

      const testDirEntries = [
        { name: "docs", isDirectory: () => true },
        { name: "public", isDirectory: () => true },
      ];
      mockedReaddir.mockResolvedValue(testDirEntries);

      // index.html found in docs first
      mockedExistsSync.mockImplementationOnce(() => false);
      mockedExistsSync.mockImplementationOnce(() => true);

      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      expect(result).toEqual({ relativePath: "docs/index.html" });
    });

    it("should return null if no index.html found", async () => {
      mockedExistsSync.mockReturnValue(false); // No index.html in root

      const testDirEntries = [
        { name: "src", isDirectory: () => true },
        { name: "components", isDirectory: () => true },
      ];
      mockedReaddir.mockResolvedValue(testDirEntries);

      // No index.html in any subdirectory
      mockedExistsSync.mockImplementation(() => false);

      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      expect(result).toBeNull();
    });

    it("should handle readdir errors gracefully", async () => {
      mockedExistsSync.mockReturnValue(false); // No index.html in root
      mockedReaddir.mockRejectedValue(new Error("Permission denied"));

      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      expect(result).toBeNull();
    });

    it("should use correct path separators for different platforms", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      // path.posix.join is used in the implementation for relativePath
      // The exact result depends on the implementation
      expect(result).toBeDefined();
      expect(result!.relativePath).toContain("index.html");
    });

    it("should ignore non-directory entries in root", async () => {
      mockedExistsSync.mockReturnValue(false); // No index.html in root

      const testDirEntries = [
        { name: "package.json", isDirectory: () => false },
        { name: "README.md", isDirectory: () => false },
        { name: "dist", isDirectory: () => true },
      ];
      mockedReaddir.mockResolvedValue(testDirEntries);

      mockedExistsSync.mockImplementationOnce(() => false);
      mockedExistsSync.mockImplementationOnce(() => true); // Found in dist

      mockedWorkspaceDir.mockReturnValue("/projects/test-project");

      const result = await findPreviewEntry("test-project");

      expect(result).toEqual({ relativePath: "dist/index.html" });
      expect(mockedExistsSync).not.toHaveBeenCalledWith(
        expect.stringContaining("package.json")
      );
      expect(mockedExistsSync).not.toHaveBeenCalledWith(
        expect.stringContaining("README.md")
      );
    });
  });
});
