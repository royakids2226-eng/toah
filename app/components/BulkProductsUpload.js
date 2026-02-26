"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  processExcelFile,
  validateExcelData,
  createDataAnalysisReport,
  getExcelTemplate,
  generateDataReport,
} from "@/app/utils/excelSplitter";
import { BatchUploader } from "@/app/utils/batchUploader";

export default function BulkProductsUpload({ onClose, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [dataReport, setDataReport] = useState(null);
  const fileInputRef = useRef(null);

  const batchUploaderRef = useRef(null);

  const requiredColumns = [
    "master_code",
    "item_code", // ✅ أصبح إجباري الآن
    "item_name",
    "out_price",
    "cur_qty",
  ];

  // ✅ تحميل الحالة المحفوظة عند فتح المكون
  useEffect(() => {
    const savedState = localStorage.getItem("bulk_upload_state");
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.status === "uploading" || state.status === "paused") {
        if (confirm("يوجد رفع متوقف. هل تريد استئناف الرفع؟")) {
          setUploadStatus(state);
          setPreviewData(state.data || []);
          setUploading(true);
          setPaused(state.status === "paused");

          // استعادة الـ BatchUploader
          batchUploaderRef.current = new BatchUploader({
            batchSize: state.batchSize || 200,
            onProgress: handleUploadProgress,
            onComplete: handleUploadComplete,
            onError: handleUploadError,
            maxRetries: 3,
          });

          // استعادة حالة الرفع
          batchUploaderRef.current.restoreState(state);
        } else {
          // مسح الحالة المحفوظة
          localStorage.removeItem("bulk_upload_state");
        }
      }
    }

    return () => {
      // تنظيف عند إغلاق المكون
      if (batchUploaderRef.current && !batchUploaderRef.current.isComplete) {
        const state = batchUploaderRef.current.getState();
        if (state.status === "uploading") {
          state.status = "paused";
          localStorage.setItem("bulk_upload_state", JSON.stringify(state));
        }
      }
    };
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ✅ التحقق من حجم الملف (حد أقصى 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setErrors([
        "حجم الملف كبير جداً (الحد الأقصى 20MB). قم بتقسيم الملف إلى أجزاء أصغر.",
      ]);
      return;
    }

    // ✅ مسح البيانات السابقة
    setErrors([]);
    setWarnings([]);
    setPreviewData([]);
    setDataReport(null);

    try {
      console.log(
        "📁 بدء معالجة ملف:",
        file.name,
        "بحجم:",
        (file.size / 1024 / 1024).toFixed(2),
        "MB"
      );

      // ✅ قراءة وتحليل ملف Excel
      const {
        data,
        errors: fileErrors,
        warnings: fileWarnings,
      } = await processExcelFile(file, requiredColumns);

      if (fileErrors.length > 0) {
        setErrors(fileErrors);
        return;
      }

      if (fileWarnings.length > 0) {
        setWarnings(fileWarnings);
      }

      // ✅ التحقق من البيانات
      const validationErrors = validateExcelData(data, requiredColumns);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // ✅ تحليل البيانات وإنشاء تقرير
      const report = createDataAnalysisReport(data);
      setDataReport(report);

      // ✅ إضافة تحذيرات من التقرير
      if (report.issues && report.issues.length > 0) {
        setWarnings((prev) => [...prev, ...report.issues]);
      }

      // ✅ تحذير إذا كان هناك تكرارات في item_code
      if (report.variants?.duplicateItemCodes > 0) {
        setWarnings((prev) => [
          ...prev,
          `⚠️ يوجد ${report.variants.duplicateItemCodes} item_code مكرر. قد لا يتم رفع جميع الأصناف!`,
        ]);
      }

      // ✅ تحذير إذا كان هناك master codes بدون تنوع
      const mastersWithoutVariants =
        report.masterCodes.unique - report.masterCodes.withVariants;
      if (mastersWithoutVariants > 0) {
        setWarnings((prev) => [
          ...prev,
          `ℹ️ ${mastersWithoutVariants} منتج بدون ألوان/مقاسات متعددة`,
        ]);
      }

      // ✅ حفظ البيانات للمعاينة
      setPreviewData(data);

      // ✅ تحذير إذا كان عدد المنتجات كبيراً
      if (data.length > 10000) {
        setWarnings((prev) => [
          ...prev,
          `📊 عدد المنتجات كبير (${data.length})، سيتم تقسيمها إلى دفعات. قد يستغرق الرفع وقتاً أطول.`,
        ]);
      }

      console.log(`✅ تم تحميل ${data.length} منتج بنجاح`);
      console.log("📊 تقرير البيانات:", report);

      // ✅ عرض ملخص سريع
      if (report.masterCodes.withVariants > 0) {
        console.log(
          `🎨 ${report.masterCodes.withVariants} منتج بها ألوان/مقاسات متعددة`
        );
      }
    } catch (error) {
      console.error("❌ خطأ في قراءة الملف:", error);
      setErrors([`خطأ في قراءة ملف Excel: ${error.message}`]);
    }
  };

  const handleUpload = async () => {
    if (previewData.length === 0) {
      alert("⚠️ لا توجد بيانات للرفع");
      return;
    }

    // ✅ التحذير من تكرارات item_code
    if (dataReport?.variants?.duplicateItemCodes > 0) {
      const confirmUpload = confirm(
        `⚠️ يوجد ${dataReport.variants.duplicateItemCodes} item_code مكرر.\n` +
          `قد لا يتم رفع جميع الأصناف (الألوان/المقاسات).\n\n` +
          `هل تريد المتابعة مع العلم بأن بعض الأصناف قد لا ترفع؟`
      );

      if (!confirmUpload) return;
    }

    // ✅ تحذير حول item_code إذا لزم
    const hasItemCodeIssues = previewData.some(
      (item) => !item.item_code || item.item_code === item.master_code
    );

    if (hasItemCodeIssues) {
      const confirmIssue = confirm(
        "⚠️ بعض المنتجات قد تحتوي على مشاكل في item_code.\n" +
          "سيحاول النظام إصلاحها تلقائياً.\n\n" +
          "هل تريد المتابعة؟"
      );

      if (!confirmIssue) return;
    }

    // ✅ تهيئة BatchUploader
    batchUploaderRef.current = new BatchUploader({
      batchSize: Math.min(200, Math.ceil(previewData.length / 20)), // حجم ديناميكي للدفعات
      onProgress: handleUploadProgress,
      onComplete: handleUploadComplete,
      onError: handleUploadError,
      maxRetries: 3,
      data: previewData,
    });

    setUploading(true);
    setPaused(false);

    try {
      await batchUploaderRef.current.start();
    } catch (error) {
      console.error("❌ خطأ في بدء الرفع:", error);
      handleUploadError(error);
    }
  };

  const handlePauseResume = () => {
    if (!batchUploaderRef.current) return;

    if (paused) {
      batchUploaderRef.current.resume();
      setPaused(false);
    } else {
      batchUploaderRef.current.pause();
      setPaused(true);
    }
  };

  const handleCancel = () => {
    if (batchUploaderRef.current) {
      if (confirm("هل تريد إلغاء الرفع؟ سيتم فقدان التقدم الحالي.")) {
        batchUploaderRef.current.cancel();
        resetUploadState();
      }
    } else {
      resetUploadState();
    }
  };

  const resetUploadState = () => {
    setUploading(false);
    setPaused(false);
    setUploadStatus(null);
    localStorage.removeItem("bulk_upload_state");

    if (batchUploaderRef.current) {
      batchUploaderRef.current.cleanup();
      batchUploaderRef.current = null;
    }
  };

  const handleUploadProgress = (status) => {
    setUploadStatus(status);

    // ✅ حفظ الحالة في localStorage للاستئناف
    if (status.status === "uploading" || status.status === "paused") {
      localStorage.setItem(
        "bulk_upload_state",
        JSON.stringify({
          ...status,
          data: previewData,
        })
      );
    }
  };

  const handleUploadComplete = (result) => {
    console.log("✅ الرفع اكتمل:", result);

    // ✅ مسح الحالة المحفوظة
    localStorage.removeItem("bulk_upload_state");

    // ✅ عرض النتائج مع تفاصيل أكثر
    const summary = result.summary;
    let message = `✅ تم الانتهاء من رفع المنتجات\n\n`;
    message += `📊 الإجمالي: ${summary.totalProducts} منتج\n`;
    message += `✅ المضافة: ${summary.successfullyUploaded} منتج\n`;
    message += `🔄 المحدثة: ${summary.updated || 0} منتج\n`;
    message += `⚠️ المتخطاة: ${summary.skipped} منتج\n`;
    message += `❌ الفاشلة: ${summary.failed} منتج\n`;
    message += `⏱️ الوقت: ${summary.totalTime}\n`;
    message += `📦 الدفعات: ${summary.totalBatches} دفعة\n\n`;

    if (summary.errors?.length > 0) {
      message += `🔍 الأخطاء: ${summary.errors.length} خطأ\n`;
      message += `(يمكنك تنزيل تقرير الأخطاء)`;
    }

    // ✅ إضافة ملاحظات خاصة بـ item_code
    if (dataReport?.variants?.duplicateItemCodes > 0) {
      message += `\n\n⚠️ ملاحظة: كان هناك ${dataReport.variants.duplicateItemCodes} item_code مكرر`;
      message += `\nقد يكون بعض الأصناف لم يرفع بسبب التكرار`;
    }

    if (summary.skipped > summary.successfullyUploaded) {
      message += `\n\n💡 معظم المنتجات موجودة مسبقاً (${summary.skipped} منتج)`;
      message += `\nتم تحديث البيانات الحالية`;
    }

    alert(message);

    // ✅ إعادة تعيين الحالة
    resetUploadState();

    // ✅ إغلاق النافذة وإعادة تحميل البيانات
    onSuccess();
    onClose();
  };

  const handleUploadError = (error) => {
    console.error("❌ خطأ في الرفع:", error);

    let errorMessage = "❌ فشل في رفع المنتجات\n";
    errorMessage += `السبب: ${error.message || "خطأ غير معروف"}\n\n`;

    if (
      error.message?.includes("network") ||
      error.message?.includes("اتصال")
    ) {
      errorMessage += "🌐 توصيحة: تحقق من اتصال الإنترنت وحاول مرة أخرى\n";
      errorMessage += "يمكنك استئناف الرفع من حيث توقف";
    } else if (error.message?.includes("timeout")) {
      errorMessage += "⏱️ توصيحة: انتهت المهلة. حاول بتقليل حجم الدفعات\n";
    } else if (error.message?.includes("item_code")) {
      errorMessage += "🏷️ مشكلة في item_code. تأكد من:\n";
      errorMessage += "1. وجود عمود item_code في الملف\n";
      errorMessage += "2. أن item_code فريد لكل لون/مقاس\n";
      errorMessage += "3. أن item_code لا يساوي master_code";
    }

    alert(errorMessage);

    // ✅ حفظ الحالة للاستئناف
    if (batchUploaderRef.current) {
      const state = batchUploaderRef.current.getState();
      state.status = "paused";
      localStorage.setItem("bulk_upload_state", JSON.stringify(state));
      setPaused(true);
    }
  };

  const downloadTemplate = () => {
    try {
      const templateData = getExcelTemplate();
      const blob = new Blob([templateData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "نموذج_المنتجات_المحسن.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(
        "✅ تم تحميل النموذج المحسن\n\nملاحظة: item_code أصبح عموداً مطلوباً الآن للتمييز بين الألوان والمقاسات"
      );
    } catch (error) {
      console.error("❌ خطأ في تحميل النموذج:", error);
      alert("❌ فشل في تحميل النموذج");
    }
  };

  const downloadErrorsReport = () => {
    if (
      !uploadStatus?.summary?.errors ||
      uploadStatus.summary.errors.length === 0
    ) {
      return;
    }

    const errorData = uploadStatus.summary.errors.map((error, index) => ({
      رقم: index + 1,
      الدفعة: error.batch || "غير محدد",
      المنتج: error.product || "غير محدد",
      الخطأ: error.message,
      الوقت: error.timestamp || new Date().toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الأخطاء");
    XLSX.writeFile(workbook, `تقرير_الأخطاء_${new Date().getTime()}.xlsx`);
  };

  const downloadDataAnalysisReport = () => {
    if (!dataReport) return;

    const reportData = [
      ["📊 تقرير تحليل البيانات"],
      ["", ""],
      ["إجمالي المنتجات:", dataReport.total],
      ["عدد master codes فريدة:", dataReport.masterCodes?.unique || 0],
      [
        "منتجات بها ألوان/مقاسات متعددة:",
        dataReport.masterCodes?.withVariants || 0,
      ],
      ["عدد item codes فريدة:", dataReport.variants?.totalItemCodes || 0],
      ["", ""],
      ["🎨 الألوان المتوفرة:"],
      ...(dataReport.attributes?.colors || []).map((color) => [
        "",
        `- ${color}`,
      ]),
      ["", ""],
      ["📏 المقاسات المتوفرة:"],
      ...(dataReport.attributes?.sizes || []).map((size) => ["", `- ${size}`]),
      ["", ""],
      ["⚠️ المشاكل المكتشفة:"],
      ...(dataReport.issues || []).map((issue) => ["", issue]),
      ["", ""],
      ["📋 عينة من البيانات (أول 10 صفوف):"],
      [
        "master_code",
        "item_code",
        "item_name",
        "color",
        "size",
        "out_price",
        "cur_qty",
      ],
      ...previewData
        .slice(0, 10)
        .map((item) => [
          item.master_code,
          item.item_code,
          item.item_name,
          item.color,
          item.size,
          item.out_price,
          item.cur_qty,
        ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير التحليل");
    XLSX.writeFile(
      workbook,
      `تقرير_تحليل_البيانات_${new Date().getTime()}.xlsx`
    );
  };

  const clearFile = () => {
    setPreviewData([]);
    setErrors([]);
    setWarnings([]);
    setDataReport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ حساب التقدم
  const calculateProgress = () => {
    if (!uploadStatus) return 0;

    const total = uploadStatus.totalProducts || 0;
    const processed = uploadStatus.processedProducts || 0;

    if (total === 0) return 0;
    return Math.round((processed / total) * 100);
  };

  // ✅ تحليل سريع للبيانات
  const getQuickAnalysis = () => {
    if (!previewData.length || !dataReport) return null;

    const analysis = {
      total: previewData.length,
      uniqueMasters: new Set(previewData.map((p) => p.master_code)).size,
      uniqueItems: new Set(previewData.map((p) => p.item_code)).size,
      hasVariants: dataReport.masterCodes?.withVariants > 0,
      variantCount: dataReport.masterCodes?.withVariants || 0,
      duplicateItems: dataReport.variants?.duplicateItemCodes || 0,
    };

    return analysis;
  };

  const quickAnalysis = getQuickAnalysis();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {uploading ? "جاري رفع المنتجات..." : "إضافة منتجات متعددة"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={uploading && !paused}
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* ✅ حالة الرفع */}
          {uploading && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blue-900">
                  {paused ? "⏸️ الرفع متوقف" : "📤 جاري رفع المنتجات..."}
                </h3>
                <div className="flex gap-2">
                  {uploadStatus?.currentBatch && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                      الدفعة {uploadStatus.currentBatch}/
                      {uploadStatus.totalBatches}
                    </span>
                  )}
                  <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                    {calculateProgress()}%
                  </span>
                </div>
              </div>

              {/* ✅ شريط التقدم */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-blue-800 mb-1">
                  <span>التقدم العام</span>
                  <span>
                    {uploadStatus?.processedProducts || 0} /{" "}
                    {uploadStatus?.totalProducts || 0}
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
              </div>

              {/* ✅ تفاصيل الرفع */}
              {uploadStatus && (
                <div className="text-sm text-blue-800 space-y-2">
                  <div className="flex justify-between">
                    <span>الحالة:</span>
                    <span className="font-medium">
                      {uploadStatus.status === "uploading" && "جاري الرفع"}
                      {uploadStatus.status === "paused" && "متوقف"}
                      {uploadStatus.status === "processing" && "جارٍ المعالجة"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>المنتجات المضافة:</span>
                    <span className="font-medium text-green-600">
                      {uploadStatus.summary?.successfullyUploaded || 0}
                    </span>
                  </div>

                  {uploadStatus.summary?.updated > 0 && (
                    <div className="flex justify-between">
                      <span>المنتجات المحدثة:</span>
                      <span className="font-medium text-blue-600">
                        {uploadStatus.summary?.updated || 0}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>المنتجات المتخطاة:</span>
                    <span className="font-medium text-yellow-600">
                      {uploadStatus.summary?.skipped || 0}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>الوقت المنقضي:</span>
                    <span className="font-medium">
                      {uploadStatus.elapsedTime || "00:00"}
                    </span>
                  </div>
                </div>
              )}

              {/* ✅ أزرار التحكم */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handlePauseResume}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    paused
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-yellow-500 text-white hover:bg-yellow-600"
                  }`}
                >
                  {paused ? "▶️ استئناف" : "⏸️ إيقاف مؤقت"}
                </button>

                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  ❌ إلغاء الرفع
                </button>

                {uploadStatus?.summary?.errors?.length > 0 && (
                  <button
                    onClick={downloadErrorsReport}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    📥 تحميل تقرير الأخطاء
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ✅ قسم اختيار الملف */}
          {!uploading && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  رفع ملف Excel
                </h3>
                <div className="flex gap-2">
                  {dataReport && (
                    <button
                      onClick={downloadDataAnalysisReport}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      📊 تقرير التحليل
                    </button>
                  )}
                  <button
                    onClick={downloadTemplate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    📥 تحميل النموذج
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  معلومات مهمة (إصدار محسن):
                </h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>
                    • <strong>master_code</strong>: الكود الرئيسي للمنتج (مثل:
                    3700)
                  </li>
                  <li>
                    • <strong>item_code</strong>:{" "}
                    <span className="font-bold text-red-600">مطلوب الآن</span>{" "}
                    للتمييز بين الألوان والمقاسات (مثل: 3700.1, 3700.2)
                  </li>
                  <li>
                    • <strong>item_code يجب أن يكون فريداً</strong> لكل لون/مقاس
                  </li>
                  <li>
                    • <strong>بدون item_code فريد</strong>: سيتم رفع صنف واحد
                    فقط!
                  </li>
                  <li>
                    • <strong>يدعم ملفات كبيرة</strong>: سيتم تقسيمها تلقائياً
                    إلى دفعات
                  </li>
                  <li>
                    • <strong>يمكن إيقاف واستئناف</strong>: حفظ التقدم تلقائياً
                  </li>
                </ul>
              </div>

              {/* ✅ تحليل سريع للبيانات */}
              {quickAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    📊 تحليل سريع للبيانات:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {quickAnalysis.total}
                      </div>
                      <div className="text-gray-600">إجمالي المنتجات</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">
                        {quickAnalysis.uniqueMasters}
                      </div>
                      <div className="text-gray-600">master code فريدة</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-900">
                        {quickAnalysis.uniqueItems}
                      </div>
                      <div className="text-gray-600">item code فريدة</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900">
                        {quickAnalysis.variantCount}
                      </div>
                      <div className="text-gray-600">منتج متعدد الأصناف</div>
                    </div>
                  </div>
                  {quickAnalysis.duplicateItems > 0 && (
                    <div className="mt-2 text-center">
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        ⚠️ يوجد {quickAnalysis.duplicateItems} item_code مكرر
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {previewData.length > 0
                      ? "ملف جاهز للرفع"
                      : "اختر ملف Excel"}
                  </h3>
                  <p className="text-gray-600">
                    {previewData.length > 0
                      ? `✅ تم تحميل ${previewData.length} منتج`
                      : "سيتم تقسيم الملف إلى دفعات تلقائياً"}
                  </p>
                  {previewData.length > 0 && quickAnalysis && (
                    <p className="text-sm text-green-600 mt-1">
                      🎯 {quickAnalysis.uniqueMasters} منتج رئيسي مع{" "}
                      {quickAnalysis.uniqueItems} صنف مختلف
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {previewData.length > 0 ? "تغيير الملف" : "اختر ملف Excel"}
                  </button>

                  {previewData.length > 0 && (
                    <button
                      onClick={clearFile}
                      className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      مسح الملف
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ التحذيرات */}
          {warnings.length > 0 && !uploading && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-700">⚠️</span>
                <h4 className="font-medium text-yellow-900">
                  تنبيهات ({warnings.length})
                </h4>
              </div>
              <ul className="text-yellow-700 text-sm space-y-1">
                {warnings.slice(0, 5).map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="ml-2">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ الأخطاء */}
          {errors.length > 0 && !uploading && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-red-700">❌</span>
                  <h4 className="font-medium text-red-900">
                    يجب تصحيح الأخطاء قبل الرفع ({errors.length} خطأ)
                  </h4>
                </div>
                <button
                  onClick={() => setErrors([])}
                  className="text-red-700 hover:text-red-900 text-sm bg-red-100 px-2 py-1 rounded"
                >
                  مسح الأخطاء
                </button>
              </div>
              <ul className="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="ml-2">•</span>
                    <span>{error}</span>
                  </li>
                ))}
                {errors.length > 10 && (
                  <li className="text-red-600 text-xs mt-2">
                    ... + {errors.length - 10} خطأ إضافي
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ✅ معاينة البيانات */}
          {previewData.length > 0 && !uploading && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  معاينة البيانات ({previewData.length} منتج)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    عرض أول 10 منتجات فقط للمعاينة
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right border">
                        master_code
                      </th>
                      <th className="px-3 py-2 text-right border">item_code</th>
                      <th className="px-3 py-2 text-right border">الاسم</th>
                      <th className="px-3 py-2 text-right border">اللون</th>
                      <th className="px-3 py-2 text-right border">المقاس</th>
                      <th className="px-3 py-2 text-right border">السعر</th>
                      <th className="px-3 py-2 text-right border">الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((product, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-3 py-2 border text-xs font-mono font-bold">
                          {product.master_code}
                        </td>
                        <td
                          className={`px-3 py-2 border text-xs font-mono ${
                            !product.item_code ||
                            product.item_code === product.master_code
                              ? "text-red-600 font-bold"
                              : "text-blue-600"
                          }`}
                        >
                          {product.item_code || "❌ مفقود"}
                        </td>
                        <td className="px-3 py-2 border text-xs text-right">
                          {product.item_name}
                        </td>
                        <td className="px-3 py-2 border text-xs">
                          {product.color || "افتراضي"}
                        </td>
                        <td className="px-3 py-2 border text-xs">
                          {product.size || "ONE SIZE"}
                        </td>
                        <td className="px-3 py-2 border text-xs">
                          {product.out_price} ج.م
                        </td>
                        <td className="px-3 py-2 border text-xs">
                          {product.cur_qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                    + {previewData.length - 10} منتج إضافي
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ✅ أزرار الإجراءات */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
          {!uploading && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>

              {previewData.length > 0 && errors.length === 0 && (
                <button
                  onClick={handleUpload}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <span>📤</span>
                  <span>
                    {previewData.length > 1000
                      ? `رفع ${previewData.length} منتج (${
                          quickAnalysis?.uniqueMasters || 0
                        } منتج رئيسي)`
                      : `رفع ${previewData.length} منتج`}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
