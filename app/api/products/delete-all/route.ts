import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE() {
  try {
    // يمكن إضافة تحقق من التوكن هنا لزيادة الأمان
    
    // ✅ حذف جميع المنتجات باستخدام deleteMany
    const result = await prisma.products.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `تم حذف ${result.count} منتج بنجاح`,
    });
  } catch (error: any) {
    console.error("Delete All Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل في حذف المنتجات: " + error.message },
      { status: 500 }
    );
  }
}