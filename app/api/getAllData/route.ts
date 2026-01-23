import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ تفعيل الكاش (اختياري، يسرع الاستجابة جداً)
export const revalidate = 0; // 0 = لا كاش (لضمان البيانات الطازجة دائماً)، يمكن زيادته لـ 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeView = searchParams.get("employee") === "true";
    const categoryId = searchParams.get("categoryId");
    
    // ✅ تحسين: إضافة Pagination لتقليل الحمل
    const limit = parseInt(searchParams.get("limit") || "1000"); // قللنا من 2000 لـ 1000 مبدئياً
    
    console.log("🌐 جلب البيانات:", {
      employeeView,
      categoryId,
      limit
    });

    const whereConditions: any = {};

    if (!employeeView) {
      whereConditions.cur_qty = { gt: 0 };
      whereConditions.stor_id = 0;
    }

    // ✅ جلب المنتجات مع الحد الجديد
    const productsRaw = await prisma.products.findMany({
      where: whereConditions,
      orderBy: {
        item_name: "asc", // أو unique_id: 'desc' للأحدث
      },
      take: limit, 
    });

    console.log(`📦 المنتجات الخام المجلوبة: ${productsRaw.length} منتج`);

    const categories = await prisma.categories.findMany();

    const groupedByMasterCode: { [key: string]: any } = {};
    
    productsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) {
        // console.log("⚠️ منتج بدون master_code:", row.item_code);
        return;
      }

      const color = row.color || "افتراضي";
      const size = row.size || null;
      const curQty = Number(row.cur_qty) || 0;
      const itemCode = row.item_code || "";

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
          item_code: "", 
          cur_qty: 0, 
          variants: [],
        };
      }

      let variant = groupedByMasterCode[masterCode].variants.find(
        (v: any) => v.color === color
      );

      if (!variant) {
        // ✅ المنطق الأصلي الكامل للصور
        let imageUrl = "https://via.placeholder.com/500x700/EFEFEF/666666?text=No+Image";

        if (row.images) {
          const img = row.images.trim();
          if (img !== "" && img !== "null" && img !== "NULL") {
            if (img.startsWith("data:image") && img.length > 100) {
              imageUrl = img;
            } else if (img.startsWith("http") || img.startsWith("/")) {
              imageUrl = img;
            } else if (img.length > 50) {
              imageUrl = `data:image/jpeg;base64,${img}`;
            }
          }
        }

        variant = {
          id: row.unique_id,
          itemCode: itemCode,
          color: color,
          imageUrl: imageUrl,
          sizes: [],
          cur_qty: curQty,
          stor_id: row.stor_id || 0,
          sizeItemCodes: {}, 
          sizeQuantities: {}, 
        };
        groupedByMasterCode[masterCode].variants.push(variant);
        
        if (!groupedByMasterCode[masterCode].item_code) {
          groupedByMasterCode[masterCode].item_code = itemCode;
        }
      } else {
        variant.cur_qty += curQty;
      }

      groupedByMasterCode[masterCode].cur_qty += curQty;

      if (size && !variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }

      if (size) {
        variant.sizeQuantities = variant.sizeQuantities || {};
        variant.sizeQuantities[size] = (variant.sizeQuantities[size] || 0) + curQty;
        
        variant.sizeItemCodes = variant.sizeItemCodes || {};
        variant.sizeItemCodes[size] = itemCode;
      }
      
      if (!size && itemCode) {
        variant.itemCode = itemCode;
      }
    });

    const finalProducts = Object.values(groupedByMasterCode).filter(
      (product) => product.variants.length > 0
    );

    console.log(`🎯 المنتجات المجمعة النهائية: ${finalProducts.length} موديل`);

    // إحصائيات الصور (كما في الكود الأصلي)
    const productsWithImages = finalProducts.filter(p => 
      p.variants.some((v: any) => 
        !v.imageUrl.includes("placeholder.com") && 
        !v.imageUrl.includes("via.placeholder")
      )
    ).length;

    return NextResponse.json({
      success: true,
      products: finalProducts,
      categories: categories,
      total: finalProducts.length,
      stats: {
        rawProducts: productsRaw.length,
        groupedProducts: finalProducts.length,
        productsWithRealImages: productsWithImages,
      },
      filters: {
        employee: employeeView,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in getAllData API:", error);
    return NextResponse.json({
      success: false,
      products: [],
      categories: [],
      error: error.message || "حدث خطأ في تحميل البيانات",
    });
  }
}