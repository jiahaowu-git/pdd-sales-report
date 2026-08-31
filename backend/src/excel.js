// Excel 解析与按日期筛选工具
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
const { SUMMARY_COLUMNS, DATE_COLUMN } = require('./config');

/**
 * 解析单个汇总表 xlsx -> { rows, columns, summary }
 * rows    : 明细行数组（对象数组，键为列名）
 * columns : 表格列名数组（保持原始顺序）
 * summary : 各汇总列按日期聚合后的 { 'YYYY-MM-DD': {列名: 数值} }
 */
async function readSummaryWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // 取第一个 sheet
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], columns: [], summary: {} };

  // 第 1 行作为列头
  const headerRow = sheet.getRow(1);
  const columns = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    columns[colNumber] = String(cell.value ?? '').trim();
  });

  const rows = [];
  const summary = {};

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    columns.forEach((col, idx) => {
      if (!col) return;
      const v = row.getCell(idx).value;
      obj[col] = normalizeCellValue(v, col === DATE_COLUMN);
    });

    const dateKey = obj[DATE_COLUMN];
    if (dateKey) {
      if (!summary[dateKey]) {
        summary[dateKey] = Object.fromEntries(SUMMARY_COLUMNS.map((c) => [c, 0]));
      }
      SUMMARY_COLUMNS.forEach((c) => {
        const n = Number(obj[c]);
        if (!Number.isNaN(n)) summary[dateKey][c] += n;
      });
    }
    rows.push(obj);
  });

  return { rows, columns, summary };
}

/** 把单元格原始值转为字符串 / 数字 / 标准日期 YYYY-MM-DD */
function normalizeCellValue(v, isDate) {
  if (v === null || v === undefined || v === '') return null;
  if (isDate) {
    if (v instanceof Date) return dayjs(v).format('YYYY-MM-DD');
    if (typeof v === 'string') {
      // 已经是 YYYY-MM-DD 或 YYYY/MM/DD HH:mm:ss 等
      const d = dayjs(v);
      if (d.isValid()) return d.format('YYYY-MM-DD');
    }
    return String(v);
  }
  // 数值
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v && 'result' in v) {
    // ExcelJS 公式结果
    return normalizeCellValue(v.result, false);
  }
  if (typeof v === 'object' && v && 'richText' in v) {
    return v.richText.map((p) => p.text).join('');
  }
  const s = String(v).trim();
  // 尝试数值
  if (s !== '' && !Number.isNaN(Number(s))) return Number(s);
  return s;
}

/**
 * 在店铺目录下，根据日期范围筛出所有符合的「商品推广与售后单透视汇总表」文件。
 * 返回数组 [{ date: 'YYYY-MM-DD', fileName, fullPath }]
 */
function listFilesInRange(shopDirPath, startDate, endDate) {
  if (!fs.existsSync(shopDirPath)) return [];

  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid()) return [];

  const result = [];
  const entries = fs.readdirSync(shopDirPath);
  for (const name of entries) {
    // 例：物空旗舰店_商品推广与售后单透视汇总表_2026-08-01.xlsx
    const m = name.match(/^(.+?)_商品推广与售后单透视汇总表_(\d{4}-\d{2}-\d{2})\.xlsx$/);
    if (!m) continue;
    const fileDate = dayjs(m[2]);
    if (!fileDate.isValid()) continue;
    if (fileDate.isBefore(start, 'day') || fileDate.isAfter(end, 'day')) continue;
    result.push({
      date: m[2],
      fileName: name,
      fullPath: path.join(shopDirPath, name),
    });
  }
  // 按日期排序
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

module.exports = {
  readSummaryWorkbook,
  listFilesInRange,
};