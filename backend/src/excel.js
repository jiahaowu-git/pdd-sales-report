// Excel 解析与按日期筛选工具
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const dayjs = require("dayjs");
const { SUMMARY_COLUMNS, DATE_COLUMN } = require("./config");

/**
 * 解析单个汇总表 xlsx -> { rows, columns, summary, byProduct }
 * rows      : 明细行数组（对象数组，键为列名）
 * columns   : 表格列名数组（保持原始顺序）
 * summary   : 各汇总列按日期聚合后的 { 'YYYY-MM-DD': {列名: 数值} }
 * byProduct : 各商品ID 按日期聚合后的 { 'YYYY-MM-DD': { 商品ID: {列名: 数值} } }
 *
 * 每日文件没有"日期列"，日期由调用方通过 fileDate / fileDateRange 从文件名传入；
 * 区间表虽然有日期列，但首列内容是 "YYYY-MM-DD 至 YYYY-MM-DD" 这种字符串
 * 无法被 dayjs 解析，故也以文件名日期为准。
 *
 * NOTE: 明细表的"日期列"实际是字符串 "2026-08-01 至 2026-08-26"，无法 dayjs 解析，
 * 所以 byProduct 也以 fileDate 为准（区间表里所有商品都归属于 fileDate）。
 */
async function readSummaryWorkbook(filePath, options = {}) {
  const { fileDate, fileDateRange } = options;
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
  // byProduct: { 'YYYY-MM-DD': { 商品ID: {列名: 数值} } }
  const byProduct = {};

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    columns.forEach((col, idx) => {
      if (!col) return;
      const v = row.getCell(idx).value;
      obj[col] = normalizeCellValue(v, col === DATE_COLUMN);
    });

    // 优先用表格里的日期列；解析失败时回退到文件名传入的日期
    let dateKey = obj[DATE_COLUMN];
    if (!dateKey || !dayjs(dateKey).isValid()) {
      dateKey = fileDate || (fileDateRange && fileDateRange[0]) || null;
    }
    if (dateKey) {
      const k = dayjs(dateKey).isValid()
        ? dayjs(dateKey).format("YYYY-MM-DD")
        : String(dateKey);
      if (!summary[k]) {
        summary[k] = Object.fromEntries(SUMMARY_COLUMNS.map((c) => [c, 0]));
      }
      SUMMARY_COLUMNS.forEach((c) => {
        const n = Number(obj[c]);
        if (!Number.isNaN(n)) summary[k][c] += n;
      });

      // 按商品ID 维度聚合：每日每个商品ID 的 SUMMARY_COLUMNS 累加
      const productId = obj["商品ID"];
      if (productId !== null && productId !== undefined && String(productId).trim() !== "") {
        const pid = String(productId).trim();
        if (!byProduct[k]) byProduct[k] = {};
        if (!byProduct[k][pid]) {
          byProduct[k][pid] = Object.fromEntries(
            SUMMARY_COLUMNS.map((c) => [c, 0]),
          );
        }
        SUMMARY_COLUMNS.forEach((c) => {
          const n = Number(obj[c]);
          if (!Number.isNaN(n)) byProduct[k][pid][c] += n;
        });
      }
    }
    rows.push(obj);
  });

  return { rows, columns, summary, byProduct };
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

  // 先扫描根目录每日文件，统计能覆盖查询区间的天数
  const totalDays = end.diff(start, "day") + 1;
  const dailyFound = new Set();
  const dailyFileByDate = new Map(); // 'YYYY-MM-DD' -> { fullPath, fileName }
  for (const name of fs.readdirSync(shopDirPath)) {
    if (name.startsWith("~$")) continue;
    const m = name.match(
      /^(.+?)_商品推广与售后单透视汇总表_(\d{4}-\d{2}-\d{2})\.xlsx$/,
    );
    if (!m) continue;
    const d = dayjs(m[2]);
    if (!d.isValid()) continue;
    if (d.isBefore(start, "day") || d.isAfter(end, "day")) continue;
    dailyFileByDate.set(m[2], {
      fileName: name,
      fullPath: path.join(shopDirPath, name),
    });
    dailyFound.add(m[2]);
  }

  const dailyCoverage = dailyFound.size / totalDays;
  // 阈值：每日文件覆盖了 ≥ 50% 的查询天数，就优先用每日文件；
  // 缺失的天数再用区间表"补"。这样数据按天可见，曲线仍能展开。
  const useDailyFirst = dailyCoverage >= 0.5;

  const result = [];
  const coveredDates = new Set();

  // 收集区间合并表（始终准备，按需使用）
  // 同区间下可能存在多张区间表，按"区间天数"从大到小排序，避免重叠重复汇总
  const rangeDir = path.join(shopDirPath, "日期范围");
  const rangeFiles = [];
  if (fs.existsSync(rangeDir)) {
    for (const name of fs.readdirSync(rangeDir)) {
      if (name.startsWith("~$")) continue;
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
    rangeFiles.sort((a, b) => b.span - a.span);
  }

  function pushRangeSegments() {
    for (const f of rangeFiles) {
      const overlapStart = f.startObj.isAfter(start, "day")
        ? f.startObj
        : start;
      const overlapEnd = f.endObj.isBefore(end, "day") ? f.endObj : end;
      if (overlapStart.isAfter(overlapEnd, "day")) continue;
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
        let cur = seg.start.clone();
        while (!cur.isAfter(seg.end, "day")) {
          coveredDates.add(cur.format("YYYY-MM-DD"));
          cur = cur.add(1, "day");
        }
      }
    }
  }

  if (useDailyFirst) {
    // 1) 优先用每日文件
    for (const dStr of Array.from(dailyFound).sort()) {
      const f = dailyFileByDate.get(dStr);
      result.push({
        date: dStr,
        fileName: f.fileName,
        fullPath: f.fullPath,
        source: "daily",
      });
      coveredDates.add(dStr);
    }
    // 2) 再用区间表补缺失天数（按最大区间优先，差集填充）
    pushRangeSegments();
  } else {
    // 每日文件基本缺失，直接走区间表聚合（折线会退化为区间点）
    pushRangeSegments();
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
