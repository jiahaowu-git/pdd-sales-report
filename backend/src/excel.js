// Excel 解析与按日期筛选工具
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const dayjs = require("dayjs");
const { SUMMARY_COLUMNS, DATE_COLUMN } = require("./config");

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
    columns[colNumber] = String(cell.value ?? "").trim();
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
        summary[dateKey] = Object.fromEntries(
          SUMMARY_COLUMNS.map((c) => [c, 0]),
        );
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
  if (v === null || v === undefined || v === "") return null;
  if (isDate) {
    if (v instanceof Date) return dayjs(v).format("YYYY-MM-DD");
    if (typeof v === "string") {
      // 已经是 YYYY-MM-DD 或 YYYY/MM/DD HH:mm:ss 等
      const d = dayjs(v);
      if (d.isValid()) return d.format("YYYY-MM-DD");
    }
    return String(v);
  }
  // 数值
  if (typeof v === "number") return v;
  if (typeof v === "object" && v && "result" in v) {
    // ExcelJS 公式结果
    return normalizeCellValue(v.result, false);
  }
  if (typeof v === "object" && v && "richText" in v) {
    return v.richText.map((p) => p.text).join("");
  }
  const s = String(v).trim();
  // 尝试数值
  if (s !== "" && !Number.isNaN(Number(s))) return Number(s);
  return s;
}

/**
 * 在店铺目录下，根据日期范围筛出所有符合的「商品推广与售后单透视汇总表」文件。
 *
 * 优先匹配 `日期范围/` 子目录下的「区间合并表」，例如
 *   物空旗舰店_商品推广与售后单透视汇总表_2026-08-01_2026-08-26.xlsx
 * 一个文件即可覆盖整个查询区间；区间未覆盖的天数再回退到根目录的每日文件：
 *   物空旗舰店_商品推广与售后单透视汇总表_2026-08-15.xlsx
 *
 * 返回数组 [{ date: 'YYYY-MM-DD', fileName, fullPath, source: 'range' | 'daily' }]
 */
function listFilesInRange(shopDirPath, startDate, endDate) {
  if (!fs.existsSync(shopDirPath)) return [];

  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid()) return [];

  const result = [];
  const coveredDates = new Set();

  // 1) 先找「日期范围/」子目录里的区间合并表
  // 同一查询区间下可能存在多张区间表（如 08-01~10, 08-01~16, 08-01~26 ...）
  // 按"区间天数"从大到小排序，先用最大区间覆盖，后面只取差集，避免重复汇总
  const rangeDir = path.join(shopDirPath, "日期范围");
  if (fs.existsSync(rangeDir)) {
    const rangeFiles = [];
    for (const name of fs.readdirSync(rangeDir)) {
      // 跳过 Excel 临时锁文件（~$xxx.xlsx）
      if (name.startsWith("~$")) continue;
      // 例：物空旗舰店_商品推广与售后单透视汇总表_2026-08-01_2026-08-26.xlsx
      const m = name.match(
        /^(.+?)_商品推广与售后单透视汇总表_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.xlsx$/,
      );
      if (!m) continue;
      const fileStart = dayjs(m[2]);
      const fileEnd = dayjs(m[3]);
      if (!fileStart.isValid() || !fileEnd.isValid()) continue;
      rangeFiles.push({
        startDate: m[2],
        endDate: m[3],
        startObj: fileStart,
        endObj: fileEnd,
        span: fileEnd.diff(fileStart, "day") + 1,
        fileName: name,
        fullPath: path.join(rangeDir, name),
      });
    }
    // 区间越长越优先
    rangeFiles.sort((a, b) => b.span - a.span);

    for (const f of rangeFiles) {
      // 与查询区间求交集
      const overlapStart = f.startObj.isAfter(start, "day")
        ? f.startObj
        : start;
      const overlapEnd = f.endObj.isBefore(end, "day") ? f.endObj : end;
      if (overlapStart.isAfter(overlapEnd, "day")) continue;
      // 跳过已被更大区间表覆盖的子区间
      const freeSegments = splitOutCovered(
        overlapStart,
        overlapEnd,
        coveredDates,
      );
      if (!freeSegments.length) continue;
      for (const seg of freeSegments) {
        result.push({
          date: seg.start.format("YYYY-MM-DD"),
          dateRange: [
            seg.start.format("YYYY-MM-DD"),
            seg.end.format("YYYY-MM-DD"),
          ],
          fileName: f.fileName,
          fullPath: f.fullPath,
          source: "range",
        });
        // 标记该区间表实际贡献覆盖的天数
        let cur = seg.start.clone();
        while (!cur.isAfter(seg.end, "day")) {
          coveredDates.add(cur.format("YYYY-MM-DD"));
          cur = cur.add(1, "day");
        }
      }
    }
  }

  // 2) 再扫根目录的每日文件，仅保留未被区间表覆盖的天数
  for (const name of fs.readdirSync(shopDirPath)) {
    // 跳过 Excel 临时锁文件（~$xxx.xlsx）
    if (name.startsWith("~$")) continue;
    // 例：物空旗舰店_商品推广与售后单透视汇总表_2026-08-01.xlsx
    const m = name.match(
      /^(.+?)_商品推广与售后单透视汇总表_(\d{4}-\d{2}-\d{2})\.xlsx$/,
    );
    if (!m) continue;
    const fileDate = dayjs(m[2]);
    if (!fileDate.isValid()) continue;
    if (fileDate.isBefore(start, "day") || fileDate.isAfter(end, "day"))
      continue;
    if (coveredDates.has(m[2])) continue;
    result.push({
      date: m[2],
      fileName: name,
      fullPath: path.join(shopDirPath, name),
      source: "daily",
    });
  }

  // 按日期排序
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * 给定 [segStart, segEnd] 区间段，把它按 coveredDates 中已覆盖的日期切掉，
 * 返回剩余的连续子区间段 [{ start, end }]
 */
function splitOutCovered(segStart, segEnd, coveredDates) {
  const free = [];
  let cur = segStart.clone();
  while (!cur.isAfter(segEnd, "day")) {
    if (coveredDates.has(cur.format("YYYY-MM-DD"))) {
      cur = cur.add(1, "day");
      continue;
    }
    const seg = cur.clone();
    while (
      !cur.isAfter(segEnd, "day") &&
      !coveredDates.has(cur.format("YYYY-MM-DD"))
    ) {
      cur = cur.add(1, "day");
    }
    free.push({ start: seg, end: cur.subtract(1, "day") });
  }
  return free;
}

module.exports = {
  readSummaryWorkbook,
  listFilesInRange,
};
