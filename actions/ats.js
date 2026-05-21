"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateGeminiContent } from "@/lib/gemini";

/**
 * Runs an ATS analysis using Gemini AI and persists the result.
 */
export async function analyzeATS({ resumeContent, jobDescription, jobTitle, companyName }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  if (!resumeContent?.trim()) throw new Error("Resume content is required");
  if (!jobDescription?.trim()) throw new Error("Job description is required");

  const prompt = `
You are an expert ATS (Applicant Tracking System) analyst and career coach.

Analyze the following resume against the job description and return a detailed ATS compatibility report.

RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Provide your analysis in the following JSON format ONLY — no extra text, no markdown fences:
{
  "atsScore": <number between 0 and 100>,
  "matchedKeywords": [<array of keywords/skills/phrases found in BOTH the resume and job description>],
  "missingKeywords": [<array of important keywords/skills/phrases in the job description that are MISSING from the resume>],
  "suggestions": [
    {
      "category": <string, e.g. "Skills", "Experience", "Formatting", "Keywords", "Achievements">,
      "tip": <string, specific actionable advice to improve ATS score>
    }
  ],
  "overallFeedback": <string, 2-4 sentences summarizing the overall compatibility, strengths, and most critical areas to improve>
}

Scoring guidelines:
- 0-40: Poor match — resume misses most key requirements
- 41-60: Fair match — some alignment but significant gaps
- 61-75: Good match — decent alignment with room to improve
- 76-90: Strong match — resume well-aligned, minor improvements possible
- 91-100: Excellent match — resume is highly optimized for this role

Be specific and actionable. Include at least 5 matched keywords (if present), at least 5 missing keywords, and at least 5 improvement suggestions.
IMPORTANT: Return ONLY valid JSON. No markdown, no explanation outside the JSON.
`;

  let analysis;
  try {
    const result = await generateGeminiContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```(?:json)?[\r\n]?/g, "").trim();
    analysis = JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini ATS analysis error:", error);
    throw new Error("Failed to generate ATS analysis. Please try again.");
  }

  // Validate shape
  const {
    atsScore,
    matchedKeywords = [],
    missingKeywords = [],
    suggestions = [],
    overallFeedback = "",
  } = analysis;

  if (typeof atsScore !== "number") throw new Error("Invalid analysis response from AI.");

  try {
    const record = await db.aTSAnalysis.create({
      data: {
        userId: user.id,
        resumeContent: resumeContent.trim(),
        jobDescription: jobDescription.trim(),
        jobTitle: jobTitle?.trim() || null,
        companyName: companyName?.trim() || null,
        atsScore: Math.min(100, Math.max(0, atsScore)),
        matchedKeywords: matchedKeywords.map(String),
        missingKeywords: missingKeywords.map(String),
        suggestions: suggestions,
        overallFeedback: overallFeedback || null,
      },
    });

    revalidatePath("/ats-analyzer");
    return record;
  } catch (error) {
    console.error("DB save error:", error);
    throw new Error("Failed to save ATS analysis.");
  }
}

/**
 * Fetches all ATS analyses for the signed-in user, newest first.
 */
export async function getATSAnalyses() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  return db.aTSAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Deletes a specific ATS analysis record (ownership-checked).
 */
export async function deleteATSAnalysis(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const record = await db.aTSAnalysis.findUnique({ where: { id } });
  if (!record || record.userId !== user.id) throw new Error("Not found or access denied");

  await db.aTSAnalysis.delete({ where: { id } });
  revalidatePath("/ats-analyzer");
}
