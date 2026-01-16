import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeView = searchParams.get("employee") === "true";
    const categoryId = searchParams.get("categoryId");

    console.log("🌐 جلب جميع البيانات:", {
      employeeView,
      categoryId,
    });

    // ✅ بناء شروط الفلترة الصحيحة
    const whereConditions: any = {};

    // للموظفين: نعرض كل شيء
    // للعملاء: نعرض فقط ما هو متوفر في المخزن الرئيسي
    if (!employeeView) {
      whereConditions.cur_qty = { gt: 0 };
      whereConditions.stor_id = 0;
    }

    // ✅ إزالة الفلترة الخاطئة لـ unique_id
    // كانت: unique_id: { contains: "-0" } - هذه تمنع معظم المنتجات

    console.log("📋 شروط الفلترة:", whereConditions);

    // ✅ جلب جميع المنتجات الخام
    const productsRaw = await prisma.products.findMany({
      where: whereConditions,
      orderBy: {
        item_name: "asc",
      },
      take: 2000, // زيادة الحد ليشمل المزيد من المنتجات
    });

    console.log(`📦 المنتجات الخام: ${productsRaw.length} منتج`);

    // ✅ تسجيل عينة للمنتجات للتحقق
    console.log("🔍 عينة من المنتجات (أول 5):");
    productsRaw.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. ${p.item_code} - ${p.item_name} - cur_qty: ${p.cur_qty} - size: ${p.size}`);
    });

    const categories = await prisma.categories.findMany();

    const groupedByMasterCode: { [key: string]: any } = {};
    
    productsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) {
        console.log("⚠️ منتج بدون master_code:", row.item_code);
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
          item_code: "", // سيكون للون الأول
          cur_qty: 0, // سيتم حسابه من تجميع الكميات
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
            // ✅ التحقق من أن الصورة صالحة
            if (img.startsWith("data:image") && img.length > 100) {
              // صورة base64 صالحة
              imageUrl = img;
            } else if (img.startsWith("http") || img.startsWith("/")) {
              // رابط صورة عادي
              imageUrl = img;
            } else if (img.length > 50) {
              // قد تكون base64 بدون prefix
              imageUrl = `data:image/jpeg;base64,${img}`;
            }
          }
        }

        variant = {
          id: row.unique_id,
          // ✅ حفظ itemCode العام لهذا اللون
          itemCode: itemCode,
          color: color,
          imageUrl: imageUrl,
          sizes: [],
          cur_qty: curQty,
          stor_id: row.stor_id || 0,
          // ✅ هذين الحقلين مهمين للمقاسات
          sizeItemCodes: {}, // سيكون لكل مقاس itemCode خاص به
          sizeQuantities: {}, // كميات كل مقاس
        };
        groupedByMasterCode[masterCode].variants.push(variant);
        
        // ✅ تعيين item_code للموديل من أول متغير
        if (!groupedByMasterCode[masterCode].item_code) {
          groupedByMasterCode[masterCode].item_code = itemCode;
        }
      } else {
        // ✅ إذا كان اللون موجود مسبقاً، أضف الكمية
        variant.cur_qty += curQty;
      }

      // ✅ تحديث الكمية الإجمالية للموديل
      groupedByMasterCode[masterCode].cur_qty += curQty;

      if (size && !variant.sizes.includes(size)) {
        variant.sizes.push(size);
      }

      // ✅ تسجيل كمية المقاس و itemCode الخاص به
      if (size) {
        variant.sizeQuantities = variant.sizeQuantities || {};
        variant.sizeQuantities[size] = (variant.sizeQuantities[size] || 0) + curQty;
        
        // ✅ حفظ itemCode لهذا المقاس المحدد
        variant.sizeItemCodes = variant.sizeItemCodes || {};
        variant.sizeItemCodes[size] = itemCode;
      }
      
      // ✅ إذا لم يكن هناك مقاس (ONE SIZE)، نستخدم itemCode العام
      if (!size && itemCode) {
        variant.itemCode = itemCode;
      }
    });

    const finalProducts = Object.values(groupedByMasterCode).filter(
      (product) => product.variants.length > 0
    );

    console.log(`🎯 المنتجات المجمعة: ${finalProducts.length} موديل`);

    // ✅ تسجيل مثال لكيفية تخزين البيانات
    if (finalProducts.length > 0) {
      const sampleProduct = finalProducts[0];
      console.log("📋 مثال على بيانات المنتج المجمع:");
      console.log(`   الموديل: ${sampleProduct.modelId}`);
      console.log(`   item_code العام: ${sampleProduct.item_code}`);
      console.log(`   الألوان: ${sampleProduct.variants.length}`);
      
      sampleProduct.variants.forEach((v: any, i: number) => {
        console.log(`   اللون ${i + 1}: ${v.color}`);
        console.log(`     itemCode: ${v.itemCode}`);
        console.log(`     المقاسات: ${v.sizes.join(', ')}`);
        console.log(`     sizeItemCodes:`, v.sizeItemCodes || {});
      });
    }

    // ✅ تسجيل إحصائيات
    const productsWithImages = finalProducts.filter(p => 
      p.variants.some((v: any) => 
        !v.imageUrl.includes("placeholder.com") && 
        !v.imageUrl.includes("via.placeholder")
      )
    ).length;

    console.log(`🖼️ المنتجات بصور حقيقية: ${productsWithImages}/${finalProducts.length}`);

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