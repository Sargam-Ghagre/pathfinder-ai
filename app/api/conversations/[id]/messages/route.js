import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { respondError, ERROR_CODES } from "@/lib/api/error-handler";

export async function POST(request, context) {
  const params = await context.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return respondError(ERROR_CODES.UNAUTHORIZED);
    }

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      return respondError(ERROR_CODES.USER_NOT_FOUND);
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!conversation) {
      return respondError(ERROR_CODES.RESOURCE_NOT_FOUND, "Conversation not found");
    }

    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return respondError(ERROR_CODES.VALIDATION_ERROR, "Role and content are required");
    }

    const message = await db.message.create({
      data: {
        conversationId: params.id,
        role,
        content,
      },
    });

    await db.conversation.updateMany({
   where: {
    id: params.id,
    userId: user.id,
  },
  data: {
    updatedAt: new Date(),
  },
});

    return Response.json(message);
  } catch (error) {
    console.error("POST message error:", error);
    return respondError(ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to save message");
  }
}