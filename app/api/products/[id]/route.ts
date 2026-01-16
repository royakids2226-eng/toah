// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - جلب منتج محدد بكل ألوانه ومقاساته (مجمع)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id; // هذا يمثل master_code بناءً على منطق الكارت لديك

    console.log(`🔍 جلب تفاصيل المنتج للموديل: ${id}`);

    // 1. جلب جميع السجلات التي تشترك في نفس الـ master_code
    // مع الالتزام بنفس شرط المخزن الرئيسي (stor_id: 0) لضمان مطابقة الصور والكميات
    const variantsRaw = await prisma.products.findMany({
      where: {
        master_code: id,
        stor_id: 0, 
      },
    });

    if (variantsRaw.length === 0) {
      // محاولة أخرى: قد يكون الـ ID المرسل هو unique_id وليس master_code
      const singleProduct = await prisma.products.findUnique({
        where: { unique_id: id }
      });

      if (!singleProduct) {
        return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
      }

      // إذا وجدناه كـ unique_id، نجلب كل إخوته بنفس الـ master_code
      const allSiblings = await prisma.products.findMany({
        where: {
          master_code: singleProduct.master_code,
          stor_id: 0
        }
      });
      
      return NextResponse.json(formatGroupedProduct(allSiblings.length > 0 ? allSiblings : [singleProduct]));
    }

    return NextResponse.json(formatGroupedProduct(variantsRaw));

  } catch (error: any) {
    console.error("❌ Error fetching product details:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات المنتج", details: error.message },
      { status: 500 }
    );
  }
}

// دالة مساعدة لتحويل البيانات المسطحة إلى التنسيق المجمع (نفس منطق الصفحة الرئيسية)
function formatGroupedProduct(rows: any[]) {
  const firstRow = rows[0];
  const masterCode = firstRow.master_code || firstRow.unique_id;

  const groupedProduct: any = {
    modelId: masterCode,
    master_code: masterCode,
    price: Number(firstRow.out_price) || 0,
    category: firstRow.group_name || "",
    description: firstRow.item_name || firstRow.kind_name || "منتج بدون وصف",
    group_name: firstRow.group_name || "",
    kind_name: firstRow.kind_name || "",
    item_name: firstRow.item_name || "",
    item_code: firstRow.item_code || "",
    variants: [],
  };

  rows.forEach((row) => {
    const color = row.color || "Default";
    const size = row.size || null;

    let variant = groupedProduct.variants.find((v: any) => v.color === color);

    if (!variant) {
      // استخدام نفس منطق الصورة الافتراضية من ملفك الأصلي
      let imageUrl = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500";
      if (row.images && row.images.trim() !== "" && row.images !== "null") {
        imageUrl = row.images.trim();
      }

      variant = {
        id: row.unique_id,
        itemCode: row.item_code,
        color: color,
        imageUrl: imageUrl,
        sizes: [],
        cur_qty: Number(row.cur_qty) || 0,
        stor_id: row.stor_id || 0,
      };
      groupedProduct.variants.push(variant);
    }

    if (size && !variant.sizes.includes(size)) {
      variant.sizes.push(size);
    }
  });

  return groupedProduct;
}

// PUT - تحديث منتج (يبقى للتعامل مع السجل الفردي)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const updatedProduct = await prisma.products.update({
      where: { unique_id: params.id },
      data: {
        item_name: data.item_name,
        item_code: data.item_code,
        color: data.color,
        size: data.size,
        out_price: parseFloat(data.out_price) || 0,
        images: data.images,
        cur_qty: parseInt(data.cur_qty) || 0,
        group_name: data.group_name,
        kind_name: data.kind_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث المنتج بنجاح",
      product: updatedProduct,
    });
  } catch (error) {
    return NextResponse.json({ error: "فشل في تحديث المنتج" }, { status: 500 });
  }
}

// DELETE - حذف منتج
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.products.delete({ where: { unique_id: params.id } });
    return NextResponse.json({ success: true, message: "تم حذف المنتج بنجاح" });
  } catch (error) {
    return NextResponse.json({ error: "فشل في حذف المنتج" }, { status: 500 });
  }
}