import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir, stat, unlink, chmod } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔥🔥🔥 إعدادات نهائية
const IMAGES_DIR = path.join(process.cwd(), "public", "images");
const TARGET_PERMISSIONS = 0o664; // rw-rw-r--
const DIRECTORY_PERMISSIONS = 0o755; // rwxr-xr-x

// ✅ تأكد من صلاحيات المجلد عند بدء التشغيل
(async function initializePermissions() {
  try {
    console.log('🔧 بدء تهيئة صلاحيات مجلد الصور...');
    
    // إنشاء المجلد إذا لم يكن موجوداً
    await mkdir(IMAGES_DIR, { recursive: true });
    
    // ضبط صلاحيات المجلد
    await chmod(IMAGES_DIR, DIRECTORY_PERMISSIONS);
    
    // إصلاح صلاحيات الملفات الموجودة
    try {
      const files = await readdir(IMAGES_DIR);
      let fixed = 0;
      
      for (const file of files) {
        const filePath = path.join(IMAGES_DIR, file);
        const stats = await stat(filePath);
        
        if (stats.isFile()) {
          const currentPerms = stats.mode & 0o777;
          if (currentPerms !== TARGET_PERMISSIONS) {
            await chmod(filePath, TARGET_PERMISSIONS);
            fixed++;
          }
        }
      }
      
      if (fixed > 0) {
        console.log(`✅ تم إصلاح ${fixed} ملف إلى صلاحيات 664`);
      }
    } catch (error) {
      // لا مشكلة إذا لم تكن هناك ملفات
    }
    
    console.log(`✅ مجلد الصور جاهز: ${IMAGES_DIR}`);
  } catch (error) {
    console.error('❌ خطأ في تهيئة الصلاحيات:', error);
  }
})();

export async function POST(request) {
  const startTime = Date.now();
  const results = [];
  
  try {
    const formData = await request.formData();
    const files = formData.getAll("file");
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "لم يتم اختيار أي ملف" },
        { status: 400 }
      );
    }
    
    console.log(`📤 رفع ${files.length} ملف...`);
    
    // 🔥 معالجة كل ملف
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await processFileWithPermissions(file, i + 1);
      results.push(result);
    }
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: `تم رفع ${results.filter(r => r.success).length} من ${files.length} ملف`,
      results: results,
      processingTime: `${processingTime}ms`
    });
    
  } catch (error) {
    console.error("❌ خطأ في الرفع:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 🔥🔥🔥 الدالة الرئيسية لمعالجة الملفات
async function processFileWithPermissions(file, index) {
  const result = {
    fileName: file.name,
    success: false,
    message: "",
    imageUrl: "",
    product: null,
    permissions: null
  };
  
  try {
    // استخراج كود المنتج من اسم الملف
    const fileNameWithoutExt = path.parse(file.name).name;
    const safeFileName = sanitizeFileName(file.name);
    const filePath = path.join(IMAGES_DIR, safeFileName);
    
    // البحث عن المنتج
    const product = await prisma.products.findFirst({
      where: { 
        OR: [
          { item_code: fileNameWithoutExt },
          { master_code: fileNameWithoutExt }
        ]
      },
      select: {
        unique_id: true,
        item_code: true,
        item_name: true,
        images: true,
      },
    });
    
    // 🔥 1. حفظ الملف
    const buffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(buffer));
    
    // 🔥 2. تطبيق صلاحيات 664 فوراً
    try {
      await chmod(filePath, TARGET_PERMISSIONS);
      
      // التحقق من الصلاحيات
      const stats = await stat(filePath);
      const actualPerms = stats.mode & 0o777;
      result.permissions = actualPerms.toString(8);
      
      if (actualPerms !== TARGET_PERMISSIONS) {
        console.warn(`⚠️ صلاحيات الملف غير متطابقة: ${actualPerms.toString(8)} بدلاً من 664`);
        // حاول مرة أخرى
        await chmod(filePath, TARGET_PERMISSIONS);
      }
      
      console.log(`✅ ${safeFileName}: صلاحيات ${result.permissions}`);
    } catch (chmodError) {
      console.error(`❌ فشل في تعيين صلاحيات: ${chmodError.message}`);
      result.message = `تم الحفظ ولكن فشل في تعديل الصلاحيات`;
    }
    
    // 🔥 3. إنشاء رابط الصورة
    const imageUrl = `/images/${safeFileName}`;
    result.imageUrl = `https://www.royakids.shop${imageUrl}`;
    
    // 🔥 4. ربط مع المنتج
    if (product) {
      await prisma.products.update({
        where: { unique_id: product.unique_id },
        data: { images: result.imageUrl },
      });
      
      result.product = {
        code: product.item_code,
        name: product.item_name
      };
      result.message = "✅ تم رفع الصورة وربطها مع المنتج";
    } else {
      result.message = "✅ تم رفع الصورة (لم يتم الربط)";
    }
    
    result.success = true;
    
  } catch (error) {
    console.error(`❌ خطأ في معالجة ${file.name}:`, error);
    result.message = `خطأ: ${error.message}`;
  }
  
  return result;
}

// 🔥 دالة لتصحيح صلاحيات جميع الملفات
export async function PATCH() {
  try {
    console.log('🛠️ بدء تصحيح صلاحيات جميع الملفات...');
    
    const files = await readdir(IMAGES_DIR);
    const report = {
      total: files.length,
      corrected: 0,
      alreadyCorrect: 0,
      errors: 0,
      details: []
    };
    
    for (const file of files) {
      const filePath = path.join(IMAGES_DIR, file);
      
      try {
        const stats = await stat(filePath);
        
        if (stats.isFile()) {
          const currentPerms = stats.mode & 0o777;
          
          if (currentPerms !== TARGET_PERMISSIONS) {
            await chmod(filePath, TARGET_PERMISSIONS);
            report.corrected++;
            report.details.push({
              file,
              from: currentPerms.toString(8),
              to: TARGET_PERMISSIONS.toString(8),
              status: 'corrected'
            });
          } else {
            report.alreadyCorrect++;
            report.details.push({
              file,
              permissions: currentPerms.toString(8),
              status: 'already_correct'
            });
          }
        }
      } catch (error) {
        report.errors++;
        report.details.push({
          file,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    console.log(`✅ تم تصحيح ${report.corrected} ملف`);
    
    return NextResponse.json({
      success: true,
      message: `تم فحص ${report.total} ملف، تم تصحيح ${report.corrected}`,
      report: report
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 🔥 GET: معلومات عن الصلاحيات
export async function GET() {
  try {
    const stats = await stat(IMAGES_DIR);
    const dirPerms = stats.mode & 0o777;
    
    const files = await readdir(IMAGES_DIR);
    const filePerms = [];
    
    for (const file of files.slice(0, 10)) { // أول 10 ملفات فقط
      try {
        const filePath = path.join(IMAGES_DIR, file);
        const fileStats = await stat(filePath);
        const perms = fileStats.mode & 0o777;
        filePerms.push({ file, permissions: perms.toString(8) });
      } catch (error) {
        filePerms.push({ file, error: error.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      directory: {
        path: IMAGES_DIR,
        permissions: dirPerms.toString(8),
        required: DIRECTORY_PERMISSIONS.toString(8)
      },
      files: {
        total: files.length,
        sample: filePerms
      },
      target: {
        file: TARGET_PERMISSIONS.toString(8) + ' (rw-rw-r--)',
        directory: DIRECTORY_PERMISSIONS.toString(8) + ' (rwxr-xr-x)'
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 🔥 دالة مساعدة
function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s.-]/gi, '')
    .replace(/\s+/g, '_')
    .replace(/\.\./g, '.')
    .trim();
}