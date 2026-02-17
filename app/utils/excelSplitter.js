import * as XLSX from "xlsx";

/**
 * معالجة ملف Excel وتقسيمه إلى بيانات منظمة
 * @param {File} file - ملف Excel
 * @param {Array} requiredColumns - الأعمدة المطلوبة
 * @returns {Object} - { data, errors, warnings }
 */
export async function processExcelFile(file, requiredColumns = []) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const errors = [];
    const warnings = [];
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // قراءة المصنف
        const workbook = XLSX.read(data, { type: "array" });
        
        if (workbook.SheetNames.length === 0) {
          errors.push("الملف لا يحتوي على أي أوراق بيانات");
          resolve({ data: [], errors, warnings });
          return;
        }
        
        // استخدام الورقة الأولى
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 🔥 التعديل هنا: إضافة raw: false لقراءة القيم كنصوص كما تظهر (لمنع تحويل 3710.10 إلى 3710.1)
        const rawData = XLSX.utils.sheet_to_json(firstSheet, { 
            defval: "",
            raw: false, // ✅ هذا يضمن قراءة الأرقام كنصوص للحفاظ على الأصفار (مثل 3710.10)
        });
        
        console.log(`📊 قراءة ${rawData.length} صف من ملف Excel`);
        
        if (rawData.length === 0) {
          errors.push("الملف لا يحتوي على بيانات");
          resolve({ data: [], errors, warnings });
          return;
        }
        
        // ✅ التحقق من وجود الأعمدة المطلوبة المعدلة
        const enhancedRequiredColumns = [...requiredColumns, "item_code"]; // ✅ إضافة item_code كمطلوب
        
        if (enhancedRequiredColumns.length > 0 && rawData.length > 0) {
          const firstRow = rawData[0];
          const missingColumns = enhancedRequiredColumns.filter(col => !(col in firstRow));
          
          if (missingColumns.length > 0) {
            errors.push(`الأعمدة المفقودة: ${missingColumns.join(", ")}`);
            warnings.push("ملاحظة: item_code مطلوب الآن للتمييز بين الألوان والمقاسات");
            resolve({ data: [], errors, warnings });
            return;
          }
        }
        
        // تحويل وتنظيف البيانات
        const processedData = cleanExcelData(rawData);
        
        // التحقق من البيانات
        const validationErrors = validateExcelData(processedData, enhancedRequiredColumns);
        errors.push(...validationErrors);
        
        // تحذيرات
        if (processedData.length > 10000) {
          warnings.push(`عدد المنتجات كبير جداً (${processedData.length}). قد يستغرق الرفع وقتاً طويلاً.`);
        }
        
        // التحقق من التكرارات في item_code (يجب أن يكون فريداً)
        const duplicateItemCodes = findDuplicates(processedData, 'item_code');
        if (duplicateItemCodes.length > 0) {
          warnings.push(`تم العثور على ${duplicateItemCodes.length} item_code مكرر: ${duplicateItemCodes.slice(0, 5).join(', ')}${duplicateItemCodes.length > 5 ? '...' : ''}`);
        }
        
        // التحقق من تنوع item_code لكل master_code
        const masterCodeStats = analyzeMasterCodeVariants(processedData);
        masterCodeStats.forEach(stat => {
          if (stat.variants > 1) {
            console.log(`✅ ${stat.master_code}: ${stat.variants} نوع (ألوان/مقاسات)`);
          }
        });
        
        resolve({ 
          data: processedData, 
          errors, 
          warnings 
        });
        
      } catch (error) {
        console.error("❌ خطأ في معالجة ملف Excel:", error);
        errors.push(`خطأ في قراءة ملف Excel: ${error.message}`);
        resolve({ data: [], errors, warnings });
      }
    };
    
    reader.onerror = () => {
      errors.push("خطأ في قراءة الملف");
      resolve({ data: [], errors, warnings });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * تنظيف بيانات Excel مع التركيز على item_code للتمييز بين الألوان والمقاسات
 * @param {Array} data - البيانات الخام
 * @returns {Array} - البيانات النظيفة
 */
function cleanExcelData(data) {
  return data.map((row, index) => {
    const rowNumber = index + 2;
    const cleanedRow = {};
    
    // تحويل جميع القيم إلى strings وتنظيفها
    Object.keys(row).forEach(key => {
      let value = row[key];
      
      // تجاهل القيم null/undefined
      if (value === null || value === undefined) {
        cleanedRow[key] = "";
        return;
      }
      
      // تحويل إلى string وتنظيف
      value = value.toString().trim();
      
      // تنظيف الأعمدة الرقمية
      if (key === 'out_price' || key === 'av_price' || key === 'cur_qty') {
        // إزالة أي أحرف غير رقمية
        const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        cleanedRow[key] = isNaN(numericValue) ? 0 : numericValue;
      } else if (key === 'item_code') {
        // ✅ تنظيف item_code بشكل خاص - مهم للغاية!
        // بما أننا استخدمنا raw: false، القيمة هنا ستكون نصية تماماً كما في الإكسيل (مثلاً "3710.10")
        cleanedRow[key] = value.toString().trim();
        
        // إذا كان item_code فارغاً، نحاول إنشاء واحد تلقائياً
        if (!cleanedRow[key] || cleanedRow[key] === "") {
          const masterCode = (row.master_code || "").toString().trim();
          const color = (row.color || "افتراضي").toString().trim().substring(0, 3);
          const size = (row.size || "ONE").toString().trim().substring(0, 3);
          
          if (masterCode) {
            cleanedRow[key] = `${masterCode}-${color}-${size}`;
          } else {
            cleanedRow[key] = `ITEM-${rowNumber}-${color}-${size}`;
          }
          
          console.log(`⚠️ الصف ${rowNumber}: تم إنشاء item_code تلقائياً: ${cleanedRow[key]}`);
        }
      } else if (key === 'master_code') {
        // تنظيف الأكواد الرئيسية
        cleanedRow[key] = value.toUpperCase().replace(/\s+/g, '-');
      } else if (key === 'item_name') {
        // تنظيف الأسماء (إزالة المسافات الزائدة)
        cleanedRow[key] = value.replace(/\s+/g, ' ').trim();
      } else if (key === 'color' || key === 'size') {
        // تنظيف الألوان والمقاسات
        cleanedRow[key] = value || "افتراضي";
      } else {
        cleanedRow[key] = value;
      }
    });
    
    // ✅ التأكد من وجود master_code
    if (!cleanedRow.master_code || cleanedRow.master_code === "") {
      cleanedRow.master_code = `MASTER-${rowNumber}`;
      console.log(`⚠️ الصف ${rowNumber}: تم إنشاء master_code تلقائياً: ${cleanedRow.master_code}`);
    }
    
    // ✅ التأكد من وجود item_code (مرة أخرى للتأكيد)
    if (!cleanedRow.item_code || cleanedRow.item_code === "") {
      const colorCode = (cleanedRow.color || 'DEF').substring(0, 3).toUpperCase();
      const sizeCode = (cleanedRow.size || 'ONE').substring(0, 3).toUpperCase();
      cleanedRow.item_code = `${cleanedRow.master_code}-${colorCode}-${sizeCode}`;
      console.log(`⚠️ الصف ${rowNumber}: تم إنشاء item_code نهائياً: ${cleanedRow.item_code}`);
    }
    
    // ✅ إذا كان item_code يساوي master_code، نضيف تمييزاً
    if (cleanedRow.item_code === cleanedRow.master_code) {
      const colorCode = (cleanedRow.color || 'DEF').substring(0, 3).toUpperCase();
      const sizeCode = (cleanedRow.size || 'ONE').substring(0, 3).toUpperCase();
      // ملاحظة: تم إيقاف هذا التعديل التلقائي إذا كان الكود أصلاً 3710.10
      // لأنه قد يكون مقصوداً، لكن التحذير سيظهر
      // cleanedRow.item_code = `${cleanedRow.master_code}-${colorCode}-${sizeCode}`;
      console.log(`🔄 الصف ${rowNumber}: item_code مطابق للماستر: ${cleanedRow.item_code}`);
    }
    
    // ✅ تعيين القيم الافتراضية للأعمدة المفقودة
    const defaults = {
      color: "افتراضي",
      size: "ONE SIZE",
      group_name: "عام",
      kind_name: "عام",
      images: "",
      stor_id: 0,
      type_id: 0,
      av_price: cleanedRow.out_price || 0,
    };
    
    Object.keys(defaults).forEach(key => {
      if (!(key in cleanedRow) || cleanedRow[key] === "") {
        cleanedRow[key] = defaults[key];
      }
    });
    
    // ✅ إنشاء unique_id باستخدام item_code (هذا هو المفتاح!)
    cleanedRow.unique_id = `${cleanedRow.item_code}-${cleanedRow.type_id || 0}-${cleanedRow.stor_id || 0}`;
    
    // ✅ إضافة حقل variant_id للتمييز بين الأصناف
    const colorPart = (cleanedRow.color || 'default').substring(0, 3).toUpperCase();
    const sizePart = (cleanedRow.size || 'onesize').substring(0, 3).toUpperCase();
    cleanedRow.variant_id = `${colorPart}-${sizePart}`;
    
    // التحقق من صحة الأرقام
    if (cleanedRow.out_price <= 0) {
      console.warn(`⚠️ الصف ${rowNumber}: out_price غير صالح (${cleanedRow.out_price})`);
    }
    
    if (cleanedRow.cur_qty < 0) {
      console.warn(`⚠️ الصف ${rowNumber}: cur_qty سالب (${cleanedRow.cur_qty})`);
    }
    
    return cleanedRow;
  }).filter(row => {
    // تصفية الصفوف الفارغة - مع اشتراط وجود item_code
    return row.master_code && row.master_code.trim() !== "" &&
           row.item_name && row.item_name.trim() !== "" &&
           row.item_code && row.item_code.trim() !== ""; // ✅ شرط جديد
  });
}

/**
 * التحقق من صحة البيانات مع التركيز على item_code
 * @param {Array} data - البيانات المطلوبة التحقق
 * @param {Array} requiredColumns - الأعمدة المطلوبة
 * @returns {Array} - قائمة الأخطاء
 */
export function validateExcelData(data, requiredColumns = []) {
  const errors = [];
  
  if (!data || !Array.isArray(data)) {
    return ["بيانات غير صالحة"];
  }
  
  if (data.length === 0) {
    return ["لا توجد بيانات للتحقق"];
  }
  
  // التحقق من كل صف
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    
    // التحقق من الأعمدة المطلوبة
    requiredColumns.forEach(column => {
      if (!row[column] && row[column] !== 0) {
        errors.push(`الصف ${rowNumber}: ${column} مطلوب`);
      }
    });
    
    // ✅ التحقق من master_code
    if (!row.master_code || row.master_code.trim() === "") {
      errors.push(`الصف ${rowNumber}: master_code مطلوب`);
    } else if (row.master_code.length > 50) {
      errors.push(`الصف ${rowNumber}: master_code طويل جداً (الحد الأقصى 50 حرفاً)`);
    }
    
    // ✅ التحقق من item_code - مهم جداً!
    if (!row.item_code || row.item_code.trim() === "") {
      errors.push(`الصف ${rowNumber}: item_code مطلوب للتمييز بين الألوان والمقاسات`);
    } else if (row.item_code.length > 100) {
      errors.push(`الصف ${rowNumber}: item_code طويل جداً (الحد الأقصى 100 حرفاً)`);
    }
    
    // ✅ التحقق من أن item_code لا يساوي master_code (تحذير فقط)
    if (row.item_code === row.master_code) {
      console.warn(`⚠️ الصف ${rowNumber}: item_code يساوي master_code - قد يسبب مشاكل في التمييز بين الأصناف`);
    }
    
    // التحقق من item_name
    if (!row.item_name || row.item_name.trim() === "") {
      errors.push(`الصف ${rowNumber}: item_name مطلوب`);
    } else if (row.item_name.length > 200) {
      errors.push(`الصف ${rowNumber}: item_name طويل جداً (الحد الأقصى 200 حرفاً)`);
    }
    
    // التحقق من out_price
    if (row.out_price === undefined || row.out_price === null) {
      errors.push(`الصف ${rowNumber}: out_price مطلوب`);
    } else {
      const price = parseFloat(row.out_price);
      if (isNaN(price)) {
        errors.push(`الصف ${rowNumber}: out_price يجب أن يكون رقماً`);
      } else if (price < 0) {
        errors.push(`الصف ${rowNumber}: out_price يجب أن يكون عدداً موجباً`);
      } else if (price > 1000000) {
        errors.push(`الصف ${rowNumber}: out_price كبير جداً (الحد الأقصى 1,000,000)`);
      }
    }
    
    // التحقق من cur_qty
    if (row.cur_qty === undefined || row.cur_qty === null) {
      errors.push(`الصف ${rowNumber}: cur_qty مطلوب`);
    } else {
      const qty = parseInt(row.cur_qty);
      if (isNaN(qty)) {
        errors.push(`الصف ${rowNumber}: cur_qty يجب أن يكون رقماً`);
      } else if (qty < 0) {
        errors.push(`الصف ${rowNumber}: cur_qty يجب أن يكون عدداً موجباً`);
      } else if (qty > 1000000) {
        errors.push(`الصف ${rowNumber}: cur_qty كبير جداً (الحد الأقصى 1,000,000)`);
      }
    }
    
    // التحقق من color
    if (row.color && row.color.length > 50) {
      errors.push(`الصف ${rowNumber}: color طويل جداً (الحد الأقصى 50 حرفاً)`);
    }
    
    // التحقق من size
    if (row.size && row.size.length > 20) {
      errors.push(`الصف ${rowNumber}: size طويل جداً (الحد الأقصى 20 حرفاً)`);
    }
    
    // التحقق من group_name
    if (row.group_name && row.group_name.length > 100) {
      errors.push(`الصف ${rowNumber}: group_name طويل جداً (الحد الأقصى 100 حرفاً)`);
    }
    
    // التحقق من kind_name
    if (row.kind_name && row.kind_name.length > 100) {
      errors.push(`الصف ${rowNumber}: kind_name طويل جداً (الحد الأقصى 100 حرفاً)`);
    }
  });
  
  return errors;
}

/**
 * تقسيم البيانات إلى دفعات
 * @param {Array} data - البيانات الكاملة
 * @param {Number} batchSize - حجم الدفعة
 * @returns {Array} - مصفوفة من الدفعات
 */
export function splitIntoBatches(data, batchSize = 200) {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  if (batchSize <= 0) {
    batchSize = 200; // القيمة الافتراضية
  }
  
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    batches.push(batch);
  }
  
  console.log(`📦 تم تقسيم ${data.length} منتج إلى ${batches.length} دفعة (${batchSize} منتج لكل دفعة)`);
  return batches;
}

/**
 * البحث عن التكرارات في عمود معين
 * @param {Array} data - البيانات
 * @param {String} column - اسم العمود
 * @returns {Array} - القيم المكررة
 */
function findDuplicates(data, column) {
  const seen = new Set();
  const duplicates = new Set();
  
  data.forEach(row => {
    const value = row[column];
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  });
  
  return Array.from(duplicates);
}

/**
 * تحليل تنوع الأصناف لكل master_code
 * @param {Array} data - البيانات
 * @returns {Array} - إحصائيات
 */
function analyzeMasterCodeVariants(data) {
  const stats = {};
  
  data.forEach(row => {
    const masterCode = row.master_code;
    const itemCode = row.item_code;
    
    if (!stats[masterCode]) {
      stats[masterCode] = {
        master_code: masterCode,
        variants: new Set(),
        count: 0
      };
    }
    
    stats[masterCode].variants.add(itemCode);
    stats[masterCode].count++;
  });
  
  return Object.values(stats).map(stat => ({
    master_code: stat.master_code,
    variants: stat.variants.size,
    total_items: stat.count,
    item_codes: Array.from(stat.variants).slice(0, 5) // أول 5 فقط
  }));
}

/**
 * إنشاء تقرير تحليل البيانات
 * @param {Array} data - البيانات
 * @returns {Object} - التقرير
 */
export function createDataAnalysisReport(data) {
  if (!data || data.length === 0) {
    return {
      total: 0,
      message: "لا توجد بيانات لتحليل"
    };
  }
  
  const masterCodeStats = analyzeMasterCodeVariants(data);
  const duplicateItemCodes = findDuplicates(data, 'item_code');
  const duplicateMasterCodes = findDuplicates(data, 'master_code');
  
  // تحليل الألوان والمقاسات
  const colors = new Set();
  const sizes = new Set();
  
  data.forEach(row => {
    if (row.color) colors.add(row.color);
    if (row.size) sizes.add(row.size);
  });
  
  return {
    total: data.length,
    masterCodes: {
      unique: masterCodeStats.length,
      withVariants: masterCodeStats.filter(s => s.variants > 1).length,
      stats: masterCodeStats.slice(0, 10) // أول 10 فقط
    },
    variants: {
      totalItemCodes: new Set(data.map(d => d.item_code)).size,
      duplicateItemCodes: duplicateItemCodes.length,
      duplicateMasterCodes: duplicateMasterCodes.length
    },
    attributes: {
      uniqueColors: colors.size,
      uniqueSizes: sizes.size,
      colors: Array.from(colors).slice(0, 10),
      sizes: Array.from(sizes).slice(0, 10)
    },
    issues: duplicateItemCodes.length > 0 ? [
      `يوجد ${duplicateItemCodes.length} item_code مكرر`,
      `يجب أن يكون item_code فريداً لكل لون/مقاس`
    ] : ["لا توجد مشاكل في تكرار item_code"]
  };
}

/**
 * تحميل نموذج Excel محسّن
 * @returns {Blob} - ملف Excel
 */
export function getExcelTemplate() {
  const templateData = [
    {
      master_code: "3700",
      item_code: "3700.1",
      item_name: "تيشيرت قطني",
      color: "أحمر",
      size: "M",
      out_price: 100,
      cur_qty: 50,
      group_name: "ملابس",
      kind_name: "تيشيرت",
      images: "https://example.com/image1.jpg",
    },
    {
      master_code: "3700",
      item_code: "3700.2",
      item_name: "تيشيرت قطني",
      color: "أزرق",
      size: "L",
      out_price: 100,
      cur_qty: 30,
      group_name: "ملابس",
      kind_name: "تيشيرت",
      images: "",
    },
    {
      master_code: "3700",
      item_code: "3700.3",
      item_name: "تيشيرت قطني",
      color: "أخضر",
      size: "XL",
      out_price: 100,
      cur_qty: 20,
      group_name: "ملابس",
      kind_name: "تيشيرت",
      images: "https://example.com/image3.jpg",
    },
    {
      master_code: "3800",
      item_code: "3800-RED-M",
      item_name: "بنطلون جينز",
      color: "أحمر",
      size: "M",
      out_price: 150,
      cur_qty: 25,
      group_name: "ملابس",
      kind_name: "بنطلون",
      images: "",
    },
    {
      master_code: "3800",
      item_code: "3800-BLUE-L",
      item_name: "بنطلون جينز",
      color: "أزرق",
      size: "L",
      out_price: 150,
      cur_qty: 15,
      group_name: "ملابس",
      kind_name: "بنطلون",
      images: "",
    },
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المنتجات");
  
  // إضافة تعليمات محسنة
  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["تعليمات استخدام النموذج - إصدار محسّن"],
    [""],
    ["📌 **الأعمدة المطلوبة الجديدة:**"],
    ["1. master_code: الكود الرئيسي للمنتج (مثل: 3700)"],
    ["2. item_code: الكود المحدد للون والمقاس (مثل: 3700.1, 3700.2) - **مطلوب الآن**"],
    ["3. item_name: اسم المنتج"],
    ["4. out_price: سعر البيع"],
    ["5. cur_qty: الكمية المتاحة"],
    [""],
    ["🎨 **كيفية عمل item_code:**"],
    ["- لكل لون/مقاس يحتاج item_code فريد"],
    ["- مثال: master_code=3700, item_code=3700.1 للون أحمر مقاس M"],
    ["- مثال: master_code=3700, item_code=3700.2 للون أزرق مقاس L"],
    ["- يمكن استخدام: 3700-RED-M, 3700-BLUE-L, 3700.1, 3700.2, إلخ"],
    [""],
    ["⚠️ **مهم جداً:**"],
    ["1. item_code يجب أن يكون فريداً لكل صنف (لون/مقاس)"],
    ["2. master_code يشير للمنتج الرئيسي"],
    ["3. item_code يشير للصنف المحدد"],
    ["4. بدون item_code فريد، سيتم رفع صنف واحد فقط!"],
    [""],
    ["✅ **نصائح:**"],
    ["1. استخدم أرقام متسلسلة: 3700.1, 3700.2, 3700.3"],
    ["2. أو استخدم أسماء: 3700-RED, 3700-BLUE"],
    ["3. أو ادمج اللون والمقاس: 3700-RED-M, 3700-BLUE-L"],
    ["4. الحل التلقائي: إذا تركت item_code فارغاً، سينشئ النظام تلقائياً"],
    [""],
    ["📊 **مثال عملي:**"],
    ["master_code, item_code, item_name, color, size, out_price, cur_qty"],
    ["3700, 3700.1, تيشيرت, أحمر, M, 100, 50"],
    ["3700, 3700.2, تيشيرت, أزرق, L, 100, 30"],
    ["3700, 3700.3, تيشيرت, أخضر, XL, 100, 20"],
    ["3800, 3800-RED-M, بنطلون, أحمر, M, 150, 25"],
    ["3800, 3800-BLUE-L, بنطلون, أزرق, L, 150, 15"],
  ]);
  
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "التعليمات");
  
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

/**
 * إنشاء تقرير تحليل للملف الحالي
 * @param {Array} data - البيانات
 * @returns {String} - تقرير نصي
 */
export function generateDataReport(data) {
  const report = createDataAnalysisReport(data);
  
  let reportText = "📊 تقرير تحليل البيانات:\n\n";
  reportText += `إجمالي المنتجات: ${report.total}\n`;
  reportText += `عدد master codes فريدة: ${report.masterCodes.unique}\n`;
  reportText += `منتجات بها ألوان/مقاسات متعددة: ${report.masterCodes.withVariants}\n`;
  reportText += `عدد item codes فريدة: ${report.variants.totalItemCodes}\n\n`;
  
  if (report.variants.duplicateItemCodes > 0) {
    reportText += `⚠️ تحذير: يوجد ${report.variants.duplicateItemCodes} item_code مكرر\n`;
    reportText += "يجب أن يكون item_code فريداً لكل صنف (لون/مقاس)\n\n";
  }
  
  reportText += "🎨 الألوان المتوفرة:\n";
  report.attributes.colors.forEach(color => {
    reportText += `  - ${color}\n`;
  });
  
  reportText += "\n📏 المقاسات المتوفرة:\n";
  report.attributes.sizes.forEach(size => {
    reportText += `  - ${size}\n`;
  });
  
  return reportText;
}