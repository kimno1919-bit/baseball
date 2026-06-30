import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin, errorResponse } from "@/lib/api-middleware";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다.", 403);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser || targetUser.clubId !== user.clubId) {
      return errorResponse("해당 부원을 찾을 수 없습니다.", 404);
    }

    const { remarks } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        remarks: remarks || null,
      },
    });

    return NextResponse.json({
      message: "비고란이 성공적으로 업데이트되었습니다.",
      remarks: updatedUser.remarks,
    });
  } catch (error: any) {
    console.error("비고 업데이트 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}
