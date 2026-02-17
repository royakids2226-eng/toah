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
        const workbook = XLSX.read(data, { type: "array" });
        
        if (workbook.SheetNames.length === 0) {
          errors.push("الملف لا يحتوي على أي أوراق بيانات");
          return resolve({ data: [], errors, warnings });
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // ✅ قراءة كل الخلايا مع الحفاظ على التنسيق
        const allData = [];
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1:A1');
        
        // قراءة العناوين من أول صف
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
          const cell = firstSheet[cellAddress];
          headers[C] = cell ? cell.toString().trim() : '';
        }
        
        console.log("📋 العناوين الأصلية:", headers);
        
        // ✅ تعيين الأعمدة المطلوبة بشكل ديناميكي
        const columnMapping = {
          master_code: ['master code', 'master_code', 'الماستر', 'الكود الرئيسي', 'master'],
          item_code: ['item code', 'item_code', 'كود الصنف', 'كود المنتج', 'كود', 'code'],
          item_name: ['item name', 'item_name', 'اسم المنتج', 'الاسم', 'name'],
          out_price: ['out price', 'out_price', 'سعر البيع', 'السعر', 'price'],
          cur_qty: ['cur qty', 'cur_qty', 'الكمية', 'quantity', 'qty'],
          color: ['color', 'اللون'],
          size: ['size', 'المقاس'],
          group_name: ['group name', 'group_name', 'المجموعة', 'group'],
          kind_name: ['kind name', 'kind_name', 'النوع', 'kind'],
          images: ['images', 'الصور', 'image', 'img']
        };
        
        // البحث عن الأعمدة المطابقة
        const foundColumns = {};
        headers.forEach((header, index) => {
          if (!header) return;
          
          const headerLower = header.toLowerCase().trim();
          
          // البحث عن تطابق
          for (const [key, variations] of Object.entries(columnMapping)) {
            if (variations.some(v => headerLower.includes(v) || v.includes(headerLower))) {
              foundColumns[key] = index;
              console.log(`✅ تم العثور على ${key} -> العمود ${index + 1}: ${header}`);
              break;
            }
          }
        });
        
        console.log("📊 الأعمدة المكتشفة:", foundColumns);
        
        // ✅ التحقق من الأعمدة المطلوبة
        const missingColumns = [];
        const requiredFields = ['master_code', 'item_code', 'item_name', 'out_price', 'cur_qty'];
        
        requiredFields.forEach(field => {
          if (!(field in foundColumns)) {
            missingColumns.push(field);
          }
        });
        
        if (missingColumns.length > 0) {
          errors.push(`الأعمدة المطلوبة غير موجودة: ${missingColumns.join(', ')}`);
          errors.push("الأعمدة الموجودة: " + headers.filter(h => h).join(', '));
          return resolve({ data: [], errors, warnings });
        }
        
        // ✅ قراءة البيانات مع الحفاظ على التنسيق
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const row = {};
          let hasData = false;
          
          for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = firstSheet[cellAddress];
            
            if (cell) {
              // ✅ استخدام النص المعروض للحفاظ على التنسيق
              let value = '';
              
              if (cell.w !== undefined) {
                value = cell.w.toString();
              } else if (cell.v !== undefined) {
                value = cell.v.toString();
              } else {
                value = '';
              }
              
              value = value.trim();
              
              // حفظ القيمة في الكائن حسب اسم العمود الأصلي
              row[headers[C]] = value;
              if (value) hasData = true;
            }
          }
          
          if (hasData) {
            allData.push(row);
          }
        }
        
        console.log(`📊 تم قراءة ${allData.length} صف`);
        
        // ✅ تحويل البيانات إلى التنسيق المطلوب
        const processedData = allData.map((row, index) => {
          const newRow = {
            master_code: row[headers[foundColumns.master_code]] || '',
            item_code: row[headers[foundColumns.item_code]] || '',
            item_name: row[headers[foundColumns.item_name]] || '',
            out_price: parseFloat(row[headers[foundColumns.out_price]]?.replace(/[^0-9.-]/g, '') || 0) || 0,
            cur_qty: parseInt(row[headers[foundColumns.cur_qty]]?.replace(/[^0-9.-]/g, '') || 0) || 0,
            color: foundColumns.color ? row[headers[foundColumns.color]] || 'افتراضي' : 'افتراضي',
            size: foundColumns.size ? row[headers[foundColumns.size]] || 'ONE SIZE' : 'ONE SIZE',
            group_name: foundColumns.group_name ? row[headers[foundColumns.group_name]] || 'عام' : 'عام',
            kind_name: foundColumns.kind_name ? row[headers[foundColumns.kind_name]] || 'عام' : 'عام',
            images: foundColumns.images ? row[headers[foundColumns.images]] || '' : '',
            stor_id: 0,
            type_id: 0,
            av_price: 0
          };
          
          // تنظيف item_code (الحفاظ على الأصفار)
          if (newRow.item_code && typeof newRow.item_code === 'string') {
            newRow.item_code = newRow.item_code.trim();
            
            // إذا كان كود عشري نحافظ عليه
            if (newRow.item_code.includes('.')) {
              console.log(`✅ كود عشري محفوظ: ${newRow.item_code}`);
            }
          }
          
          // تنظيف master_code
          if (newRow.master_code && typeof newRow.master_code === 'string') {
            newRow.master_code = newRow.master_code.trim();
          }
          
          // إنشاء unique_id
          newRow.unique_id = `${newRow.item_code}-0-0`;
          
          return newRow;
        }).filter(row => {
          // تصفية الصفوف الفارغة
          return row.master_code && row.master_code !== '' && 
                 row.item_code && row.item_code !== '' && 
                 row.item_name && row.item_name !== '' &&
                 row.out_price > 0;
        });
        
        console.log(`✅ تمت معالجة ${processedData.length} منتج`);
        
        // ✅ التحقق من التكرارات
        const itemCodes = new Set();
        const duplicates = [];
        
        processedData.forEach(row => {
          if (itemCodes.has(row.item_code)) {
            duplicates.push(row.item_code);
          } else {
            itemCodes.add(row.item_code);
          }
        });
        
        if (duplicates.length > 0) {
          const uniqueDuplicates = [...new Set(duplicates)];
          warnings.push(`⚠️ يوجد ${uniqueDuplicates.length} كود مكرر: ${uniqueDuplicates.slice(0, 5).join(', ')}`);
          
          // عرض تفاصيل التكرارات
          uniqueDuplicates.slice(0, 3).forEach(code => {
            const items = processedData.filter(r => r.item_code === code);
            if (items.length > 1) {
              warnings.push(`   • ${code}: ${items.length} منتجات (${items.map(i => i.color || i.size).filter(Boolean).join(', ')})`);
            }
          });
        } else {
          console.log("✅ لا توجد تكرارات في item_code");
        }
        
        // ✅ تحليل الأكواد العشرية
        const decimalCodes = processedData.filter(row => 
          row.item_code && 
          row.item_code.includes('.') && 
          row.item_code.split('.')[1].length >= 2
        );
        
        if (decimalCodes.length > 0) {
          warnings.push(`✅ تم الحفاظ على ${decimalCodes.length} كود عشري: ${decimalCodes.slice(0, 3).map(d => d.item_code).join(', ')}`);
        }
        
        resolve({ 
          data: processedData, 
          errors, 
          warnings,
          stats: {
            total: processedData.length,
            duplicates: duplicates.length,
            decimalCodes: decimalCodes.length
          }
        });
        
      } catch (error) {
        console.error("❌ خطأ:", error);
        errors.push(`خطأ: ${error.message}`);
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
 * تقسيم البيانات إلى دفعات
 */
export function splitIntoBatches(data, batchSize = 200) {
  if (!data || !Array.isArray(data)) return [];
  
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * إنشاء تقرير تحليل
 */
export function generateDataReport(data) {
  if (!data || data.length === 0) {
    return "لا توجد بيانات";
  }
  
  const masterCodes = new Set(data.map(d => d.master_code));
  const itemCodes = new Set(data.map(d => d.item_code));
  const colors = new Set(data.map(d => d.color).filter(Boolean));
  const sizes = new Set(data.map(d => d.size).filter(Boolean));
  
  // حساب التكرارات
  const codeCount = {};
  data.forEach(row => {
    codeCount[row.item_code] = (codeCount[row.item_code] || 0) + 1;
  });
  
  const duplicates = Object.entries(codeCount)
    .filter(([_, count]) => count > 1)
    .map(([code]) => code);
  
  let report = "📊 تقرير تحليل البيانات:\n";
  report += "═".repeat(40) + "\n\n";
  report += `📦 إجمالي المنتجات: ${data.length}\n`;
  report += `🏷️ master codes: ${masterCodes.size}\n`;
  report += `🔤 item codes: ${itemCodes.size}\n`;
  report += `🎨 الألوان: ${colors.size}\n`;
  report += `📏 المقاسات: ${sizes.size}\n\n`;
  
  if (duplicates.length > 0) {
    report += `⚠️ تكرارات: ${duplicates.length} كود\n`;
    duplicates.slice(0, 5).forEach(code => {
      const count = codeCount[code];
      report += `   • ${code}: ${count} منتجات\n`;
    });
  } else {
    report += "✅ لا توجد تكرارات\n";
  }
  
  // الأكواد العشرية
  const decimalCodes = data.filter(row => 
    row.item_code && row.item_code.includes('.') && row.item_code.split('.')[1].length >= 2
  );
  
  if (decimalCodes.length > 0) {
    report += `\n✅ أكواد عشرية محفوظة: ${decimalCodes.length}\n`;
    report += `   مثل: ${decimalCodes.slice(0, 3).map(d => d.item_code).join(', ')}\n`;
  }
  
  return report;
}

/**
 * تحميل نموذج Excel
 */
export function getExcelTemplate() {
  const templateData = [
    {
      "master code": "3700",
      "item code": "3700.10",
      "item name": "تيشيرت قطني",
      "out price": 100,
      "cur qty": 50,
      "اللون": "أحمر",
      "المقاس": "M",
      "المجموعة": "ملابس",
      "النوع": "تيشيرت"
    },
    {
      "master code": "3700",
      "item code": "3700.20",
      "item name": "تيشيرت قطني",
      "out price": 100,
      "cur qty": 30,
      "اللون": "أزرق",
      "المقاس": "L",
      "المجموعة": "ملابس",
      "النوع": "تيشيرت"
    },
    {
      "master code": "3700",
      "item code": "3700.30",
      "item name": "تيشيرت قطني",
      "out price": 100,
      "cur qty": 20,
      "اللون": "أخضر",
      "المقاس": "XL",
      "المجموعة": "ملابس",
      "النوع": "تيشيرت"
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المنتجات");
  
  // ورقة التعليمات
  const instructions = [
    ["📌 تعليمات هامة:"],
    [""],
    ["1️⃣ الأعمدة المطلوبة (يمكن تسميتها بأي شكل):"],
    ["   • master code أو master_code أو الكود الرئيسي"],
    ["   • item code أو item_code أو كود الصنف"],
    ["   • item name أو item_name أو اسم المنتج"],
    ["   • out price أو out_price أو سعر البيع"],
    ["   • cur qty أو cur_qty أو الكمية"],
    [""],
    ["2️⃣ الأعمدة الاختيارية:"],
    ["   • color أو اللون"],
    ["   • size أو المقاس"],
    ["   • group name أو المجموعة"],
    ["   • kind name أو النوع"],
    [""],
    ["3️⃣ مهم جداً للأكواد العشرية:"],
    ["   • استخدم 3700.10 (وليس 3700.1)"],
    ["   • استخدم 3700.20 (وليس 3700.2)"],
    ["   • هذا يمنع التكرار"],
    [""],
    ["4️⃣ مثال صحيح:"],
    ["   master code, item code, item name, out price, cur qty, color, size"],
    ["   3700, 3700.10, تيشيرت أحمر, 100, 50, أحمر, M"],
    ["   3700, 3700.20, تيشيرت أزرق, 100, 30, أزرق, L"],
  ];
  
  const instSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instSheet, "تعليمات");
  
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

/**
 * دالة مساعدة لفحص التكرارات
 */
export function checkDuplicates(data) {
  const codeMap = {};
  
  data.forEach((row, index) => {
    const code = row.item_code;
    if (!codeMap[code]) {
      codeMap[code] = [];
    }
    codeMap[code].push({
      row: index + 2,
      color: row.color,
      size: row.size,
      name: row.item_name
    });
  });
  
  const duplicates = Object.entries(codeMap)
    .filter(([_, items]) => items.length > 1)
    .map(([code, items]) => ({
      code,
      count: items.length,
      items
    }));
  
  return duplicates;
}

/**
 * إصلاح التكرارات تلقائياً
 */
export function autoFixDuplicates(data) {
  const fixed = [];
  const usedCodes = new Set();
  
  data.forEach(row => {
    let newCode = row.item_code;
    let counter = 1;
    
    while (usedCodes.has(newCode)) {
      // إضافة لاحقة للكود المكرر
      newCode = `${row.item_code}-${counter}`;
      counter++;
    }
    
    usedCodes.add(newCode);
    fixed.push({
      ...row,
      item_code: newCode,
      original_code: row.item_code !== newCode ? row.item_code : undefined
    });
  });
  
  return fixed;
}