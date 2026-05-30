import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { respondError, ERROR_CODES } from "@/lib/api/error-handler";

export async function GET(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return respondError(ERROR_CODES.UNAUTHORIZED);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || typeof query !== "string" || !query.trim()) {
      return respondError(ERROR_CODES.VALIDATION_ERROR, "Search query 'q' is required");
    }

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      return respondError(ERROR_CODES.USER_NOT_FOUND);
    }

    const searchKeyword = query.trim();

    const conversations = await db.conversation.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: searchKeyword,
              mode: "insensitive",
            },
          },
          {
            messages: {
              some: {
                content: {
                  contains: searchKeyword,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return Response.json({
      conversations: Array.isArray(conversations) ? conversations : [],
    });
  } catch (error) {
    console.error("Error searching conversations:", error);
    return respondError(ERROR_CODES.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
