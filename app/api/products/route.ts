import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sub = searchParams.get("sub");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    // قمت بزيادة الحد الافتراضي قليلاً، لكن التصفح هو الحل الأمثل
    const limit = parseInt(searchParams.get("limit") || "50");
    const employeeView = searchParams.get("employee") === "true";

    // ... (نفس كود جلب اسم التصنيف الذي لديك) ...
    let categoryName = category;
    if (category && !isNaN(parseInt(category))) {
      const cat = await prisma.categories.findUnique({
        where: { id: parseInt(category) },
      });
      if (cat) categoryName = cat.name;
    }

    const whereConditions: any = {};

    if (!employeeView) {
      whereConditions.cur_qty = { gt: 0 };
      whereConditions.stor_id = 0;
    }

    // ... (شروط التصنيف والتصنيف الفرعي كما هي لديك) ...
    if (categoryName) {
      whereConditions.OR = [
        { group_name: { contains: categoryName, mode: "insensitive" } },
        { kind_name: { contains: categoryName, mode: "insensitive" } },
        { item_name: { contains: categoryName, mode: "insensitive" } },
      ];
    }

    if (sub) {
      // ... (الكود الخاص بـ sub كما هو) ...
      // تأكد فقط من استخدام push بشكل صحيح داخل OR إذا كان موجوداً مسبقاً
      const subCondition = [
        { kind_name: { contains: sub, mode: "insensitive" } },
        { group_name: { contains: sub, mode: "insensitive" } },
        { item_name: { contains: sub, mode: "insensitive" } },
      ];
      if (whereConditions.OR) {
        whereConditions.OR = [...whereConditions.OR, ...subCondition];
      } else {
        whereConditions.OR = subCondition;
      }
    }

    // 🔥🔥🔥 تصحيح البحث هنا 🔥🔥🔥
    if (search) {
      const searchCondition = [
        // ✅ البحث في ID وهذا مهم جداً لحل مشكلتك
        { unique_id: { equals: search } },
        { item_name: { contains: search, mode: "insensitive" } }, // ✅ الصحيح في DB
        { item_code: { contains: search, mode: "insensitive" } },
        { master_code: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { kind_name: { contains: search, mode: "insensitive" } },
        { group_name: { contains: search, mode: "insensitive" } },
      ];

      // ❌ لا تضع description هنا أبداً لأن العمود غير موجود

      // دمج الشروط
      if (whereConditions.OR) {
        // إذا كان هناك شرط مسبق (مثل التصنيف)، نريد (تصنيف AND (بحث OR بحث OR ...))
        // Prisma تتعامل مع AND ضمنياً للمستوى الأعلى، لذا نضع شروط البحث في AND منفصل
        // أو إذا كنت تريد تضييق النطاق:
        whereConditions.AND = [{ OR: searchCondition }];
      } else {
        whereConditions.OR = searchCondition;
      }
    }

    // ... (باقي الكود الخاص بالجلب والتجميع كما هو لديك، فهو ممتاز) ...

    const allProductsRaw = await prisma.products.findMany({
      where: whereConditions,
      orderBy: { unique_id: "desc" },
    });

    // ... (التجميع Pagination) ...
    // (الكود المتبقي في ملفك الأصلي سليم منطقياً)

    // فقط تأكد في الـ mapping داخل الـ forEach:
    // description: row.item_name || ... (وليس row.description)

    // ... (Rest of the file)

    // سأعيد كتابة جزء الـ mapping فقط للتأكيد
    const groupedByMasterCode: { [key: string]: any } = {};
    allProductsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) return;
      const color = row.color || "Default";
      // ...
      if (!groupedByMasterCode[masterCode]) {
        groupedByMasterCode[masterCode] = {
          modelId: masterCode,
          master_code: masterCode,
          price: row.out_price || 0,
          category: row.group_name || row.kind_name || "",
          // ✅ تأكد من هذا السطر
          description: row.item_name || row.kind_name || "منتج بدون وصف",
          // ...
          variants: [],
        };
      }
      // ... (باقي المنطق)
    });

    // ... (باقي الملف)
    const allGroupedProducts = Object.values(groupedByMasterCode).filter(
      (p) => p.variants.length > 0
    );
    // ...
    const totalProducts = allGroupedProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (page - 1) * limit;
    const paginatedProducts = allGroupedProducts.slice(skip, skip + limit);
    // ...

    return NextResponse.json({
      success: true,
      products: paginatedProducts,
      // ...
    });
  } catch (error: any) {
    console.error("❌ Error in products API:", error);
    // طباعة الخطأ بوضوح لمعرفة السبب الحقيقي
    return NextResponse.json({
      success: false,
      products: [],
      error: error.message || "حدث خطأ في تحميل البيانات",
    });
  }
}
