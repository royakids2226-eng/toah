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
    const limit = parseInt(searchParams.get("limit") || "50");
    const employeeView = searchParams.get("employee") === "true";

    console.log("🔍 جلب المنتجات:", {
      category,
      sub,
      search,
      page,
      limit,
      employeeView,
    });

    let categoryName = category;
    if (category && !isNaN(parseInt(category))) {
      const cat = await prisma.categories.findUnique({
        where: { id: parseInt(category) },
      });
      if (cat) {
        categoryName = cat.name;
      }
    }

    const whereConditions: any = {};

    if (!employeeView) {
      whereConditions.cur_qty = { gt: 0 };
      whereConditions.stor_id = 0;
    }

    // معالجة شرط التصنيف
    if (categoryName) {
      whereConditions.OR = [
        { group_name: { contains: categoryName, mode: "insensitive" } },
        { kind_name: { contains: categoryName, mode: "insensitive" } },
        { item_name: { contains: categoryName, mode: "insensitive" } },
      ];
    }

    // معالجة شرط التصنيف الفرعي
    if (sub) {
      const subCondition = [
        { kind_name: { contains: sub, mode: "insensitive" } },
        { group_name: { contains: sub, mode: "insensitive" } },
        { item_name: { contains: sub, mode: "insensitive" } },
      ];
      if (whereConditions.OR) {
        whereConditions.OR.push(...subCondition);
      } else {
        whereConditions.OR = subCondition;
      }
    }

    // معالجة شرط البحث
    if (search) {
      const searchCondition = [
        { item_name: { contains: search, mode: "insensitive" } },
        { item_code: { contains: search, mode: "insensitive" } },
        { master_code: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { kind_name: { contains: search, mode: "insensitive" } },
        { group_name: { contains: search, mode: "insensitive" } },
      ];
      if (whereConditions.OR) {
        whereConditions.OR.push(...searchCondition);
      } else {
        whereConditions.OR = searchCondition;
      }
    }

    // جلب جميع المنتجات المطابقة
    const allProductsRaw = await prisma.products.findMany({
      where: whereConditions,
      orderBy: {
        unique_id: "desc",
      },
    });

    console.log(`📦 المنتجات الخام المجلوبة: ${allProductsRaw.length} منتج`);

    // تجميع المنتجات حسب master_code
    const groupedByMasterCode: { [key: string]: any } = {};

    allProductsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) return;

      const color = row.color || "Default";
      const size = row.size || null;
      const curQty = Number(row.cur_qty) || 0;

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
          cur_qty: 0,
          variants: [],
        };
      }

      let variant = groupedByMasterCode[masterCode].variants.find(
        (v: any) => v.color === color
      );

      if (!variant) {
        let imageUrl =
          "https://via.placeholder.com/500x700/EFEFEF/666666?text=No+Image";
        if (row.images) {
          const img = row.images.trim();
          if (img !== "" && img !== "null" && img !== "NULL") {
            if (!(img.startsWith("data:image") && img.length < 100)) {
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
          cur_qty: curQty,
          stor_id: row.stor_id || 0,
          sizeQuantities: {},
        };
        groupedByMasterCode[masterCode].variants.push(variant);
      }

      variant.cur_qty += curQty;
      groupedByMasterCode[masterCode].cur_qty += curQty;

      if (size && !variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }

      if (size) {
        variant.sizeQuantities = variant.sizeQuantities || {};
        variant.sizeQuantities[size] =
          (variant.sizeQuantities[size] || 0) + curQty;
      }
    });

    const allGroupedProducts = Object.values(groupedByMasterCode).filter(
      (product) => product.variants.length > 0
    );

    console.log(
      `🎯 المنتجات المجمعة النهائية: ${allGroupedProducts.length} موديل`
    );

    const totalProducts = allGroupedProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (page - 1) * limit;
    const paginatedProducts = allGroupedProducts.slice(skip, skip + limit);

    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      products: paginatedProducts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProducts: totalProducts,
        limit: limit,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      filters: {
        category: categoryName,
        sub: sub,
        search: search,
        employee: employeeView,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in products API:", error);
    return NextResponse.json({
      success: false,
      products: [],
      error: "حدث خطأ في تحميل البيانات",
    });
  }
}
