import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    // 1. حساب العدد الكلي (سريع جداً)
    const totalCount = await prisma.products.count();

    // 2. حساب المنتجات التي لها صور
    const withImagesCount = await prisma.products.count({
      where: {
        AND: [
          { images: { not: null } },
          { images: { not: "" } }
        ]
      },
    });

    // 3. المنتجات بدون صور = الكلي - اللي بصور
    const withoutImagesCount = totalCount - withImagesCount;

    // 4. جلب قائمة بالمنتجات التي تحتاج صور (للعرض في الجدول الجانبي)
    // نكتفي بـ 50 منتجاً لتخفيف الحمل على الصفحة
    const productsWithoutImagesList = await prisma.products.findMany({
      where: {
        OR: [{ images: null }, { images: "" }],
      },
      select: {
        unique_id: true,
        item_code: true,
        item_name: true,
      },
      take: 50, 
      orderBy: { item_code: "asc" },
    });

    return NextResponse.json({
      statistics: {
        totalProducts: totalCount,
        productsWithImages: withImagesCount,
        productsWithoutImages: withoutImagesCount,
      },
      productsWithoutImages: productsWithoutImagesList,
    });

  } catch (error) {
    console.error("❌ Stats Error:", error);
    return NextResponse.json({ error: "فشل في جلب الإحصائيات" }, { status: 500 });
  }
}

// دالة المطابقة اليدوية (اختيارية الآن لأن الرفع يطابق تلقائياً)
export async function POST() {
    return NextResponse.json({ 
        success: true, 
        message: "المطابقة تتم تلقائياً أثناء الرفع الآن." 
    });
}