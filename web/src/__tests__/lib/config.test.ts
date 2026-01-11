/**
 * Unit-Tests für config.ts
 */

import { expect } from "@jest/globals";
import type { ProjectSettings } from "../../lib/schema";
import {
  getOpenAIKey,
  getGLMKey,
  getGoogleKey,
  getAnthropicKey,
  getOpenRouterKey,
  getGLMBaseUrl,
  getGLMModelsUrl,
  getOpenRouterBaseUrl,
  getOpenRouterModelsUrl,
  getGLMManualModels,
  mergeSettings,
  DEFAULT_SETTINGS,
} from "../../lib/config";

describe("config.ts", () => {
  describe("Environment Variables", () => {
    // Mock process.env vor jedem Test
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Reset process.env
      process.env = originalEnv;
    });

    describe("getOpenAIKey", () => {
      it("should return OPENAI_API_KEY from process.env if set", () => {
        process.env.OPENAI_API_KEY = "sk-test-key";
        expect(getOpenAIKey()).toBe("sk-test-key");
      });

      it("should return empty string if OPENAI_API_KEY is not set", () => {
        delete process.env.OPENAI_API_KEY;
        expect(getOpenAIKey()).toBe("");
      });
    });

    describe("getGLMKey", () => {
      it("should return LLM_API_KEY from process.env if set", () => {
        process.env.GLM_API_KEY = "glm-key";
        expect(getGLMKey()).toBe("glm-key");
      });

      it("should return empty string if LLM_API_KEY is not set", () => {
        delete process.env.GLM_API_KEY;
        expect(getGLMKey()).toBe("");
      });
    });

    describe("getGoogleKey", () => {
      it("should return GOOGLE_API_KEY from process.env if set", () => {
        process.env.GOOGLE_API_KEY = "google-key";
        expect(getGoogleKey()).toBe("google-key");
      });

      it("should return empty string if GOOGLE_API_KEY is not set", () => {
        delete process.env.GOOGLE_API_KEY;
        expect(getGoogleKey()).toBe("");
      });
    });

    describe("getAnthropicKey", () => {
      it("should return ANTHROPIC_API_KEY from process.env if set", () => {
        process.env.ANTHROPIC_API_KEY = "anthropic-key";
        expect(getAnthropicKey()).toBe("anthropic-key");
      });

      it("should return empty string if ANTHROPIC_API_KEY is not set", () => {
        delete process.env.ANTHROPIC_API_KEY;
        expect(getAnthropicKey()).toBe("");
      });
    });

    describe("getOpenRouterKey", () => {
      it("should return OPENROUTER_API_KEY from process.env if set", () => {
        process.env.OPENROUTER_API_KEY = "openrouter-key";
        expect(getOpenRouterKey()).toBe("openrouter-key");
      });

      it("should return empty string if OPENROUTER_API_KEY is not set", () => {
        delete process.env.OPENROUTER_API_KEY;
        expect(getOpenRouterKey()).toBe("");
      });
    });

    describe("getGLMBaseUrl", () => {
      it("should return LLM_BASE_URL from process.env if set", () => {
        process.env.GLM_BASE_URL = "https://custom.base.url";
        expect(getGLMBaseUrl()).toBe("https://custom.base.url");
      });

      it("should return default URL if LLM_BASE_URL is not set", () => {
        delete process.env.GLM_BASE_URL;
        expect(getGLMBaseUrl()).toBe("https://open.bigmodel.cn/api/paas/v4/chat/completions");
      });
    });

    describe("getGLMModelsUrl", () => {
      it("should return LLM_MODELS_URL from process.env if set", () => {
        process.env.GLM_MODELS_URL = "https://custom.models.url";
        expect(getGLMModelsUrl()).toBe("https://custom.models.url");
      });

      it("should return default URL if LLM_MODELS_URL is not set", () => {
        delete process.env.GLM_MODELS_URL;
        expect(getGLMModelsUrl()).toBe("https://open.bigmodel.cn/api/paas/v4/models");
      });
    });

    describe("getOpenRouterBaseUrl", () => {
      it("should return OPENROUTER_BASE_URL from process.env if set", () => {
        process.env.OPENROUTER_BASE_URL = "https://custom.openrouter.url";
        expect(getOpenRouterBaseUrl()).toBe("https://custom.openrouter.url");
      });

      it("should return default URL if OPENROUTER_BASE_URL is not set", () => {
        delete process.env.OPENROUTER_BASE_URL;
        expect(getOpenRouterBaseUrl()).toBe("https://openrouter.ai/api/v1");
      });
    });

    describe("getOpenRouterModelsUrl", () => {
      it("should return OPENROUTER_MODELS_URL from process.env if set", () => {
        process.env.OPENROUTER_MODELS_URL = "https://custom.openrouter.models.url";
        expect(getOpenRouterModelsUrl()).toBe("https://custom.openrouter.models.url");
      });

      it("should return default URL if OPENROUTER_MODELS_URL is not set", () => {
        delete process.env.OPENROUTER_MODELS_URL;
        expect(getOpenRouterModelsUrl()).toBe("https://openrouter.ai/api/v1/models");
      });
    });

    describe("getGLMManualModels", () => {
      it("should return LLM_MODELS_MANUAL from process.env if set", () => {
        process.env.GLM_MODELS_MANUAL = "model1, model2, model3";
        const result = getGLMManualModels();
        expect(result).toEqual(["model1", "model2", "model3"]);
      });

      it("should return empty array if LLM_MODELS_MANUAL is not set", () => {
        delete process.env.GLM_MODELS_MANUAL;
        const result = getGLMManualModels();
        expect(result).toEqual([]);
      });

      it("should split string by comma, trim whitespace and filter empty strings", () => {
        process.env.GLM_MODELS_MANUAL = "model1 , , model2, model3";
        const result = getGLMManualModels();
        expect(result).toEqual(["model1", "model2", "model3"]);
      });
    });
  });

  describe("mergeSettings", () => {
    it("should merge input settings with DEFAULT_SETTINGS", () => {
      const input: Partial<ProjectSettings> = {
        storageFormat: "yaml",
        autoTest: false,
        modelRouting: {
          wizard: { provider: "glm", model: "glm-4" },
          taskWizard: DEFAULT_SETTINGS.modelRouting.taskWizard,
          planning: DEFAULT_SETTINGS.modelRouting.planning,
          taskImplementation: DEFAULT_SETTINGS.modelRouting.taskImplementation,
          taskTests: DEFAULT_SETTINGS.modelRouting.taskTests,
          taskFix: DEFAULT_SETTINGS.modelRouting.taskFix,
          research: DEFAULT_SETTINGS.modelRouting.research,
        },
      };

      const result = mergeSettings(input);

      // Überprüfe, ob Standardwerte korrekt übernommen wurden
      expect(result.storageFormat).toBe("yaml");
      expect(result.autoTest).toBe(false);
      expect(result.defaultModel).toBe(DEFAULT_SETTINGS.defaultModel);
      expect(result.maxFixIterations).toBe(DEFAULT_SETTINGS.maxFixIterations);
      expect(result.sessionCooldownSeconds).toBe(DEFAULT_SETTINGS.sessionCooldownSeconds);

      // Überprüfe, ob input modelRouting korrekt gemerged wurde
      expect(result.modelRouting.wizard).toEqual({ provider: "glm", model: "glm-4" });
    });

    it("should return a copy of DEFAULT_SETTINGS if input is undefined", () => {
      const result = mergeSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("should not mutate original input object", () => {
      const input: Partial<ProjectSettings> = {
        storageFormat: "json",
        modelRouting: {
          wizard: { provider: "anthropic", model: "claude-3" },
          taskWizard: DEFAULT_SETTINGS.modelRouting.taskWizard,
          planning: DEFAULT_SETTINGS.modelRouting.planning,
          taskImplementation: DEFAULT_SETTINGS.modelRouting.taskImplementation,
          taskTests: DEFAULT_SETTINGS.modelRouting.taskTests,
          taskFix: DEFAULT_SETTINGS.modelRouting.taskFix,
          research: DEFAULT_SETTINGS.modelRouting.research,
        },
      };

      const originalWizardConfig = { ...input.modelRouting?.wizard };

      mergeSettings(input);

      // Ändere am input und prüfe, ob die Objekte noch gleich sind (deep equality für Objekte)
      expect(input.modelRouting?.wizard).toEqual(originalWizardConfig);
    });
  });
});
