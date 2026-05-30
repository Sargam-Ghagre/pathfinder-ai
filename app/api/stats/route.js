import { respondError, ERROR_CODES } from "@/lib/api/error-handler";

export async function GET() {
  try {
    const stats = {
      studentsGuided: "10k+",
      careerMatches: "94%",
      successRate: "92%",
      avgRating: "4.8",
    };

    return Response.json(stats);
  } catch (err) {
    console.error("[api/stats]", err);
    return respondError(ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to load stats");
  }
}
