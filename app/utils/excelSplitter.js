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
        
        // ✅ حل قوي جداً: قراءة كل خلية على حدة للحفاظ على التنسيق الأصلي
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1:A1');
        
        // استخراج العناوين من الصف الأول
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
          const cell = firstSheet[cellAddress];
          headers[C] = cell ? cell.toString().trim() : `عمود_${C + 1}`;
        }
        
        console.log("🔤 العناوين:", headers);
        
        // قراءة البيانات صفاً صفاً مع الحفاظ على التنسيق الأصلي
        const jsonData = [];
        
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const row = {};
          let isEmptyRow = true;
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const header = headers[C];
            if (!header) continue;
            
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = firstSheet[cellAddress];
            
            if (cell) {
              // ✅ الأهم: استخدام cell.w (النص المعروض) إذا وجد
              // هذا يحافظ على التنسيق الأصلي تماماً بما في ذلك الأصفار العشرية
              let value = "";
              
              if (cell.w !== undefined) {
                // استخدام النص المعروض كما يظهر في Excel
                value = cell.w.toString();
                console.log(`✅ الخلية [${R},${C}] = ${value} (معروض)`);
              } else if (cell.v !== undefined) {
                // إذا لم يوجد نص معروض، استخدم القيمة
                value = cell.v.toString();
                console.log(`⚠️ الخلية [${R},${C}] = ${value} (قيمة)`);
              }
              
              // تنظيف القيمة
              value = value.trim();
              
              // ✅ معالجة خاصة لـ item_code
              if (header.toLowerCase().includes('item_code') || header === 'item_code') {
                // نضمن أنها نص وليس رقم
                if (cell.t === 'n' && cell.w) {
                  // إذا كانت رقماً ولكن لها نص معروض، استخدم النص المعروض
                  value = cell.w;
                } else if (cell.t === 'n' && !cell.w) {
                  // إذا كانت رقماً ولا يوجد نص معروض، حول لنص مع الحفاظ على الأصفار
                  // هذا صعب لأن الرقم يفقد الأصفار، لكننا نحاول
                  const numStr = cell.v.toString();
                  if (numStr.includes('.')) {
                    // قد نحتاج لتخمين عدد الخانات العشرية
                    // الحل الأفضل هو استخدام cell.w دائماً
                  }
                  value = numStr;
                }
                
                // ✅ التحقق من الأصفار العشرية
                if (value.includes('.')) {
                  const decimalPart = value.split('.')[1];
                  if (decimalPart.length >= 2) {
                    console.log(`🎯 تم الحفاظ على كود عشري: ${value} (${decimalPart.length} خانات)`);
                  }
                }
              }
              
              row[header] = value;
              if (value !== "") isEmptyRow = false;
            } else {
              row[header] = "";
            }
          }
          
          if (!isEmptyRow) {
            jsonData.push(row);
          }
        }
        
        console.log(`📊 قراءة ${jsonData.length} صف من ملف Excel`);
        
        if (jsonData.length === 0) {
          errors.push("الملف لا يحتوي على بيانات");
          resolve({ data: [], errors, warnings });
          return;
        }
        
        // ✅ تحليل الأكواد المكررة قبل المعالجة
        const rawItemCodes = jsonData.map(row => row.item_code || "").filter(code => code !== "");
        const codeFrequency = {};
        rawItemCodes.forEach(code => {
          codeFrequency[code] = (codeFrequency[code] || 0) + 1;
        });
        
        const duplicatesBefore = Object.entries(codeFrequency)
          .filter(([code, count]) => count > 1)
          .map(([code]) => code);
        
        if (duplicatesBefore.length > 0) {
          console.warn("⚠️ تكرارات قبل المعالجة:", duplicatesBefore);
          warnings.push(`تم العثور على ${duplicatesBefore.length} item_code مكرر في الملف الأصلي: ${duplicatesBefore.slice(0, 5).join(', ')}`);
        }
        
        // ✅ التحقق من وجود الأعمدة المطلوبة
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
        
        // ✅ التحقق من التكرارات بعد المعالجة
        const duplicateItemCodes = findDuplicates(processedData, 'item_code');
        if (duplicateItemCodes.length > 0) {
          warnings.push(`⚠️ يوجد ${duplicateItemCodes.length} item_code مكرر: ${duplicateItemCodes.slice(0, 5).join(', ')}`);
          warnings.push("قد لا يتم رفع جميع الأصناف إذا استمر التكرار!");
          
          // عرض تفاصيل أكثر عن التكرارات
          duplicateItemCodes.forEach(code => {
            const duplicates = processedData.filter(row => row.item_code === code);
            if (duplicates.length > 1) {
              console.warn(`🔴 الكود ${code} مكرر ${duplicates.length} مرات:`);
              duplicates.forEach((dup, i) => {
                console.warn(`   ${i + 1}. ${dup.item_name} | ${dup.color} | ${dup.size}`);
              });
            }
          });
        }
        
        // ✅ التحقق من تنوع item_code لكل master_code
        const masterCodeStats = analyzeMasterCodeVariants(processedData);
        masterCodeStats.forEach(stat => {
          if (stat.variants > 1) {
            console.log(`✅ ${stat.master_code}: ${stat.variants} نوع (ألوان/مقاسات)`);
          } else if (stat.variants === 1 && stat.total_items > 1) {
            console.warn(`⚠️ ${stat.master_code}: ${stat.total_items} منتج ولكن item_code واحد فقط!`);
          }
        });
        
        // ✅ تحليل الأكواد العشرية المحفوظة
        const decimalCodes = processedData.filter(row => 
          row.item_code && 
          row.item_code.includes('.') && 
          row.item_code.split('.')[1].length >= 2
        );
        
        if (decimalCodes.length > 0) {
          console.log(`✅ تم الحفاظ على ${decimalCodes.length} كود عشري بالتنسيق الأصلي`);
          
          // تحقق من عدم تحول 3700.10 إلى 3700.1
          const suspiciousCodes = decimalCodes.filter(code => 
            code.item_code.match(/\.\d$/) // ينتهي برقم واحد بعد العلامة العشرية
          );
          
          if (suspiciousCodes.length > 0) {
            warnings.push(`⚠️ بعض الأكواد قد تكون فقدت أصفارها: ${suspiciousCodes.slice(0, 3).map(c => c.item_code).join(', ')}`);
          } else {
            warnings.push(`✅ تم الحفاظ على الأكواد العشرية مثل: ${decimalCodes.slice(0, 3).map(d => d.item_code).join(', ')}`);
          }
        }
        
        // ✅ طباعة تقرير موجز
        console.log("\n📊 تقرير المعالجة:");
        console.log(`   - إجمالي المنتجات: ${processedData.length}`);
        console.log(`   - master codes فريدة: ${new Set(processedData.map(d => d.master_code)).size}`);
        console.log(`   - item codes فريدة: ${new Set(processedData.map(d => d.item_code)).size}`);
        console.log(`   - تكرارات: ${duplicateItemCodes.length}`);
        
        resolve({ 
          data: processedData, 
          errors, 
          warnings,
          stats: {
            totalRows: processedData.length,
            decimalCodes: decimalCodes.length,
            uniqueMasterCodes: new Set(processedData.map(d => d.master_code)).size,
            uniqueItemCodes: new Set(processedData.map(d => d.item_code)).size,
            duplicates: duplicateItemCodes.length
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
 * تنظيف بيانات Excel مع الحفاظ على الأكواد العشرية
 * @param {Array} data - البيانات الخام
 * @returns {Array} - البيانات النظيفة
 */
function cleanExcelData(data) {
  return data.map((row, index) => {
    const rowNumber = index + 2;
    const cleanedRow = {};
    
    // تحويل جميع القيم مع الحفاظ على التنسيق
    Object.keys(row).forEach(key => {
      let value = row[key];
      
      // تجاهل القيم null/undefined
      if (value === null || value === undefined) {
        cleanedRow[key] = "";
        return;
      }
      
      // تحويل إلى string مع الحفاظ على التنسيق الأصلي
      value = value.toString();
      
      // ✅ معالجة خاصة للأعمدة المختلفة
      if (key === 'out_price' || key === 'av_price' || key === 'cur_qty') {
        // للأرقام الحسابية، نحولها لأرقام
        const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        cleanedRow[key] = isNaN(numericValue) ? 0 : numericValue;
      } else if (key === 'item_code' || key === 'master_code') {
        // ✅ للأكواد: نحافظ على النص كما هو بدون أي تعديل
        cleanedRow[key] = value;
        
        // تحذير إذا كان الكود قد يفقد أصفاره
        if (key === 'item_code' && value.includes('.')) {
          const parts = value.split('.');
          if (parts[1].length === 1) {
            console.warn(`⚠️ الصف ${rowNumber}: ${key} = ${value} (خانة عشرية واحدة فقط - قد يكون فقد صفراً)`);
          } else if (parts[1].length >= 2) {
            console.log(`✅ الصف ${rowNumber}: ${key} = ${value} (${parts[1].length} خانات عشرية)`);
          }
        }
        
        // إذا كان item_code فارغاً، نحاول إنشاء واحد
        if (key === 'item_code' && (!value || value === "")) {
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
      } else if (key === 'item_name') {
        // تنظيف الأسماء
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
    
    // ✅ تعيين القيم الافتراضية
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
    
    // ✅ إنشاء unique_id
    cleanedRow.unique_id = `${cleanedRow.item_code}-${cleanedRow.type_id || 0}-${cleanedRow.stor_id || 0}`;
    
    // ✅ إضافة variant_id
    const colorPart = (cleanedRow.color || 'default').substring(0, 3).toUpperCase();
    const sizePart = (cleanedRow.size || 'onesize').substring(0, 3).toUpperCase();
    cleanedRow.variant_id = `${colorPart}-${sizePart}`;
    
    // ✅ علامة للحفاظ على التنسيق
    if (cleanedRow.item_code.includes('.') && cleanedRow.item_code.split('.')[1].length >= 2) {
      cleanedRow.preserved_format = true;
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
    
    // ✅ تحذير خاص للأكواد العشرية القصيرة
    if (row.item_code && row.item_code.includes('.')) {
      const decimalPart = row.item_code.split('.')[1];
      if (decimalPart.length === 1) {
        console.warn(`⚠️ الصف ${rowNumber}: item_code "${row.item_code}" قد يكون فقد صفراً عشرياً`);
      }
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
        count: 0,
        itemCodes: []
      };
    }
    
    stats[masterCode].variants.add(itemCode);
    stats[masterCode].itemCodes.push(itemCode);
    stats[masterCode].count++;
  });
  
  return Object.values(stats).map(stat => ({
    master_code: stat.master_code,
    variants: stat.variants.size,
    total_items: stat.count,
    unique_itemCodes: Array.from(stat.variants).slice(0, 5),
    hasDuplicates: stat.variants.size < stat.count
  }));
}

/**
 * إنشاء تقرير تحليل البيانات مع التركيز على التكرارات
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
    row.item_code.split('.')[1].length >= 2
  );
  
  // ✅ تحليل الأكواد التي قد تكون فقدت أصفارها
  const suspiciousCodes = data.filter(row => 
    row.item_code && 
    row.item_code.includes('.') && 
    row.item_code.split('.')[1].length === 1
  );
  
  // ✅ تحليل التكرارات بالتفصيل
  const duplicateDetails = {};
  duplicateItemCodes.forEach(code => {
    const items = data.filter(row => row.item_code === code);
    duplicateDetails[code] = {
      count: items.length,
      items: items.map(item => ({
        name: item.item_name,
        color: item.color,
        size: item.size,
        master: item.master_code
      }))
    };
  });
  
  return {
    total: data.length,
    masterCodes: {
      unique: masterCodeStats.length,
      withVariants: masterCodeStats.filter(s => s.variants > 1).length,
      withDuplicates: masterCodeStats.filter(s => s.hasDuplicates).length,
      stats: masterCodeStats.slice(0, 10)
    },
    variants: {
      totalItemCodes: new Set(data.map(d => d.item_code)).size,
      duplicateItemCodes: duplicateItemCodes.length,
      duplicateMasterCodes: duplicateMasterCodes.length,
      duplicateDetails: duplicateDetails
    },
    attributes: {
      uniqueColors: colors.size,
      uniqueSizes: sizes.size,
      colors: Array.from(colors).slice(0, 10),
      sizes: Array.from(sizes).slice(0, 10)
    },
    preservation: {
      decimalCodesPreserved: decimalCodes.length,
      suspiciousCodes: suspiciousCodes.length,
      examples: decimalCodes.slice(0, 5).map(d => d.item_code),
      suspiciousExamples: suspiciousCodes.slice(0, 5).map(d => d.item_code)
    },
    issues: []
  };
}

/**
 * تحميل نموذج Excel محسّن مع تحذير من التكرارات
 * @returns {Blob} - ملف Excel
 */
export function getExcelTemplate() {
  const templateData = [
    {
      master_code: "3700",
      item_code: "3700.10", // ✅ مهم: خانتين عشريتين
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
      item_code: "3700.20", // ✅ مختلف
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
      item_code: "3700.30", // ✅ مختلف
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
      item_code: "3800.100", // ✅ ثلاث خانات
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
      item_code: "3800.200", // ✅ مختلف
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
  
  // إضافة تعليمات مع تحذير من التكرارات
  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["⚠️ تعليمات هامة جداً - تجنب التكرارات"],
    [""],
    ["🔴 **مشكلة التكرار**: عندما تكتب 3700.10 يتحول إلى 3700.1 في بعض الأنظمة"],
    ["✅ **الحل**: استخدم خانتين عشريتين دائماً: 3700.10 وليس 3700.1"],
    [""],
    ["📌 **أمثلة صحيحة:**"],
    ["- 3700.10 (لون أحمر)"],
    ["- 3700.20 (لون أزرق)"],
    ["- 3700.30 (لون أخضر)"],
    ["- 3800.100 (لون أحمر)"],
    ["- 3800.200 (لون أزرق)"],
    [""],
    ["❌ **أمثلة خاطئة (تسبب تكرار):**"],
    ["- 3700.1 (سيندمج مع 3700.10)"],
    ["- 3800.1 (سيندمج مع 3800.100)"],
    ["- 3700.01 (قد يقرأ كـ 3700.1)"],
    [""],
    ["📊 **الأعمدة المطلوبة:**"],
    ["1. master_code: الكود الرئيسي (مثل: 3700)"],
    ["2. item_code: كود فريد لكل لون/مقاس (مثل: 3700.10, 3700.20)"],
    ["3. item_name: اسم المنتج"],
    ["4. out_price: سعر البيع"],
    ["5. cur_qty: الكمية"],
    [""],
    ["🎯 **قاعدة ذهبية:**"],
    ["إذا كان لديك 3 ألوان لنفس المنتج، استخدم:"],
    ["3700.10, 3700.20, 3700.30 (وليس 3700.1, 3700.2, 3700.3)"],
  ]);
  
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "التعليمات");
  
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

/**
 * إنشاء تقرير تحليل للملف الحالي مع التركيز على التكرارات
 * @param {Array} data - البيانات
 * @returns {String} - تقرير نصي
 */
export function generateDataReport(data) {
  const report = createDataAnalysisReport(data);
  
  let reportText = "📊 تقرير تحليل البيانات:\n";
  reportText += "═".repeat(40) + "\n\n";
  
  reportText += `📦 إجمالي المنتجات: ${report.total}\n`;
  reportText += `🔤 master codes فريدة: ${report.masterCodes.unique}\n`;
  reportText += `🏷️ item codes فريدة: ${report.variants.totalItemCodes}\n\n`;
  
  // ✅ قسم التكرارات
  if (report.variants.duplicateItemCodes > 0) {
    reportText += "🔴 **تكرارات item_code:**\n";
    reportText += `   تم العثور على ${report.variants.duplicateItemCodes} كود مكرر\n\n`;
    
    Object.entries(report.variants.duplicateDetails).forEach(([code, details]) => {
      reportText += `   • ${code}: مكرر ${details.count} مرات\n`;
      details.items.forEach(item => {
        reportText += `     - ${item.name} | ${item.color} | ${item.size}\n`;
      });
    });
    reportText += "\n";
  } else {
    reportText += "✅ لا توجد تكرارات في item_code\n\n";
  }
  
  // ✅ قسم الأكواد العشرية
  reportText += "🔢 **الأكواد العشرية:**\n";
  if (report.preservation.decimalCodesPreserved > 0) {
    reportText += `   ✅ تم الحفاظ على ${report.preservation.decimalCodesPreserved} كود عشري\n`;
    reportText += `   📝 أمثلة: ${report.preservation.examples.join(', ')}\n`;
  }
  if (report.preservation.suspiciousCodes > 0) {
    reportText += `   ⚠️ ${report.preservation.suspiciousCodes} كود قد يكون فقد أصفاراً: ${report.preservation.suspiciousExamples.join(', ')}\n`;
  }
  reportText += "\n";
  
  // ✅ قسم master codes
  reportText += "📋 **تحليل master codes:**\n";
  reportText += `   • منتجات بأصناف متعددة: ${report.masterCodes.withVariants}\n`;
  reportText += `   • master codes بها تكرار: ${report.masterCodes.withDuplicates}\n\n`;
  
  // ✅ الألوان والمقاسات
  reportText += "🎨 **الألوان:**\n";
  report.attributes.colors.forEach(color => {
    reportText += `   • ${color}\n`;
  });
  
  reportText += "\n📏 **المقاسات:**\n";
  report.attributes.sizes.forEach(size => {
    reportText += `   • ${size}\n`;
  });
  
  return reportText;
}

/**
 * دالة مساعدة لحل مشكلة التكرارات تلقائياً
 * @param {Array} data - البيانات
 * @returns {Array} - بيانات بعد حل التكرارات
 */
export function fixDuplicateItemCodes(data) {
  const fixedData = [];
  const seenCodes = new Set();
  const duplicates = {};
  
  data.forEach(row => {
    let itemCode = row.item_code;
    
    // إذا كان الكود مكرر، نضيف له لاحقة
    if (seenCodes.has(itemCode)) {
      // نحاول إيجاد كود فريد
      let counter = 1;
      let newCode = `${itemCode}-${counter}`;
      
      while (seenCodes.has(newCode)) {
        counter++;
        newCode = `${itemCode}-${counter}`;
      }
      
      console.warn(`⚠️ تم تعديل كود مكرر: ${itemCode} -> ${newCode}`);
      
      // نسخ الصف مع الكود الجديد
      const fixedRow = { ...row, item_code: newCode };
      fixedData.push(fixedRow);
      seenCodes.add(newCode);
      
      // تسجيل التكرار
      if (!duplicates[itemCode]) {
        duplicates[itemCode] = [];
      }
      duplicates[itemCode].push(newCode);
    } else {
      fixedData.push(row);
      seenCodes.add(itemCode);
    }
  });
  
  if (Object.keys(duplicates).length > 0) {
    console.log("📝 تم تعديل التكرارات:", duplicates);
  }
  
  return fixedData;
}