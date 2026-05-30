import { isClerkConfigured } from "@/lib/env";
import { respondError, ERROR_CODES } from "@/lib/api/error-handler";

export async function GET() {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const clerkKeyless = !isProd && !isClerkConfigured();

    return Response.json({ clerkKeyless });
  } catch (err) {
    console.error("[api/dev/status]", err);
    return respondError(ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
}
