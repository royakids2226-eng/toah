import fs from 'fs/promises';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const TARGET_PERMISSIONS = 0o664; // rw-rw-r--

/**
 * ميدل وير لضبط صلاحيات الصور تلقائياً
 * يعمل على: /images/* و /api/images/* و /api/upload
 */
export async function imagesPermissionsMiddleware(req, res, next) {
  try {
    const url = req.url || '';
    
    // إذا كان طلب صورة أو رفع
    if (url.includes('/images/') || url.includes('/api/upload') || url.includes('/api/images/')) {
      
      // 🔥 تأكد من صلاحيات المجلد
      try {
        await fs.access(IMAGES_DIR);
        await fs.chmod(IMAGES_DIR, 0o755); // rwxr-xr-x
      } catch (error) {
        // إنشاء المجلد إذا لم يكن موجوداً
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        await fs.chmod(IMAGES_DIR, 0o755);
      }
      
      // إذا كان طلب رفع ملف
      if (req.method === 'POST' && url.includes('/api/upload')) {
        // سنعالج الصلاحيات في route نفسه
      }
      
      // إذا كان طلب عرض صورة
      if (req.method === 'GET' && url.includes('/images/')) {
        const fileName = url.split('/images/')[1];
        if (fileName && fileName.includes('.')) {
          const filePath = path.join(IMAGES_DIR, fileName);
          
          try {
            const stats = await fs.stat(filePath);
            const currentPerms = stats.mode & 0o777;
            
            // إذا كانت الصلاحيات غير 664، أصلحها
            if (currentPerms !== TARGET_PERMISSIONS) {
              await fs.chmod(filePath, TARGET_PERMISSIONS);
              console.log(`🔄 أصلحت صلاحيات ${fileName} من ${currentPerms.toString(8)} إلى 664`);
            }
          } catch (error) {
            // الملف غير موجود، لا مشكلة
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ خطأ في middleware الصلاحيات:', error);
    next();
  }
}