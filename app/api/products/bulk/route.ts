import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ إعدادات الدفعات
const BATCH_SIZE = 50;
const MAX_PRODUCTS_PER_REQUEST = 2000;

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface ProductInput {
  master_code: string;
  item_code?: string;
  item_name: string;
  color?: string;
  size?: string;
  out_price: number | string;
  cur_qty: number | string;
  group_name?: string;
  kind_name?: string;
  images?: string;
  av_price?: number | string;
}

interface BatchResult {
  success: boolean;
  batchNumber: number;
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let processedCount = 0;
  
  try {
    const { products } = await request.json();

    console.log("🔄 استلام طلب رفع جماعي:", products?.length, "منتج");

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "يجب إرسال مصفوفة من المنتجات" },
        { status: 400 }
      );
    }

    if (products.length > MAX_PRODUCTS_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `لا يمكن رفع أكثر من ${MAX_PRODUCTS_PER_REQUEST} منتج في مرة واحدة`,
          suggestion: "قسم البيانات إلى دفعات أصغر",
        },
        { status: 400 }
      );
    }

    const results = {
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [] as string[],
      batchResults: [] as BatchResult[],
      performance: {
        totalProducts: products.length,
        startTime: new Date().toISOString(),
        estimatedTime: "",
      },
    };

    console.log("⏳ بدء عملية الإضافة...");

    // ✅ 1. تحضير البيانات مع إنشاء unique_id فريد
    console.log("🧹 جارٍ تحضير البيانات وإنشاء معرّفات فريدة...");
    const preparedProducts = prepareProductsData(products);
    results.performance.estimatedTime = estimateProcessingTime(preparedProducts.length);

    // ✅ 2. تقسيم إلى دفعات
    const batches = splitIntoBatches(preparedProducts, BATCH_SIZE);
    console.log(`📦 تم تقسيم البيانات إلى ${batches.length} دفعة`);

    // ✅ 3. معالجة كل دفعة
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchResult = await processBatch(batch, batchIndex + 1);
      
      results.batchResults.push(batchResult);
      results.addedCount += batchResult.added;
      results.updatedCount += batchResult.updated;
      results.skippedCount += batchResult.skipped;
      results.errors.push(...batchResult.errors);
      
      processedCount = batchIndex * BATCH_SIZE + batch.length;
      
      if (batchIndex % 5 === 0 || batchIndex === batches.length - 1) {
        console.log(`📊 التقدم: ${processedCount}/${preparedProducts.length} منتج`);
      }
    }

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    console.log(`🎉 تم الانتهاء في ${totalTime.toFixed(2)} ثانية: ${results.addedCount} مضافة, ${results.updatedCount} محدثة`);

    return NextResponse.json({
      success: true,
      message: `تمت العملية بنجاح في ${totalTime.toFixed(2)} ثانية`,
      summary: {
        totalProcessed: products.length,
        added: results.addedCount,
        updated: results.updatedCount,
        skipped: results.skippedCount,
        batches: batches.length,
      },
      performance: {
        totalTime: `${totalTime.toFixed(2)} ثانية`,
        productsPerSecond: (results.addedCount / totalTime).toFixed(2),
      },
      batches: results.batchResults.slice(0, 5),
      errors: results.errors.slice(0, 20),
      notes: [
        "✅ تم إنشاء unique_id فريد عشوائي لكل صنف",
        "✅ يمكن رفع ألوان/مقاسات متعددة لنفس master_code",
        "✅ كل item_code له unique_id خاص به",
      ]
    });
  } catch (error) {
    console.error("❌ Error in bulk products upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: "فشل في رفع المنتجات: " + error.message,
        processed: processedCount,
        timeElapsed: `${(Date.now() - startTime) / 1000} ثانية`,
      },
      { status: 500 }
    );
  }
}

// ============================================
// ✅ الدوال المساعدة - تم التعديل جذرياً
// ============================================

function prepareProductsData(products: any[]): ProductInput[] {
  return products.map((product, index) => {
    const rowNumber = index + 2;
    
    if (!product.master_code || product.master_code.toString().trim() === "") {
      throw new Error(`الصف ${rowNumber}: master_code مطلوب`);
    }

    if (!product.item_name || product.item_name.toString().trim() === "") {
      throw new Error(`الصف ${rowNumber}: item_name مطلوب`);
    }

    return {
      master_code: product.master_code.toString().trim(),
      item_code: product.item_code 
        ? product.item_code.toString().trim() 
        : generateItemCode(product, index),
      item_name: product.item_name.toString().trim(),
      color: (product.color || "افتراضي").toString().trim(),
      size: (product.size || "ONE SIZE").toString().trim(),
      out_price: parseFloat(product.out_price) || 0,
      av_price: parseFloat(product.av_price) || parseFloat(product.out_price) || 0,
      cur_qty: parseInt(product.cur_qty) || 0,
      group_name: (product.group_name || "عام").toString().trim(),
      kind_name: (product.kind_name || "عام").toString().trim(),
      images: product.images ? product.images.toString().trim() : "",
    };
  });
}

// ✅ إنشاء item_code تلقائياً إذا لم يكن موجوداً
function generateItemCode(product: any, index: number): string {
  const masterCode = product.master_code.toString().trim();
  const color = (product.color || "افتراضي").substring(0, 3).toUpperCase();
  const size = (product.size || "ONE").substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${masterCode}-${color}-${size}-${random}-${index}`;
}

// ✅ إنشاء unique_id عشوائي فريد
function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `PRD-${timestamp}-${random}`.toUpperCase();
}

function splitIntoBatches(products: ProductInput[], batchSize: number): ProductInput[][] {
  const batches: ProductInput[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }
  return batches;
}

async function processBatch(batch: ProductInput[], batchNumber: number): Promise<BatchResult> {
  const batchResult: BatchResult = {
    success: true,
    batchNumber,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    await prisma.$transaction(async (tx) => {
      // ✅ معالجة كل منتج على حدة
      for (const product of batch) {
        try {
          // ✅ أولاً: تحقق من التكرار باستخدام master_code + item_code
          const existingProduct = await tx.products.findFirst({
            where: {
              master_code: product.master_code,
              item_code: product.item_code
            }
          });

          if (existingProduct) {
            // ✅ تحديث المنتج الموجود
            await tx.products.update({
              where: { unique_id: existingProduct.unique_id },
              data: {
                item_name: product.item_name,
                out_price: product.out_price,
                av_price: product.av_price,
                cur_qty: product.cur_qty,
                color: product.color,
                size: product.size,
                group_name: product.group_name,
                kind_name: product.kind_name,
                images: product.images,
              }
            });
            batchResult.updated++;
            console.log(`🔄 محدث: ${product.master_code} - ${product.item_code}`);
          } else {
            // ✅ إضافة منتج جديد ب unique_id عشوائي
            const unique_id = generateUniqueId();
            
            await tx.products.create({
              data: {
                unique_id,
                master_code: product.master_code,
                item_code: product.item_code,
                item_name: product.item_name,
                color: product.color,
                size: product.size,
                out_price: product.out_price,
                av_price: product.av_price,
                cur_qty: product.cur_qty,
                group_name: product.group_name,
                kind_name: product.kind_name,
                images: product.images,
                stor_id: 0,
                type_id: 0,
                item_id: 0,
                unit_id: 0,
                unit_convert: 1.0,
                multi_unit: false,
                multi_type: false,
                unit_def1_id: 0,
                group_id: 0,
                class_id: 0,
                is_basic_unit: true,
                kind_id: 0,
                place_id: 0,
                unit_name_id: 0,
                unit_name: "قطعة",
                class_name: product.group_name,
                place_name: "المخزن الرئيسي",
              }
            });
            batchResult.added++;
            console.log(`✅ مضاف: ${product.master_code} - ${product.item_code} (${unique_id})`);
          }
        } catch (productError) {
          batchResult.skipped++;
          batchResult.errors.push(`الصف في الدفعة ${batchNumber}: ${productError.message}`);
          console.error(`❌ خطأ في ${product.master_code}:`, productError.message);
        }
      }
    }, {
      timeout: 60000,
      maxWait: 60000,
    });

    console.log(`✅ الدفعة ${batchNumber}: ${batchResult.added} مضافة, ${batchResult.updated} محدثة`);

  } catch (error) {
    console.error(`❌ خطأ في الدفعة ${batchNumber}:`, error);
    batchResult.success = false;
    batchResult.errors.push(`خطأ في الدفعة ${batchNumber}: ${error.message}`);
  }

  return batchResult;
}

function estimateProcessingTime(productCount: number): string {
  const batches = Math.ceil(productCount / BATCH_SIZE);
  const timePerBatch = 3;
  const totalSeconds = batches * timePerBatch;
  
  if (totalSeconds < 60) {
    return `${totalSeconds} ثانية`;
  } else {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} دقيقة`;
  }
}

function getRecommendations(results: any): string[] {
  const recommendations: string[] = [];
  
  if (results.updatedCount > results.addedCount) {
    recommendations.push("تم تحديث معظم المنتجات الموجودة مسبقاً.");
  }
  
  if (results.skippedCount > 0) {
    recommendations.push("بعض المنتجات تم تخطيها بسبب أخطاء.");
  }
  
  return recommendations;
}

// ✅ دعم GET
export async function GET() {
  try {
    const totalProducts = await prisma.products.count();
    
    // احصل على عينة لترى كيف تخزن البيانات
    const sampleProducts = await prisma.products.findMany({
      take: 3,
      select: {
        unique_id: true,
        master_code: true,
        item_code: true,
        item_name: true,
      }
    });

    // احسب عدد المنتجات الفريدة لكل master_code
    const masterCodeStats = await prisma.$queryRaw`
      SELECT master_code, COUNT(*) as variants 
      FROM products 
      WHERE master_code IS NOT NULL 
      GROUP BY master_code 
      HAVING COUNT(*) > 1
      LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      info: {
        totalProducts,
        sampleProducts,
        masterCodesWithVariants: masterCodeStats,
        note: "الآن يمكن لكل master_code أن يحتوي على عدة أصناف (item_code)",
        uniqueIdSystem: "يتم إنشاء unique_id عشوائي فريد لكل صنف"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}