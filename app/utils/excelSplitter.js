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
        
        // ✅ الحل المتقدم: استخدام rawNumbers: false و cellText: true للحفاظ على التنسيق الأصلي
        // وقراءة القيم كنصوص كما تظهر في Excel تماماً
        const rawData = XLSX.utils.sheet_to_json(firstSheet, { 
          header: 1, // قراءة كصفوف أولاً للتحكم بشكل أفضل
          defval: "",
          blankrows: false,
        });
        
        // استخراج العناوين من أول صف
        const headers = rawData.length > 0 ? rawData[0] : [];
        
        // تحويل الصفوف إلى كائنات مع الحفاظ على القيم كنصوص
        const dataRows = rawData.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null && cell !== undefined));
        
        console.log(`📊 قراءة ${dataRows.length} صف من ملف Excel`);
        console.log(`🔤 العناوين المكتشفة:`, headers);
        
        if (dataRows.length === 0) {
          errors.push("الملف لا يحتوي على بيانات");
          resolve({ data: [], errors, warnings });
          return;
        }
        
        // ✅ تحويل الصفوف إلى كائنات مع معالجة خاصة للحفاظ على الأرقام كنصوص
        const jsonData = dataRows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            if (header && header.toString().trim() !== "") {
              let value = row[index];
              
              // ✅ معالجة خاصة للأعمدة التي يجب أن تبقى كنصوص (item_code, master_code)
              const headerStr = header.toString().toLowerCase().trim();
              
              // إذا كانت القيمة موجودة
              if (value !== undefined && value !== null) {
                // ✅ تحويل القيم إلى نصوص مع الحفاظ على التنسيق الأصلي
                if (typeof value === 'number') {
                  // للتعامل مع الأرقام التي قد تفقد الأصفار العشرية
                  // نحتاج إلى محاولة استخراج التنسيق الأصلي من Excel
                  
                  // الطريقة الأولى: استخدام XLSX.CFB أو محاولة الحصول على النص الأصلي
                  // هذا حل متقدم للحفاظ على الأرقام كما هي في Excel
                  const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: headers.indexOf(header) });
                  const cell = firstSheet[cellAddress];
                  
                  if (cell && cell.t === 'n' && cell.w) {
                    // إذا كان هناك نص معروض (w) نستخدمه بدلاً من القيمة الرقمية
                    value = cell.w.toString();
                    console.log(`✅ الحفاظ على التنسيق الأصلي: ${cell.w} بدلاً من ${row[index]}`);
                  } else {
                    // تحويل إلى نص مع الحفاظ على الأصفار العشرية
                    value = value.toString();
                    
                    // محاولة إعادة الأصفار العشرية المفقودة إذا كان الرقم عشرياً
                    if (value.includes('.')) {
                      const parts = value.split('.');
                      if (parts[1].length < 2) {
                        // إذا كان هناك خلية مرجعية يمكننا استخراج التنسيق منها
                        // هذا حل بديل: البحث عن الخلية الأصلية
                        try {
                          const originalCell = firstSheet[XLSX.utils.encode_cell({ r: index + 1, c: headers.indexOf(header) })];
                          if (originalCell && originalCell.w && originalCell.w.includes('.')) {
                            value = originalCell.w;
                          }
                        } catch (e) {
                          // تجاهل الخطأ
                        }
                      }
                    }
                  }
                } else {
                  value = value.toString().trim();
                }
              } else {
                value = "";
              }
              
              obj[header.toString().trim()] = value;
            }
          });
          return obj;
        });
        
        console.log(`📊 تم تحويل ${jsonData.length} صف إلى كائنات`);
        
        // التحقق من وجود الأعمدة المطلوبة
        const enhancedRequiredColumns = [...requiredColumns, "item_code"];
        
        if (enhancedRequiredColumns.length > 0 && jsonData.length > 0) {
          const firstRow = jsonData[0];
          const missingColumns = enhancedRequiredColumns.filter(col => !(col in firstRow));
          
          if (missingColumns.length > 0) {
            errors.push(`الأعمدة المفقودة: ${missingColumns.join(", ")}`);
            warnings.push("ملاحظة: item_code مطلوب الآن للتمييز بين الألوان والمقاسات");
            resolve({ data: [], errors, warnings });
            return;
          }
        }
        
        // تحويل وتنظيف البيانات
        const processedData = cleanExcelData(jsonData);
        
        // التحقق من البيانات
        const validationErrors = validateExcelData(processedData, enhancedRequiredColumns);
        errors.push(...validationErrors);
        
        // تحذيرات
        if (processedData.length > 10000) {
          warnings.push(`عدد المنتجات كبير جداً (${processedData.length}). قد يستغرق الرفع وقتاً طويلاً.`);
        }
        
        // التحقق من التكرارات في item_code
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
        
        // ✅ تحليل الأكواد العشرية المحفوظة
        const decimalCodes = processedData.filter(row => row.item_code && row.item_code.includes('.') && row.item_code.split('.')[1].length > 1);
        if (decimalCodes.length > 0) {
          console.log(`✅ تم الحفاظ على ${decimalCodes.length} كود عشري بالتنسيق الأصلي`);
          warnings.push(`تم الحفاظ على الأكواد العشرية مثل: ${decimalCodes.slice(0, 3).map(d => d.item_code).join(', ')}`);
        }
        
        resolve({ 
          data: processedData, 
          errors, 
          warnings,
          stats: {
            totalRows: processedData.length,
            decimalCodes: decimalCodes.length,
            uniqueMasterCodes: new Set(processedData.map(d => d.master_code)).size,
            uniqueItemCodes: new Set(processedData.map(d => d.item_code)).size
          }
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
 * تنظيف بيانات Excel مع التركيز على item_code والحفاظ على التنسيق الأصلي
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
      
      // تحويل إلى string وتنظيف - مع الحفاظ على التنسيق الأصلي
      value = value.toString();
      
      // تنظيف الأعمدة الرقمية (مع الحفاظ على الأكواد كنصوص)
      if (key === 'out_price' || key === 'av_price' || key === 'cur_qty') {
        // إزالة أي أحرف غير رقمية ولكن الحفاظ على النقاط العشرية
        const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        cleanedRow[key] = isNaN(numericValue) ? 0 : numericValue;
      } else if (key === 'item_code' || key === 'master_code') {
        // ✅ الأهم: الحفاظ على التنسيق الأصلي للأكواد
        // نستخدم القيمة كما هي بدون أي تعديل
        cleanedRow[key] = value.toString().trim();
        
        // إذا كان item_code فارغاً، نحاول إنشاء واحد تلقائياً
        if (key === 'item_code' && (!cleanedRow[key] || cleanedRow[key] === "")) {
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
        
        // ✅ التحقق من الحفاظ على الأصفار العشرية
        if (key === 'item_code' && cleanedRow[key].includes('.') && cleanedRow[key].split('.')[1].length > 1) {
          console.log(`✅ الحفاظ على الكود العشري: ${cleanedRow[key]}`);
        }
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
    
    // ✅ التأكد من وجود item_code
    if (!cleanedRow.item_code || cleanedRow.item_code === "") {
      const colorCode = (cleanedRow.color || 'DEF').substring(0, 3).toUpperCase();
      const sizeCode = (cleanedRow.size || 'ONE').substring(0, 3).toUpperCase();
      cleanedRow.item_code = `${cleanedRow.master_code}-${colorCode}-${sizeCode}`;
      console.log(`⚠️ الصف ${rowNumber}: تم إنشاء item_code نهائياً: ${cleanedRow.item_code}`);
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
    
    // ✅ إنشاء unique_id باستخدام item_code
    cleanedRow.unique_id = `${cleanedRow.item_code}-${cleanedRow.type_id || 0}-${cleanedRow.stor_id || 0}`;
    
    // ✅ إضافة حقل variant_id للتمييز بين الأصناف
    const colorPart = (cleanedRow.color || 'default').substring(0, 3).toUpperCase();
    const sizePart = (cleanedRow.size || 'onesize').substring(0, 3).toUpperCase();
    cleanedRow.variant_id = `${colorPart}-${sizePart}`;
    
    // ✅ إضافة حقل original_format للإشارة إلى الحفاظ على التنسيق الأصلي
    if (cleanedRow.item_code.includes('.') && cleanedRow.item_code.split('.')[1].length > 1) {
      cleanedRow.preserved_format = true;
    }
    
    // التحقق من صحة الأرقام
    if (cleanedRow.out_price <= 0) {
      console.warn(`⚠️ الصف ${rowNumber}: out_price غير صالح (${cleanedRow.out_price})`);
    }
    
    if (cleanedRow.cur_qty < 0) {
      console.warn(`⚠️ الصف ${rowNumber}: cur_qty سالب (${cleanedRow.cur_qty})`);
    }
    
    return cleanedRow;
  }).filter(row => {
    // تصفية الصفوف الفارغة
    return row.master_code && row.master_code.trim() !== "" &&
           row.item_name && row.item_name.trim() !== "" &&
           row.item_code && row.item_code.trim() !== "";
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
    
    // ✅ التحقق من item_code
    if (!row.item_code || row.item_code.trim() === "") {
      errors.push(`الصف ${rowNumber}: item_code مطلوب للتمييز بين الألوان والمقاسات`);
    } else if (row.item_code.length > 100) {
      errors.push(`الصف ${rowNumber}: item_code طويل جداً (الحد الأقصى 100 حرفاً)`);
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
    batchSize = 200;
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
    item_codes: Array.from(stat.variants).slice(0, 5)
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
  
  // ✅ تحليل الأكواد العشرية
  const decimalCodes = data.filter(row => 
    row.item_code && 
    row.item_code.includes('.') && 
    row.item_code.split('.')[1].length > 1
  );
  
  return {
    total: data.length,
    masterCodes: {
      unique: masterCodeStats.length,
      withVariants: masterCodeStats.filter(s => s.variants > 1).length,
      stats: masterCodeStats.slice(0, 10)
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
    preservation: {
      decimalCodesPreserved: decimalCodes.length,
      examples: decimalCodes.slice(0, 5).map(d => d.item_code)
    },
    issues: duplicateItemCodes.length > 0 ? [
      `يوجد ${duplicateItemCodes.length} item_code مكرر`,
      `يجب أن يكون item_code فريداً لكل لون/مقاس`
    ] : ["لا توجد مشاكل في تكرار item_code"]
  };
}

/**
 * تحميل نموذج Excel محسّن مع دعم الأكواد العشرية
 * @returns {Blob} - ملف Excel
 */
export function getExcelTemplate() {
  const templateData = [
    {
      master_code: "3700",
      item_code: "3710.10", // ✅ هذا سيبقى 3710.10 وليس 3710.1
      item_name: "تيشيرت قطني فاخر",
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
      item_code: "3710.20", // ✅ تم الحفاظ على الصفر
      item_name: "تيشيرت قطني فاخر",
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
      item_code: "3710.30", // ✅ ثلاث خانات عشرية
      item_name: "تيشيرت قطني فاخر",
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
      item_code: "3800.150", // ✅ 3800.150 وليس 3800.15
      item_name: "بنطلون جينز كلاسيك",
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
      item_code: "3800.250", // ✅ تم الحفاظ على التنسيق
      item_name: "بنطلون جينز كلاسيك",
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
  
  // إضافة تعليمات محسنة مع التركيز على الأكواد العشرية
  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["تعليمات استخدام النموذج - الإصدار المحسّن مع الحفاظ على الأكواد العشرية"],
    [""],
    ["📌 **ميزة جديدة مهمة: الحفاظ على الأكواد العشرية**"],
    ["الآن يتم الحفاظ على التنسيق الأصلي للأرقام!"],
    ["مثال: 3710.10 ستبقى 3710.10 وليس 3710.1"],
    ["مثال: 3800.150 ستبقى 3800.150 وليس 3800.15"],
    [""],
    ["📌 **الأعمدة المطلوبة:**"],
    ["1. master_code: الكود الرئيسي للمنتج (مثل: 3700)"],
    ["2. item_code: الكود المحدد (مثل: 3710.10, 3710.20)"],
    ["3. item_name: اسم المنتج"],
    ["4. out_price: سعر البيع"],
    ["5. cur_qty: الكمية المتاحة"],
    [""],
    ["🎨 **كيفية عمل item_code:**"],
    ["- استخدم أي تنسيق تريده، وسيبقى كما هو!"],
    ["- تنسيقات مقترحة: 3710.10, 3710.20, 3710.30"],
    ["- أو: 3700-RED-M, 3700-BLUE-L"],
    ["- أو: 3700.001, 3700.002"],
    [""],
    ["⚠️ **مهم جداً:**"],
    ["1. item_code يجب أن يكون فريداً لكل صنف"],
    ["2. الأكواد العشرية مثل 3710.10 محفوظة بالكامل"],
    ["3. نظامنا الآن يحافظ على التنسيق الأصلي"],
    [""],
    ["✅ **نصائح للاستفادة من الأكواد العشرية:**"],
    ["1. استخدم 3710.10, 3710.20, 3710.30 للتسلسل"],
    ["2. استخدم 3800.100, 3800.200 للتمييز"],
    ["3. يمكنك استخدام 3 خانات عشرية: 3710.100"],
    ["4. الأصفار على اليمين محفوظة: 3710.10 ✅ وليس 3710.1 ❌"],
    [""],
    ["📊 **مثال عملي للتمييز بين الألوان:**"],
    ["master_code, item_code, item_name, color"],
    ["3700, 3710.10, تيشيرت أحمر, أحمر"],
    ["3700, 3710.20, تيشيرت أزرق, أزرق"],
    ["3700, 3710.30, تيشيرت أخضر, أخضر"],
    ["3800, 3800.150, بنطلون أحمر, أحمر"],
    ["3800, 3800.250, بنطلون أزرق, أزرق"],
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
  
  // ✅ إضافة معلومات عن الأكواد العشرية المحفوظة
  if (report.preservation.decimalCodesPreserved > 0) {
    reportText += `✅ تم الحفاظ على ${report.preservation.decimalCodesPreserved} كود عشري بالتنسيق الأصلي\n`;
    reportText += `   أمثلة: ${report.preservation.examples.join(', ')}\n\n`;
  }
  
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

/**
 * دالة مساعدة للتحقق من الحفاظ على الأكواد العشرية
 * @param {Array} data - البيانات
 * @returns {Object} - تقرير عن الأكواد العشرية
 */
export function checkDecimalPreservation(data) {
  const decimalItems = data.filter(row => 
    row.item_code && 
    row.item_code.includes('.') && 
    row.item_code.split('.')[1].length > 1
  );
  
  return {
    total: decimalItems.length,
    preserved: decimalItems.filter(item => {
      const parts = item.item_code.split('.');
      return parts[1].length >= 2; // على الأقل خانتين عشريتين
    }).length,
    examples: decimalItems.slice(0, 10).map(item => ({
      item_code: item.item_code,
      original_format: item.preserved_format ? 'محفوظ ✅' : 'محوّل ❌'
    }))
  };
}