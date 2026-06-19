"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  generateIndustryInsightData,
  getIndustryInsightRefreshTime,
  isIndustryInsightStale,
} from "@/lib/industry-insights";

/**
 * Returns true when Inngest is configured and can accept events.
 * Checked at call-time so it reflects runtime env vars (e.g. set after boot).
 */
function isInngestConfigured() {
  return !!(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}

/**
 * Generates industry insights using Gemini AI.
 * If AI generation fails, provides high-quality default fallback insights.
 */
export async function generateAIInsights(industry) {
  return generateIndustryInsightData(industry);
}

/**
 * Fetches industry insights for the signed-in user.
 *
 * Staleness strategy:
 *   - If Inngest is available: fire-and-forget a background refresh event and
 *     return the existing (possibly stale) record immediately. The UI loads
 *     fast; fresh data appears on the next reload after the worker completes.
 *   - If Inngest is NOT configured (e.g. local dev without .env.local keys):
 *     fall back to the synchronous AI path so the feature still works end-to-end.
 *   - If no record exists at all: create one synchronously so there is always
 *     something to display on first load.
 */
export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });
  if (!user || !user.industry) {
    return null;
  }

  try {
    const isStale = isIndustryInsightStale(user.industryInsight);

    // ── Case 1: fresh data — return immediately ───────────────────────────
    if (!isStale) {
      return user.industryInsight;
    }

    // ── Case 2: stale + Inngest configured — fire-and-forget ─────────────
    if (isInngestConfigured()) {
      const { getInngest } = await import("@/lib/inngest/client");
      const inngest = await getInngest();

      // Non-blocking: schedule the background worker and return stale data now.
      // The worker will upsert fresh insights; the UI picks them up on next load.
      inngest
        .send({
          name: "industry/insight.requested",
          data: { industry: user.industry },
        })
        .catch((err) => {
          console.error(
            "[dashboard] Failed to dispatch industry insight refresh event:",
            err
          );
        });

      return user.industryInsight;
    }

    // ── Case 3: stale + Inngest NOT configured — synchronous fallback ─────
    // Covers local dev without Inngest env vars so the feature remains usable.
    const insights = await generateAIInsights(user.industry);
    const nextUpdate = getIndustryInsightRefreshTime();

    const fields = {
      salaryRanges: insights.salaryRanges,
      growthRate: insights.growthRate,
      demandLevel: insights.demandLevel,
      topSkills: insights.topSkills,
      marketOutlook: insights.marketOutlook,
      keyTrends: insights.keyTrends,
      recommendedSkills: insights.recommendedSkills,
      isGrounded: insights.isGrounded,
      lastUpdated: new Date(),
      nextUpdate,
    };

    return await db.industryInsight.upsert({
      where: { industry: user.industry },
      create: { industry: user.industry, ...fields },
      update: fields,
    });
  } catch (error) {
    console.error("Failed to fetch or refresh industry insights:", error);
    return null;
  }
}
