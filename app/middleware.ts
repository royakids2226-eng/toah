cat > app/middleware.ts << 'EOF'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images')

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname
  
  // تجاهل طلبات server actions
  const actionHeader = request.headers.get('next-action')
  if (actionHeader) {
    console.log('🚫 Middleware: حجب server action')
    return NextResponse.rewrite(new URL('/404', request.url))
  }
  
  // إذا كان طلب صورة، تحقق من الصلاحيات
  if (url.startsWith('/images/')) {
    try {
      const fileName = url.split('/images/')[1]
      if (fileName) {
        const filePath = path.join(IMAGES_DIR, fileName)
        
        try {
          await fs.access(filePath)
          const stats = await fs.stat(filePath)
          
          // أصلح الصلاحيات إذا لزم
          if ((stats.mode & 0o777) !== 0o664) {
            await fs.chmod(filePath, 0o664)
            console.log(`✅ أصلحت صلاحيات ${fileName}`)
          }
        } catch (error) {
          // الملف غير موجود
        }
      }
    } catch (error) {
      console.error('Middleware error:', error)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/images/:path*',
    '/api/upload',
  ],
}
EOF