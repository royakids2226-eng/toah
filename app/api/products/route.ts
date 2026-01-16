import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sub = searchParams.get("sub");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10000");
    const employeeView = searchParams.get("employee") === "true";

    console.log("🔍 جلب المنتجات:", {
      category,
      sub,
      search,
      page,
      limit,
      employeeView,
    });

    // ✅ التحقق من حالة الموظف إذا كان الطلب للموظفين
    let employee = false;
    if (employeeView) {
      // هنا يمكنك إضافة منطق للتحقق من التوكن
      employee = true;
    }

    // ✅ البحث عن اسم التصنيف إذا كان ID رقمي
    let categoryName = category;
    if (category && !isNaN(parseInt(category))) {
      const cat = await prisma.categories.findUnique({
        where: { id: parseInt(category) },
      });
      if (cat) {
        categoryName = cat.name;
      }
    }

    console.log(`🔍 معايير البحث: 
      التصنيف: "${categoryName}" 
      Sub: "${sub}" 
      البحث: "${search}"
      حالة الموظف: ${employee}
    `);

    // ✅ بناء شروط الفلترة الديناميكية
    const whereConditions: any = {};

    // للموظفين: نعرض كل شيء بما فيه الصفر
    // للعملاء: نعرض فقط ما هو متوفر (cur_qty > 0)
    if (!employee) {
      whereConditions.cur_qty = { gt: 0 };
    }

    // ✅ الموظفين: يمكنهم رؤية جميع المخازن
    // العملاء: فقط المخزن الرئيسي (stor_id: 0)
    if (!employee) {
      whereConditions.stor_id = 0;
    }

    // ✅ إضافة فلترة التصنيف
    if (categoryName) {
      whereConditions.OR = [
        { group_name: { contains: categoryName, mode: "insensitive" } },
        { kind_name: { contains: categoryName, mode: "insensitive" } },
        { item_name: { contains: categoryName, mode: "insensitive" } },
        { category: { contains: categoryName, mode: "insensitive" } },
      ];
    }

    // ✅ إضافة فلترة Sub Category
    if (sub) {
      if (whereConditions.OR) {
        // دمج مع شروط التصنيف
        whereConditions.OR.push(
          { description: { contains: sub, mode: "insensitive" } },
          { kind_name: { contains: sub, mode: "insensitive" } },
          { group_name: { contains: sub, mode: "insensitive" } }
        );
      } else {
        whereConditions.OR = [
          { description: { contains: sub, mode: "insensitive" } },
          { kind_name: { contains: sub, mode: "insensitive" } },
          { group_name: { contains: sub, mode: "insensitive" } },
        ];
      }
    }

    // ✅ إضافة فلترة البحث العام
    if (search) {
      if (whereConditions.OR) {
        whereConditions.OR.push(
          { item_name: { contains: search, mode: "insensitive" } },
          { item_code: { contains: search, mode: "insensitive" } },
          { master_code: { contains: search, mode: "insensitive" } },
          { color: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } }
        );
      } else {
        whereConditions.OR = [
          { item_name: { contains: search, mode: "insensitive" } },
          { item_code: { contains: search, mode: "insensitive" } },
          { master_code: { contains: search, mode: "insensitive" } },
          { color: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }
    }

    console.log(`📋 شروط الفلترة النهائية:`, JSON.stringify(whereConditions, null, 2));

    // ✅ 1. جلب جميع المنتجات الخام مع الفلترة
    const allProductsRaw = await prisma.products.findMany({
      where: whereConditions,
      orderBy: {
        item_name: "asc",
      },
    });

    console.log(`📊 جميع المنتجات الخام من DB: ${allProductsRaw.length} منتج`);

    // ✅ 2. تجميع المنتجات حسب master_code مع المنطق الصحيح للموظفين
    const groupedByMasterCode: { [key: string]: any } = {};

    allProductsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) return;

      const color = row.color || "Default";
      const size = row.size || null;
      const curQty = Number(row.cur_qty) || 0;
      const storId = row.stor_id || 0;

      if (!groupedByMasterCode[masterCode]) {
        groupedByMasterCode[masterCode] = {
          modelId: masterCode,
          master_code: masterCode,
          price: row.out_price || 0,
          category: row.group_name || row.kind_name || "",
          description: row.item_name || row.kind_name || "منتج بدون وصف",
          group_name: row.group_name || "",
          kind_name: row.kind_name || "",
          item_name: row.item_name || "",
          item_code: row.item_code || "",
          // ✅ الحقل الأساسي للكمية (عرضه في ProductCard)
          cur_qty: 0, // سيتم حسابه لاحقاً
          variants: [],
        };
      }

      let variant = groupedByMasterCode[masterCode].variants.find(
        (v: any) => v.color === color
      );

      if (!variant) {
        // ✅ حل مشكلة الصور بشكل أفضل
        let imageUrl = "https://via.placeholder.com/500x700/EFEFEF/666666?text=No+Image";

        if (row.images) {
          const img = row.images.trim();
          if (img !== "" && img !== "null" && img !== "NULL") {
            // ✅ التحقق من أن الصورة ليست base64 صغير
            if (img.startsWith("data:image") && img.length < 100) {
              console.warn(`⚠️ صورة base64 صغيرة جداً لـ ${row.item_code}: ${img.length} حرف`);
            } else {
              imageUrl = img;
            }
          }
        }

        variant = {
          id: row.unique_id,
          itemCode: row.item_code,
          color: color,
          imageUrl: imageUrl,
          sizes: [],
          // ✅ الكمية في مستوى اللون
          cur_qty: curQty,
          stor_id: storId,
          // ✅ للتحسين: تجميع كميات المقاسات
          sizeQuantities: {},
        };
        groupedByMasterCode[masterCode].variants.push(variant);
      }

      // ✅ تحديث الكمية الإجمالية للون
      variant.cur_qty += curQty;
      
      // ✅ تحديث الكمية الإجمالية للموديل (للـ ProductCard)
      groupedByMasterCode[masterCode].cur_qty += curQty;

      if (size && !variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }

      // ✅ تسجيل كمية المقاس
      if (size) {
        variant.sizeQuantities = variant.sizeQuantities || {};
        variant.sizeQuantities[size] = (variant.sizeQuantities[size] || 0) + curQty;
      }
    });

    // ✅ 3. تحويل إلى مصفوفة وفلترة المنتجات التي لديها variants
    const allGroupedProducts = Object.values(groupedByMasterCode).filter(
      (product) => product.variants.length > 0
    );

    console.log(`🎯 المنتجات بعد التجميع: ${allGroupedProducts.length} موديل`);

    // ✅ حساب الترقيم على الموديلات المجمعة
    const totalProducts = allGroupedProducts.length;
    const totalPages = Math.ceil(totalProducts / 20);
    const skip = (page - 1) * 20;

    // ✅ 4. أخذ الجزء المطلوب فقط للصفحة الحالية
    const paginatedProducts = allGroupedProducts.slice(skip, skip + 20);

    console.log(`📄 الترقيم: صفحة ${page} من ${totalPages}, عرض ${paginatedProducts.length} موديل`);

    // ✅ 5. جلب الفئات مع Sub Categories
    const categories = await prisma.categories.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // ✅ تجميع Sub Categories لكل تصنيف
    const categoriesWithSubs = categories.map((cat) => ({
      ...cat,
      sub_categories: categories.filter(
        (subCat) => (subCat as any).sub === cat.name
      ),
    }));

    // ✅ 6. إحصائيات الترقيم
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      products: paginatedProducts,
      categories: categoriesWithSubs,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProducts: totalProducts,
        limit: 20,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      filters: {
        category: categoryName,
        sub: sub,
        search: search,
        employee: employee,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in products API:", error);
    return NextResponse.json({
      success: false,
      products: [],
      categories: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalProducts: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
      },
      error: "حدث خطأ في تحميل البيانات",
    });
  }
}