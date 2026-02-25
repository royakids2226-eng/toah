import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// ✅ دالة GET: تدعم التصدير والبحث
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sub = searchParams.get("sub");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const employeeView = searchParams.get("employee") === "true";
    const isExport = searchParams.get("export") === "true";

    const andConditions: any[] = [];

    if (!employeeView && !isExport) {
      andConditions.push({ cur_qty: { gt: 0 }, stor_id: 0 });
    }

    // شرط البحث
    if (search) {
      const searchOR: any[] = [
        { item_name: { contains: search, mode: "insensitive" } },
        { item_code: { contains: search, mode: "insensitive" } },
        { master_code: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { kind_name: { contains: search, mode: "insensitive" } },
        { group_name: { contains: search, mode: "insensitive" } },
      ];
      if (!isNaN(Number(search))) {
        searchOR.push({ unique_id: { equals: Number(search) } });
      }
      andConditions.push({ OR: searchOR });
    }

    // شرط التصنيف
    let categoryName = category;
    if (category && !isNaN(parseInt(category))) {
      const cat = await prisma.categories.findUnique({
        where: { id: parseInt(category) },
      });
      if (cat) categoryName = cat.name;
    }
    if (categoryName) {
      andConditions.push({
        OR: [
          { group_name: { contains: categoryName, mode: "insensitive" } },
          { kind_name: { contains: categoryName, mode: "insensitive" } },
          { item_name: { contains: categoryName, mode: "insensitive" } },
        ],
      });
    }

    const whereConditions =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // 📥 1. وضع التصدير (Export Excel): إرجاع البيانات "خام"
    if (isExport) {
      const rawProducts = await prisma.products.findMany({
        where: whereConditions,
        orderBy: { unique_id: "desc" },
      });

      // تنسيق البيانات لتطابق ملف التيمبليت تماماً
      const exportData = rawProducts.map((p) => ({
        item_name: p.item_name || "",
        master_code: p.master_code || "",
        item_code: p.item_code || "",
        out_price: p.out_price || 0,
        cur_qty: p.cur_qty || 0,
        color: p.color || "",
        size: p.size || "",
        group_name: p.group_name || "",
        kind_name: p.kind_name || "",
        images: p.images || "",
      }));

      return NextResponse.json({ success: true, data: exportData });
    }

    // 🖥️ 2. وضع العرض العادي (Dashboard)
    const allProductsRaw = await prisma.products.findMany({
      where: whereConditions,
      orderBy: { unique_id: "desc" },
    });

    const groupedByMasterCode: { [key: string]: any } = {};

    allProductsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) return;

      const color = row.color || "Default";
      const quantity = parseInt(row.cur_qty?.toString() || "0", 10);

      if (!groupedByMasterCode[masterCode]) {
        groupedByMasterCode[masterCode] = {
          modelId: masterCode,
          master_code: masterCode,
          item_code: row.item_code,
          description: row.item_name || row.kind_name || "منتج بدون اسم", // ✅ الإصلاح هنا
          item_name: row.item_name,
          price: row.out_price || 0,
          cur_qty: 0,
          group_name: row.group_name,
          kind_name: row.kind_name,
          category: row.group_name || row.kind_name || "",
          variants: [],
        };
      }

      groupedByMasterCode[masterCode].cur_qty += quantity; // ✅ جمع رقمي صحيح

      const existingVariantIndex = groupedByMasterCode[
        masterCode
      ].variants.findIndex((v: any) => v.color === color);

      const imgUrl = row.images || "/placeholder.jpg";

      if (existingVariantIndex > -1) {
        groupedByMasterCode[masterCode].variants[
          existingVariantIndex
        ].sizes.push(row.size || "Free");
        groupedByMasterCode[masterCode].variants[
          existingVariantIndex
        ].quantities.push(quantity);
      } else {
        groupedByMasterCode[masterCode].variants.push({
          color: color,
          imageUrl: imgUrl,
          sizes: [row.size || "Free"],
          quantities: [quantity],
        });
      }
    });

    const allGroupedProducts = Object.values(groupedByMasterCode);
    const totalProducts = allGroupedProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (page - 1) * limit;
    const paginatedProducts = allGroupedProducts.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      products: paginatedProducts,
      pagination: { page, limit, totalProducts, totalPages },
    });
  } catch (error: any) {
    console.error("❌ Error in products API:", error);
    return NextResponse.json(
      { success: false, products: [], error: error.message },
      { status: 500 }
    );
  }
}

// 🚀🚀 دالة POST: الرفع السريع (Bulk Insert)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. إذا كانت البيانات مصفوفة (رفع ملف اكسيل)
    if (Array.isArray(body)) {
      console.log(`🚀 Starting bulk upload for ${body.length} items...`);

      // تنظيف وتحويل البيانات
      const cleanData = body.map((item) => ({
        item_name: item.item_name?.toString() || "",
        master_code: item.master_code?.toString() || "",
        item_code: item.item_code?.toString() || "",
        out_price: parseFloat(item.out_price) || 0,
        cur_qty: parseInt(item.cur_qty) || 0,
        color: item.color?.toString() || "",
        size: item.size?.toString() || "",
        group_name: item.group_name?.toString() || "",
        kind_name: item.kind_name?.toString() || "",
        images: item.images?.toString() || "",
        stor_id: 0,
      }));

      // استخدام createMany للإضافة السريعة جداً
      // ملاحظة: createMany مدعومة في PostgreSQL, MySQL, SQL Server (النسخ الحديثة), MongoDB
      // إذا كنت تستخدم SQLite، يجب استخدام حلقة تكرار مع transaction
      const result = await prisma.products.createMany({
        data: cleanData,
        skipDuplicates: true, // تخطي المكرر بدلاً من الخطأ
      });

      return NextResponse.json({
        success: true,
        message: `تم رفع ${result.count} منتج بنجاح`,
      });
    }

    // 2. إذا كان منتج واحد (من الفورم العادي)
    else {
      const newProduct = await prisma.products.create({
        data: {
          ...body,
          out_price: parseFloat(body.out_price),
          cur_qty: parseInt(body.cur_qty),
          stor_id: 0,
        },
      });
      return NextResponse.json({ success: true, product: newProduct });
    }
  } catch (error: any) {
    console.error("❌ Error in POST products:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
