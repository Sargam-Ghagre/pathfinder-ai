import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  buildSecurePrompt: vi.fn((input) => `secure:${input.untrustedData[0].value}`),
  generateGeminiContent: vi.fn(),
}));

vi.mock("@/lib/prompt-safety", () => ({
  buildSecurePrompt: mocks.buildSecurePrompt,
}));

vi.mock("@/lib/gemini", () => ({
  generateGeminiContent: mocks.generateGeminiContent,
}));

import {
  generateIndustryInsightData,
  isIndustryInsightStale,
} from "../lib/industry-insights.js";

describe("industry insights helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses grounded sources when Gemini search succeeds", async () => {
    mocks.generateGeminiContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            salaryRanges: [
              {
                role: "Software Engineer",
                min: 100000,
                max: 150000,
                median: 125000,
                location: "Remote",
              },
            ],
            growthRate: 11.5,
            demandLevel: "High",
            topSkills: ["TypeScript", "React"],
            marketOutlook: "Positive",
            keyTrends: ["AI adoption"],
            recommendedSkills: ["Next.js"],
          }),
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                { web: { uri: "https://example.com/salary-a", title: "Salary A" } },
                { web: { uri: "https://example.com/salary-a", title: "Salary A duplicate" } },
                { web: { uri: "https://example.com/salary-b", title: "Salary B" } },
              ],
            },
          },
        ],
      },
    });

    const insights = await generateIndustryInsightData("technology");

    expect(insights.isGrounded).toBe(true);
    expect(insights.salaryRanges[0].citations).toHaveLength(2);
    expect(insights.salaryRanges[0].citations[0]).toEqual({
      title: "Salary A",
      uri: "https://example.com/salary-a",
    });
    expect(mocks.generateGeminiContent).toHaveBeenCalledWith(
      "secure:technology",
      expect.objectContaining({
        tools: [{ googleSearchRetrieval: {} }],
        generationConfig: { responseMimeType: "application/json" },
      })
    );
  });

  it("falls back to an estimate when grounded search fails", async () => {
    mocks.generateGeminiContent
      .mockRejectedValueOnce(new Error("search unavailable"))
      .mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              salaryRanges: [
                {
                  role: "Software Engineer",
                  min: 90000,
                  max: 130000,
                  median: 110000,
                  location: "Remote",
                },
              ],
              growthRate: 9.1,
              demandLevel: "Medium",
              topSkills: ["JavaScript"],
              marketOutlook: "Neutral",
              keyTrends: ["Automation"],
              recommendedSkills: ["TypeScript"],
            }),
          candidates: [{}],
        },
      });

    const insights = await generateIndustryInsightData("finance");

    expect(insights.isGrounded).toBe(false);
    expect(insights.salaryRanges[0].citations).toEqual([]);
    expect(mocks.generateGeminiContent).toHaveBeenNthCalledWith(
      1,
      "secure:finance",
      expect.objectContaining({
        tools: [{ googleSearchRetrieval: {} }],
      })
    );
    expect(mocks.generateGeminiContent).toHaveBeenNthCalledWith(
      2,
      "secure:finance",
      expect.objectContaining({
        generationConfig: { responseMimeType: "application/json" },
      })
    );
  });

  it("treats missing nextUpdate as stale", () => {
    expect(isIndustryInsightStale(null)).toBe(true);
    expect(isIndustryInsightStale({ nextUpdate: null })).toBe(true);
    expect(isIndustryInsightStale({ nextUpdate: new Date(Date.now() + 60_000) })).toBe(false);
    expect(isIndustryInsightStale({ nextUpdate: new Date(Date.now() - 60_000) })).toBe(true);
  });
});
