import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// تعطيل الكاش لضمان الحصول على أحدث البيانات
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // استخراج باراميتر employee من الـ URL
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get("employee") === "true";

    // فك تشفير الـ ID (لأنه قد يحتوي على مسافات أو رموز عربية)
    const rawId = decodeURIComponent(params.id);
    const searchId = rawId.trim();

    console.log(
      `🔍 جلب تفاصيل المنتج (Search ID: ${searchId}, employee: ${employee})`
    );

    // بناء شروط البحث حسب نوع المستخدم
    const baseWhere: any = {
      OR: [
        { master_code: searchId },
        { unique_id: searchId },
        { item_code: searchId },
      ],
    };

    // إذا لم يكن موظفاً، نقيد بالمخزن الرئيسي فقط (stor_id = 0)
    if (!employee) {
      baseWhere.stor_id = 0;
    }

    // 1. محاولة العثور على أي منتج يطابق هذا المعرف
    const productInit = await prisma.products.findFirst({
      where: baseWhere,
    });

    if (!productInit) {
      console.log("❌ لم يتم العثور على المنتج الأولي");
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // 2. تحديد الـ Master Code الصحيح
    const targetMasterCode = productInit.master_code || productInit.unique_id;

    if (!targetMasterCode) {
      return NextResponse.json(
        { error: "بيانات المنتج غير مكتملة (لا يوجد كود رئيسي)" },
        { status: 400 }
      );
    }

    console.log(`✅ تم التعرف على المنتج. Master Code: ${targetMasterCode}`);

    // 3. جلب جميع المتغيرات (Variants) التي تتبع نفس الـ Master Code
    const allVariants = await prisma.products.findMany({
      where: {
        master_code: targetMasterCode,
        ...(!employee ? { stor_id: 0 } : {}), // نفس الشرط: إذا لم يكن موظفاً نأخذ فقط stor_id=0
      },
      orderBy: {
        unique_id: "asc",
      },
    });

    // 4. تنسيق البيانات
    const formattedProduct = formatGroupedProduct(
      allVariants.length > 0 ? allVariants : [productInit]
    );

    return NextResponse.json(formattedProduct);
  } catch (error: any) {
    console.error("❌ Error fetching product details:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات المنتج", details: error.message },
      { status: 500 }
    );
  }
}

// دالة التنسيق (كما هي دون تغيير)
function formatGroupedProduct(rows: any[]) {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const mainId = firstRow.master_code || firstRow.unique_id;

  const groupedProduct: any = {
    modelId: mainId,
    id: firstRow.unique_id,
    master_code: mainId,
    price: Number(firstRow.out_price) || 0,
    category: firstRow.group_name || firstRow.kind_name || "",
    description: firstRow.item_name || firstRow.kind_name || "منتج بدون وصف",
    item_code: firstRow.item_code || "",
    image: null,
    variants: [],
  };

  const variantsMap = new Map();

  rows.forEach((row) => {
    const color = row.color || "افتراضي";
    const size = row.size || null;
    const curQty = Number(row.cur_qty) || 0;
    const itemCode = row.item_code || "";

    let imageUrl =
      "https://via.placeholder.com/500x700/EFEFEF/666666?text=No+Image";
    if (row.images) {
      const img = row.images.trim();
      if (img !== "" && img !== "null" && img !== "NULL") {
        imageUrl = img;
      }
    }

    if (!variantsMap.has(color)) {
      variantsMap.set(color, {
        id: row.unique_id,
        color: color,
        imageUrl: imageUrl,
        itemCode: itemCode,
        sizes: [],
        sizeQuantities: {},
        sizeItemCodes: {},
        totalColorQuantity: 0,
        stor_id: row.stor_id || 0,
      });
    }

    const variant = variantsMap.get(color);
    variant.totalColorQuantity += curQty;

    if (size) {
      if (!variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }
      variant.sizeQuantities[size] = curQty;
      variant.sizeItemCodes[size] = itemCode;
    }
  });

  groupedProduct.variants = Array.from(variantsMap.values());

  if (groupedProduct.variants.length > 0) {
    groupedProduct.image = groupedProduct.variants[0].imageUrl;
    groupedProduct.imageUrl = groupedProduct.variants[0].imageUrl;
  }

  return groupedProduct;
}

// PUT - تحديث (كما هو)
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
        out_price: parseFloat(data.out_price) || 0,
        // ... باقي الحقول
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.products.delete({ where: { unique_id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
  }
}
