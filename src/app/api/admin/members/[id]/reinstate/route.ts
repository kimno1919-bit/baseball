import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { reinstateUser } from "@/lib/conduct";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = params;
    const { reason } = await req.json();

    if (!reason) {
      return NextResponse.json({ error: "Missing reinstate reason" }, { status: 400 });
    }

    await reinstateUser(userId, session.user.id, reason);

    return NextResponse.json({ success: true, message: "User reinstated successfully" });
  } catch (error: any) {
    console.error("Reinstatement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
