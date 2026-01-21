import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// 🔥 إعدادات الاتصال النهائية بالمفاتيح الصحيحة 🔥
const r2 = new S3Client({
  region: "auto",
  endpoint: "https://71d79ed120aa922c04d1f1263131413f.r2.cloudflarestorage.com",
  credentials: {
    // ✅ هذا هو المفتاح الذي أرسلته للتو (32 حرف)
    accessKeyId: "ebf0d81a030d46a76f5f74b0d9365468",
    
    // ✅ هذا هو المفتاح السري الذي أرسلته سابقاً
    secretAccessKey: "5a226a4906efb64fbe6c76b72127d43de6908515820388ea2656ea199b55acca",
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
        // استخراج الكود (مثلاً 1001.jpg -> 1001)
        const itemCodeFromFileName = originalName.substring(0, originalName.lastIndexOf('.'));
        
        // تنظيف اسم الملف
        const safeFileName = originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
        // اسم فريد في R2
        const r2Key = `${uuidv4()}-${safeFileName}`;

        const uploadCommand = new PutObjectCommand({
          Bucket: "matgar1", // اسم الباكت
          Key: r2Key,
          Body: buffer,
          ContentType: file.type,
        });

        // 🚀 تنفيذ الرفع
        await r2.send(uploadCommand);

        // رابط الصورة للعرض
        // (استخدمنا الرابط العام الذي أرسلته سابقاً)
        const publicDomain = "https://pub-3ff77cba2e6f472094c4271d8b4e68a9.r2.dev";
        const imageUrl = `${publicDomain}/${r2Key}`;

        // البحث عن المنتج وتحديثه
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
          await prisma.products.update({
            where: { unique_id: product.unique_id },
            data: { images: imageUrl },
          });

          productInfo = {
            code: product.item_code,
            name: product.item_name
          };
          message = "✅ تم رفع الصورة وربطها مع المنتج";
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

    // الرد بتنسيق يناسب الفرونت إند الحالي
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