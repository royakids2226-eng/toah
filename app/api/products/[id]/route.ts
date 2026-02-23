// app/api/products/[id]/route.ts
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
    // فك تشفير الـ ID (لأنه قد يحتوي على مسافات أو رموز عربية)
    const rawId = decodeURIComponent(params.id);
    const searchId = rawId.trim();

    console.log(`🔍 جلب تفاصيل المنتج (Search ID: ${searchId})`);

    // 1. محاولة العثور على أي منتج يطابق هذا المعرف (MasterCode أو UniqueID أو ItemCode)
    // نبحث أولاً عن سجل واحد لنعرف من هو "الأب" أو "الماستر"
    const productInit = await prisma.products.findFirst({
      where: {
        OR: [
          { master_code: searchId },
          { unique_id: searchId },
          { item_code: searchId },
        ],
        // يفضل دائمًا البحث في المخزن الرئيسي للعرض، إلا إذا كنت تريد عرض كل شيء
        stor_id: 0,
      },
    });

    if (!productInit) {
      console.log("❌ لم يتم العثور على المنتج الأولي");
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // 2. تحديد الـ Master Code الصحيح
    // إذا كان للمنتج master_code، نستخدمه لجلب كل الأخوة.
    // إذا لم يكن له، نستخدم unique_id كأنه هو الـ master (حالة نادرة).
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
        stor_id: 0,
      },
      orderBy: {
        unique_id: "asc", // ترتيب ثابت
      },
    });

    // 4. تنسيق البيانات (Format)
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

// دالة التنسيق (تم نقلها وإصلاحها لتكون مستقلة)
function formatGroupedProduct(rows: any[]) {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  // نستخدم master_code كـ modelId، وإذا لم يوجد نستخدم unique_id
  const mainId = firstRow.master_code || firstRow.unique_id;

  const groupedProduct: any = {
    modelId: mainId,
    id: firstRow.unique_id, // إضافة الـ ID لضمان المطابقة في الواجهة الأمامية
    master_code: mainId,
    price: Number(firstRow.out_price) || 0,
    category: firstRow.group_name || firstRow.kind_name || "",
    description: firstRow.item_name || firstRow.kind_name || "منتج بدون وصف",
    item_code: firstRow.item_code || "",
    image: null, // سيتم تعيينها لاحقاً من أول متغير
    variants: [],
  };

  const variantsMap = new Map();

  rows.forEach((row) => {
    const color = row.color || "افتراضي";
    const size = row.size || null;
    const curQty = Number(row.cur_qty) || 0;
    const itemCode = row.item_code || "";

    // معالجة الصورة
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
        itemCode: itemCode, // كود اللون الرئيسي
        sizes: [],
        sizeQuantities: {},
        sizeItemCodes: {},
        totalColorQuantity: 0,
        stor_id: row.stor_id || 0,
      });
    }

    const variant = variantsMap.get(color);

    // إضافة الكمية
    variant.totalColorQuantity += curQty;

    // إضافة المقاس
    if (size) {
      if (!variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }
      variant.sizeQuantities[size] = curQty;
      variant.sizeItemCodes[size] = itemCode;
    }
    // إذا لم يكن هناك مقاس، نعتبر الكمية للمنتج نفسه
    else {
      // يمكننا إضافة "ONE SIZE" افتراضياً أو تركها فارغة
    }
  });

  // تحويل الـ Map إلى Array
  groupedProduct.variants = Array.from(variantsMap.values());

  // تعيين الصورة الرئيسية للمنتج من أول متغير
  if (groupedProduct.variants.length > 0) {
    groupedProduct.image = groupedProduct.variants[0].imageUrl;
    groupedProduct.imageUrl = groupedProduct.variants[0].imageUrl;
  }

  return groupedProduct;
}

// PUT - تحديث (كما هو، لم نغير فيه شيئاً جوهرياً لكن نحافظ عليه)
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
