import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 0; // منع الكاش

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = decodeURIComponent(params.id);
    const searchId = rawId.trim();

    console.log(`🔍 API Searching for: ${searchId}`);

    // 1. البحث عن أي سجل يطابق البحث (بدون قيود على المخزن)
    // نبحث عن سجل واحد فقط لنعرف "هوية" المنتج
    const initialMatch = await prisma.products.findFirst({
      where: {
        OR: [
          { unique_id: searchId }, // هل هو ID؟
          { master_code: searchId }, // هل هو كود موديل؟
          { item_code: searchId }, // هل هو كود صنف؟
        ],
      },
    });

    if (!initialMatch) {
      console.log(`❌ Product not found for ID: ${searchId}`);
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // 2. تحديد الكود الرئيسي (Master Code) لجلب باقي العائلة
    // إذا لم يوجد master_code نستخدم unique_id
    const targetMaster = initialMatch.master_code || initialMatch.unique_id;

    console.log(
      `✅ Found match. Fetching all variants for Master: ${targetMaster}`
    );

    // 3. جلب كل النسخ (الألوان والمقاسات) المرتبطة بهذا الموديل
    // هنا أيضاً لا نضع شرط stor_id لضمان جلب البيانات حتى لو كانت في مخازن مختلفة
    // يمكنك إعادة تفعيل شرط stor_id: 0 هنا فقط إذا كنت متأكداً أن بيانات العرض في المخزن 0
    const allVariants = await prisma.products.findMany({
      where: {
        master_code: targetMaster,
      },
      orderBy: {
        unique_id: "asc",
      },
    });

    // 4. تنسيق النتيجة
    // نمرر المصفوفة كاملة، أو السجل الوحيد إذا لم يكن له إخوة
    const formatted = formatProductData(
      allVariants.length > 0 ? allVariants : [initialMatch]
    );

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// دالة تنسيق البيانات لتناسب الواجهة الأمامية
function formatProductData(rows: any[]) {
  if (!rows || rows.length === 0) return null;

  const first = rows[0];
  const masterId = first.master_code || first.unique_id;

  // البنية الأساسية للمنتج
  const product = {
    modelId: masterId,
    id: first.unique_id,
    master_code: masterId,
    price: Number(first.out_price) || 0,
    category: first.group_name || first.kind_name || "",
    description: first.item_name || first.kind_name || "منتج",
    item_code: first.item_code || "",
    image: null as string | null,
    variants: [] as any[],
  };

  // تجميع الألوان والمقاسات
  const variantsMap = new Map();

  rows.forEach((row) => {
    const color = row.color || "افتراضي";
    const size = row.size || null;
    const qty = Number(row.cur_qty) || 0;
    const itemCode = row.item_code || "";

    // معالجة الصورة
    let imgUrl =
      "https://via.placeholder.com/500x700/EFEFEF/666666?text=No+Image";
    if (row.images && row.images !== "null") {
      imgUrl = row.images;
    }

    if (!variantsMap.has(color)) {
      variantsMap.set(color, {
        id: row.unique_id,
        color: color,
        imageUrl: imgUrl,
        itemCode: itemCode,
        sizes: [],
        sizeQuantities: {},
        sizeItemCodes: {},
        totalColorQuantity: 0,
        stor_id: row.stor_id,
        cur_qty: 0, // مجموع الكميات لهذا اللون
      });
    }

    const variant = variantsMap.get(color);

    // تحديث الكميات
    variant.totalColorQuantity += qty;
    variant.cur_qty += qty; // مهم جداً لأن الواجهة تعتمد عليه أحياناً

    // إضافة المقاس
    if (size) {
      if (!variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }
      variant.sizeQuantities[size] = qty;
      variant.sizeItemCodes[size] = itemCode;
    }
  });

  // تحويل الـ Map إلى Array
  product.variants = Array.from(variantsMap.values());

  // تعيين الصورة الرئيسية من أول متغير
  if (product.variants.length > 0) {
    product.image = product.variants[0].imageUrl;
  }

  return product;
}
