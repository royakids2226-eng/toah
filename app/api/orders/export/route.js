import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { orderId, exportedBy } = await request.json();

    if (!orderId || !exportedBy) {
      return NextResponse.json(
        { error: "رقم الطلب واسم الموظف مطلوبان" },
        { status: 400 }
      );
    }

    // تحديث الطلب - تسجيل بيانات التصدير فقط (لا نغير الحالة)
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        exported_by: exportedBy,
        exported_at: new Date(),
      },
      include: {
        order_items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل عملية التصدير بنجاح",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order export status:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "فشل في تسجيل عملية التصدير" },
      { status: 500 }
    );
  }
}
