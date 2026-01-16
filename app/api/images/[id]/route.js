import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// ✅ مسار الصور - داخل المشروع
const IMAGES_DIR = path.join(process.cwd(), "public", "images");

// ✅ صلاحيات الملفات
const TARGET_PERMISSIONS = 0o664; // rw-rw-r--

// ✅ صورة افتراضية
const DEFAULT_IMAGE = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUY1RjUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+PGZldHVyZSB0ZXh0LWRlY29yYXRpb249InVuZGVybGluZSI+PGZhY2V0PkN1c3RvbWl6ZSBUaGlzPC9mYWNldD48L2ZldHVyZT48L3RleHQ+PHBhdGggZD0iTTYwIDgwSDE0MFYxNjBINjBWODBaIiBmaWxsPSIjRTVFNUU1Ii8+PHBhdGggZD0iTTYwIDgwSDE0MFYxNjBINjBWODBaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMTcyXzEyNTEpIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjxwYXRoIGQ9Ik04OCA5MkgxMTJWMTA0SDg4VjkyWiIgZmlsbD0iI0IzQjNCMyIvPjxwYXGggZD0iTTEwNCAxMTJIMTEyVjEzNkgxMDRWMTEyWiIgZmlsbD0iI0IzQjNCMyIvPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xNzJfMTI1MSIgeDE9IjYwIiB5MT0iODAiIHgyPSIxNDAiIHkyPSIxNjAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBzdG9wLWNvbG9yPSJ3aGl0ZSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log("📸 طلب صورة للمنتج:", id);
    console.log("🔍 مسار البحث:", IMAGES_DIR);

    // البحث عن المنتج
    const product = await prisma.products.findUnique({
      where: { unique_id: id },
      select: { 
        images: true,
        item_code: true,
        item_name: true,
        master_code: true
      },
    });

    if (!product) {
      console.log("❌ المنتج غير موجود:", id);
      return serveDefaultImage("المنتج غير موجود");
    }

    // ============================================
    // ✅ المحاولة 1: الصورة المخزنة في قاعدة البيانات
    // ============================================
    if (product.images) {
      // 1. إذا كانت الصورة مخزنة كـ Base64
      if (product.images.startsWith("data:image")) {
        console.log("✅ تقديم صورة Base64");
        return serveBase64Image(product.images);
      }

      // 2. إذا كانت الصورة رابط URL كامل
      if (product.images.startsWith("http")) {
        console.log("🔗 رابط خارجي:", product.images);
        
        // استخراج اسم الملف من الرابط
        const urlParts = product.images.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        if (fileName) {
          const filePath = path.join(IMAGES_DIR, fileName);
          console.log("📂 محاولة قراءة الملف المحلي:", filePath);
          
          try {
            await fs.access(filePath);
            console.log("✅ الملف موجود محلياً، تقديمه");
            
            // 🔥 محاولة تصحيح الصلاحيات قبل العرض
            await tryFixFilePermissions(filePath);
            
            return serveLocalImage(filePath);
          } catch (fsError) {
            console.log("⚠️ الملف غير موجود محلياً:", fsError.message);
            // ننتقل للرابط الخارجي
          }
        }
        
        // ✅ إعادة التوجيه للرابط الخارجي
        return NextResponse.redirect(product.images);
      }

      // 3. إذا كانت الصورة اسم ملف فقط
      const fileName = product.images.split('/').pop();
      if (fileName && fileName.includes('.')) {
        const filePath = path.join(IMAGES_DIR, fileName);
        console.log("📂 محاولة قراءة الملف:", filePath);
        
        try {
          await fs.access(filePath);
          console.log("✅ الملف موجود مباشرة، تقديمه");
          
          // 🔥 محاولة تصحيح الصلاحيات قبل العرض
          await tryFixFilePermissions(filePath);
          
          return serveLocalImage(filePath);
        } catch (fsError) {
          console.log("⚠️ الملف غير موجود:", fsError.message);
        }
      }
    }

    // ============================================
    // ✅ المحاولة 2: البحث عن الصورة باستخدام item_code
    // ============================================
    const searchCodes = [];
    if (product.item_code) searchCodes.push(product.item_code);
    if (product.master_code) searchCodes.push(product.master_code);
    
    console.log("🔍 البحث عن الصورة باستخدام:", searchCodes);
    
    if (searchCodes.length > 0) {
      // تنسيقات الملفات المدعومة
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      for (const code of searchCodes) {
        for (const ext of supportedExtensions) {
          const fileName = `${code}${ext}`;
          const filePath = path.join(IMAGES_DIR, fileName);
          
          try {
            await fs.access(filePath);
            console.log("✅ تم العثور على الصورة:", fileName);
            
            // 🔥 محاولة تصحيح الصلاحيات قبل العرض
            await tryFixFilePermissions(filePath);
            
            // تحديث قاعدة البيانات بالرابط الصحيح
            const imageUrl = `https://www.royakids.shop/images/${fileName}`;
            await prisma.products.update({
              where: { unique_id: id },
              data: { images: imageUrl },
            });
            
            console.log("🔄 تم تحديث رابط الصورة في قاعدة البيانات");
            return serveLocalImage(filePath);
          } catch (error) {
            // الملف غير موجود، جرب التنسيق التالي
            continue;
          }
        }
      }
    }

    // ============================================
    // ✅ المحاولة 3: صورة افتراضية
    // ============================================
    console.log("⚠️ لم يتم العثور على صورة، استخدام الصورة الافتراضية");
    return serveDefaultImage(`لا توجد صورة للمنتج: ${product.item_name || id}`);

  } catch (error) {
    console.error("❌ خطأ في خدمة الصورة:", error);
    return serveDefaultImage("خطأ في الخادم");
  }
}

// ============================================
// ✅ الدوال المساعدة
// ============================================

// 🔥 دالة جديدة: محاولة تصحيح صلاحيات الملف
async function tryFixFilePermissions(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const currentPerms = stats.mode & 0o777;
    
    // إذا كانت الصلاحيات غير 664، حاول تصحيحها
    if (currentPerms !== TARGET_PERMISSIONS) {
      try {
        await fs.chmod(filePath, TARGET_PERMISSIONS);
        console.log(`🔄 أصلحت صلاحيات ${path.basename(filePath)} من ${currentPerms.toString(8)} إلى 664`);
      } catch (chmodError) {
        console.warn(`⚠️ لم أستطع إصلاح صلاحيات ${path.basename(filePath)}: ${chmodError.message}`);
      }
    }
  } catch (error) {
    // تجاهل الخطأ، لا نريد أن يعيق العرض
    console.warn(`⚠️ خطأ في فحص صلاحيات ${path.basename(filePath)}: ${error.message}`);
  }
}

function serveBase64Image(base64Data) {
  const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
  
  if (matches && matches.length === 3) {
    const imageType = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": `image/${imageType}`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "X-Image-Source": "database-base64",
      },
    });
  }
  
  return serveDefaultImage("تنسيق Base64 غير صالح");
}

async function serveLocalImage(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileExtension = path.extname(filePath).toLowerCase().slice(1);
    const fileName = path.basename(filePath);
    
    // تحديد نوع المحتوى بناءً على امتداد الملف
    const contentTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };

    const contentType = contentTypeMap[fileExtension] || 'image/jpeg';

    console.log(`✅ تقديم الصورة: ${fileName} (${fileBuffer.length} bytes)`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Image-Source": "local-file",
        "X-Image-File": fileName,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ خطأ في قراءة الملف المحلي:", error);
    return serveDefaultImage("خطأ في قراءة الصورة");
  }
}

function serveDefaultImage(message = "صورة غير متاحة") {
  console.log("🔄 تقديم صورة افتراضية:", message);
  
  const defaultImageBuffer = Buffer.from(DEFAULT_IMAGE.split(',')[1], 'base64');
  
  return new NextResponse(defaultImageBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
      "X-Image-Status": "default",
      "X-Image-Message": encodeURIComponent(message),
    },
  });
}

// ✅ إضافة HEAD للتحقق من وجود الصورة دون تحميلها
export async function HEAD(request, { params }) {
  try {
    const { id } = params;
    const product = await prisma.products.findUnique({
      where: { unique_id: id },
      select: { images: true, item_code: true },
    });

    if (!product || !product.images) {
      return new NextResponse(null, {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          "X-Image-Available": "false",
        },
      });
    }

    // التحقق من وجود الملف محلياً
    if (product.item_code) {
      const filePath = path.join(IMAGES_DIR, `${product.item_code}.jpg`);
      try {
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        
        // 🔥 التحقق من الصلاحيات
        const currentPerms = stats.mode & 0o777;
        const permissionsOk = currentPerms === TARGET_PERMISSIONS;
        
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": stats.size.toString(),
            "X-Image-Available": "true",
            "X-Image-Source": "local",
            "X-Image-Permissions": currentPerms.toString(8),
            "X-Image-Permissions-Ok": permissionsOk ? "yes" : "no",
            "Cache-Control": "public, max-age=604800",
          },
        });
      } catch (error) {
        // الملف غير موجود محلياً
      }
    }

    // إذا كان هناك رابط صور
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "image/*",
        "X-Image-Available": "true",
        "X-Image-Source": "url",
        "Cache-Control": "public, max-age=3600",
      },
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        "X-Image-Available": "error",
      },
    });
  }
}

// 🔥 إضافة POST لفحص وإصلاح صلاحيات صورة محددة
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { action = 'check' } = await request.json();
    
    console.log(`🔧 ${action} صلاحيات صورة المنتج: ${id}`);
    
    const product = await prisma.products.findUnique({
      where: { unique_id: id },
      select: { images: true, item_code: true, item_name: true },
    });
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: "المنتج غير موجود"
      }, { status: 404 });
    }
    
    let result = {
      productId: id,
      productName: product.item_name,
      productCode: product.item_code,
      hasImageInDB: !!product.images,
      imagesFound: [],
      permissionsReport: []
    };
    
    // البحث عن ملفات الصور المحتملة
    const possibleFiles = [];
    if (product.item_code) {
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].forEach(ext => {
        possibleFiles.push(`${product.item_code}.${ext}`);
      });
    }
    
    // فحص كل ملف محتمل
    for (const fileName of possibleFiles) {
      const filePath = path.join(IMAGES_DIR, fileName);
      
      try {
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        const currentPerms = stats.mode & 0o777;
        
        result.imagesFound.push({
          file: fileName,
          size: stats.size,
          permissions: currentPerms.toString(8),
          permissionsOk: currentPerms === TARGET_PERMISSIONS
        });
        
        // إذا طلب الإصلاح وكانت الصلاحيات غير صحيحة
        if (action === 'fix' && currentPerms !== TARGET_PERMISSIONS) {
          try {
            await fs.chmod(filePath, TARGET_PERMISSIONS);
            result.permissionsReport.push({
              file: fileName,
              action: 'fixed',
              from: currentPerms.toString(8),
              to: TARGET_PERMISSIONS.toString(8)
            });
          } catch (chmodError) {
            result.permissionsReport.push({
              file: fileName,
              action: 'failed',
              error: chmodError.message
            });
          }
        }
      } catch (error) {
        // الملف غير موجود
      }
    }
    
    return NextResponse.json({
      success: true,
      action: action,
      message: result.imagesFound.length > 0 
        ? `تم العثور على ${result.imagesFound.length} صورة للمنتج`
        : "لم يتم العثور على أي صور للمنتج",
      data: result
    });
    
  } catch (error) {
    console.error("❌ خطأ في فحص صلاحيات الصورة:", error);
    return NextResponse.json({
      success: false,
      error: "فشل في فحص الصلاحيات: " + error.message
    }, { status: 500 });
  }
}