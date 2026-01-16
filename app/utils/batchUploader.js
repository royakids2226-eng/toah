/**
 * BatchUploader - نظام رفع الدفعات المتقدم
 * يدعم: التقسيم، الإيقاف/الاستئناف، إعادة المحاولة، حفظ الحالة
 */

export class BatchUploader {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 200;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000; // 2 ثانية
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.data = options.data || [];
    
    this.state = {
      status: 'idle', // idle, processing, uploading, paused, completed, error
      currentBatch: 0,
      totalBatches: 0,
      processedProducts: 0,
      totalProducts: this.data.length,
      successfulBatches: 0,
      failedBatches: 0,
      errors: [],
      startTime: null,
      elapsedTime: '00:00',
      summary: {
        totalProducts: this.data.length,
        successfullyUploaded: 0,
        skipped: 0,
        failed: 0,
        totalBatches: 0,
        totalTime: '',
        errors: []
      }
    };
    
    this.batches = [];
    this.isPaused = false;
    this.isCancelled = false;
    this.timer = null;
    
    // تقسيم البيانات إلى دفعات
    if (this.data.length > 0) {
      this.splitIntoBatches();
    }
  }

  /**
   * تقسيم البيانات إلى دفعات
   */
  splitIntoBatches() {
    this.batches = [];
    for (let i = 0; i < this.data.length; i += this.batchSize) {
      this.batches.push(this.data.slice(i, i + this.batchSize));
    }
    this.state.totalBatches = this.batches.length;
    this.state.summary.totalBatches = this.batches.length;
    console.log(`📦 تم تقسيم ${this.data.length} منتج إلى ${this.batches.length} دفعة`);
  }

  /**
   * بدء عملية الرفع
   */
  async start() {
    if (this.isCancelled) {
      throw new Error("تم إلغاء الرفع");
    }

    if (this.data.length === 0) {
      throw new Error("لا توجد بيانات للرفع");
    }

    this.state.status = 'processing';
    this.state.startTime = new Date();
    this.updateTimer();
    this.updateProgress();

    console.log(`🚀 بدء رفع ${this.data.length} منتج في ${this.batches.length} دفعة`);

    try {
      // معالجة كل دفعة
      for (let i = this.state.currentBatch; i < this.batches.length; i++) {
        if (this.isCancelled) break;
        if (this.isPaused) {
          this.state.status = 'paused';
          this.updateProgress();
          await this.waitForResume();
        }

        this.state.currentBatch = i + 1;
        this.state.status = 'uploading';
        this.updateProgress();

        const batch = this.batches[i];
        await this.processBatch(batch, i);
      }

      if (!this.isCancelled) {
        await this.finish();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * معالجة دفعة واحدة
   */
  async processBatch(batch, batchIndex) {
    let lastError;
    
    // محاولة الرفع مع إعادة المحاولة
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      if (this.isCancelled) break;
      if (this.isPaused) await this.waitForResume();
      
      try {
        console.log(`📤 معالجة الدفعة ${batchIndex + 1}/${this.batches.length} (المحاولة ${attempt}/${this.maxRetries})`);
        
        const result = await this.uploadBatch(batch, batchIndex);
        
        // تحديث الإحصائيات
        this.state.successfulBatches++;
        this.state.processedProducts += batch.length;
        this.state.summary.successfullyUploaded += result.added || 0;
        this.state.summary.skipped += result.skipped || 0;
        
        console.log(`✅ الدفعة ${batchIndex + 1}: ${result.added || 0} مضافة, ${result.skipped || 0} متخطاة`);
        this.updateProgress();
        
        return; // نجاح
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ فشل الدفعة ${batchIndex + 1} (المحاولة ${attempt}/${this.maxRetries}):`, error.message);
        
        if (attempt < this.maxRetries) {
          // انتظار قبل إعادة المحاولة
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    // فشل كل المحاولات
    this.state.failedBatches++;
    this.state.processedProducts += batch.length;
    this.state.summary.failed += batch.length;
    
    const batchError = {
      batch: batchIndex + 1,
      message: lastError?.message || "فشل في رفع الدفعة",
      timestamp: new Date().toISOString(),
      products: batch.length
    };
    
    this.state.errors.push(batchError);
    this.state.summary.errors.push(batchError);
    
    console.error(`❌ فشل نهائي للدفعة ${batchIndex + 1}`);
    this.updateProgress();
  }

  /**
   * رفع دفعة إلى السيرفر
   */
  async uploadBatch(batch, batchIndex) {
    const response = await fetch("/api/products/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ products: batch }),
      // زيادة timeout للدفعات الكبيرة
      signal: AbortSignal.timeout(60000) // 60 ثانية
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`خطأ في السيرفر: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "فشل في رفع الدفعة");
    }

    return result.summary || result;
  }

  /**
   * إيقاف الرفع مؤقتاً
   */
  pause() {
    this.isPaused = true;
    this.state.status = 'paused';
    this.updateProgress();
    console.log("⏸️ الرفع متوقف مؤقتاً");
  }

  /**
   * استئناف الرفع
   */
  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      console.log("▶️ استئناف الرفع");
    }
  }

  /**
   * إلغاء الرفع
   */
  cancel() {
    this.isCancelled = true;
    this.isPaused = false;
    this.state.status = 'cancelled';
    this.cleanup();
    console.log("❌ تم إلغاء الرفع");
  }

  /**
   * الانتظار حتى استئناف الرفع
   */
  async waitForResume() {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!this.isPaused || this.isCancelled) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * تأخير
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * إنهاء الرفع
   */
  async finish() {
    this.state.status = 'completed';
    this.stopTimer();
    
    // حساب الوقت الكلي
    const endTime = new Date();
    const startTime = this.state.startTime || endTime;
    const totalSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.state.summary.totalTime = `${minutes}:${seconds.toString().padStart(2, '0')} دقيقة`;
    
    // تحديث التقدم النهائي
    this.updateProgress();
    
    console.log(`🎉 اكتمل الرفع!`, this.state.summary);
    
    // إرسال النتيجة
    this.onComplete({
      success: true,
      summary: this.state.summary,
      state: this.state
    });
    
    // تنظيف
    this.cleanup();
  }

  /**
   * معالجة الخطأ
   */
  handleError(error) {
    this.state.status = 'error';
    this.stopTimer();
    
    const errorObj = {
      message: error.message,
      timestamp: new Date().toISOString(),
      state: { ...this.state }
    };
    
    this.state.errors.push(errorObj);
    this.state.summary.errors.push(errorObj);
    
    console.error("❌ خطأ في الرفع:", error);
    this.updateProgress();
    
    this.onError(error);
  }

  /**
   * تحديث مؤقت الوقت
   */
  updateTimer() {
    if (this.timer) clearInterval(this.timer);
    
    this.timer = setInterval(() => {
      if (this.state.startTime && this.state.status !== 'completed' && this.state.status !== 'error') {
        const now = new Date();
        const diff = Math.floor((now - this.state.startTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        this.state.elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.updateProgress();
      }
    }, 1000);
  }

  /**
   * إيقاف المؤقت
   */
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * تحديث التقدم
   */
  updateProgress() {
    this.onProgress({ ...this.state });
  }

  /**
   * استعادة الحالة
   */
  restoreState(savedState) {
    if (!savedState) return;
    
    this.state = {
      ...this.state,
      ...savedState,
      startTime: savedState.startTime ? new Date(savedState.startTime) : new Date()
    };
    
    this.state.currentBatch = savedState.currentBatch || 0;
    this.isPaused = savedState.status === 'paused';
    
    console.log(`🔄 تم استعادة الحالة: الدفعة ${this.state.currentBatch}/${this.state.totalBatches}`);
    
    if (this.isPaused) {
      this.state.status = 'paused';
    }
    
    this.updateTimer();
    this.updateProgress();
  }

  /**
   * الحصول على الحالة الحالية
   */
  getState() {
    return { ...this.state };
  }

  /**
   * تنظيف
   */
  cleanup() {
    this.stopTimer();
    this.isPaused = false;
    this.isCancelled = false;
  }

  /**
   * التحقق من اكتمال الرفع
   */
  get isComplete() {
    return this.state.status === 'completed' || this.state.status === 'error' || this.isCancelled;
  }
}

/**
 * حالة الرفع
 */
export const UploadStatus = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

/**
 * إنشاء تقرير الرفع
 */
export function createUploadReport(summary) {
  return {
    title: "تقرير رفع المنتجات",
    generatedAt: new Date().toLocaleString(),
    summary: {
      totalProducts: summary.totalProducts,
      successfullyUploaded: summary.successfullyUploaded,
      successRate: summary.totalProducts > 0 
        ? ((summary.successfullyUploaded / summary.totalProducts) * 100).toFixed(2) + '%'
        : '0%',
      skipped: summary.skipped,
      failed: summary.failed,
      totalBatches: summary.totalBatches,
      totalTime: summary.totalTime,
      errorsCount: summary.errors?.length || 0
    },
    batches: summary.batches || [],
    errors: summary.errors || [],
    recommendations: generateRecommendations(summary)
  };
}

/**
 * توليد توصيات بناءً على النتائج
 */
function generateRecommendations(summary) {
  const recommendations = [];
  
  if (summary.failed > summary.successfullyUploaded) {
    recommendations.push("معظم المنتجات فشل رفعها. تحقق من اتصال الشبكة وحاول مرة أخرى.");
  }
  
  if (summary.skipped > 0) {
    recommendations.push("بعض المنتجات موجودة مسبقاً. فكر في استخدام خاصية التحديث بدلاً من الإضافة.");
  }
  
  if (summary.errors?.length > 10) {
    recommendations.push("هناك العديد من الأخطاء. راجع ملف Excel قبل المحاولة مرة أخرى.");
  }
  
  if (summary.totalProducts > 5000) {
    recommendations.push("عدد المنتجات كبير. فكر في تقسيم الملف إلى أجزاء أصغر.");
  }
  
  if (summary.successfullyUploaded > 1000) {
    recommendations.push("تم إضافة عدد كبير من المنتجات. قد تحتاج إلى تحديث الصفحة لرؤية التغييرات.");
  }
  
  return recommendations;
}