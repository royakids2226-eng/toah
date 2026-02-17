import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// 🔥 النسخة الآمنة: تقرأ من متغيرات البيئة 🔥
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,         // يقرأ من Vercel
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, // يقرأ من Vercel
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file");

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "لم يتم اختيار أي ملف" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const originalName = file.name;
        // استخراج الكود من اسم الملف (إزالة الامتداد)
        const itemCodeFromFileName = originalName.substring(0, originalName.lastIndexOf('.'));
        
        // تنظيف اسم الملف للرفع على R2
        const safeFileName = originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
        const r2Key = `${uuidv4()}-${safeFileName}`;

        // إعداد أمر الرفع
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME || "matgar1", 
          Key: r2Key,
          Body: buffer,
          ContentType: file.type,
        });

        // تنفيذ الرفع
        await r2.send(uploadCommand);

        const imageUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

        // 1. البحث عن أول منتج يطابق الاسم (لنعرف الموديل واللون)
        const product = await prisma.products.findFirst({
          where: { 
            OR: [
              { item_code: itemCodeFromFileName },
              { master_code: itemCodeFromFileName }
            ]
          }
        });

        let productInfo = null;
        let message = "✅ تم رفع الصورة (لم يتم العثور على منتج مطابق)";

        if (product) {
          // 2. منطق التحديث الجماعي (لكل المقاسات)
          // نقوم بإنشاء شرط للبحث عن كل الأخوة (نفس الموديل ونفس اللون)
          
          let whereCondition = {};

          if (product.master_code) {
            // إذا كان للمنتج ماستر كود، نحدث كل المنتجات التي لها نفس الماستر كود ونفس اللون
            whereCondition = {
                master_code: product.master_code,
                // نضيف شرط اللون فقط إذا كان موجوداً لضمان عدم خلط ألوان الموديل الواحد
                ...(product.color ? { color: product.color } : {})
            };
          } else {
            // إذا لم يوجد ماستر كود، نعتمد على الكود المطابق فقط (حالة احتياطية)
            whereCondition = {
                OR: [
                    { item_code: itemCodeFromFileName },
                    { master_code: itemCodeFromFileName }
                ]
            };
          }

          // تنفيذ التحديث الجماعي
          const updateResult = await prisma.products.updateMany({
            where: whereCondition,
            data: { images: imageUrl },
          });

          productInfo = {
            code: product.item_code || product.master_code,
            name: product.item_name,
            color: product.color,
            master: product.master_code
          };
          
          message = `✅ تم رفع الصورة وتطبيقها على ${updateResult.count} منتج/مقاس (موديل: ${product.master_code || 'بدون'}، لون: ${product.color || 'الكل'})`;
        }

        results.push({
          fileName: originalName,
          success: true,
          message: message,
          imageUrl: imageUrl,
          product: productInfo
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          fileName: file.name,
          success: false,
          error: fileError.message
        });
      }
    }

    if (files.length === 1) {
        return NextResponse.json({
            success: results[0].success,
            message: results[0].message,
            image: { url: results[0].imageUrl },
            product: results[0].product,
            error: results[0].error
        });
    }

    return NextResponse.json({
      success: true,
      message: `تمت معالجة ${files.length} ملف`,
      results: results
    });

  } catch (error) {
    console.error("Global Upload Error:", error);
    return NextResponse.json({ success: false, error: "فشل في عملية الرفع: " + error.message }, { status: 500 });
  }
}