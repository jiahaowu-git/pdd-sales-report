// 后端 HTTP 服务
// 允许 PM2 传入的 env 覆盖 .env 文件
require('dotenv').config({ override: false });
const express = require('express');
const cors = require('cors');
const path = require('path');
const dayjs = require('dayjs');

const { ROOT, SUMMARY_COLUMNS, SHOP_DIRS } = require('./config');
const { readSummaryWorkbook, listFilesInRange } = require('./excel');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/** 校验日期范围参数 */
function getDateRange(req) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    const err = new Error('参数缺失：需要 startDate 与 endDate (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) {
    const err = new Error('日期格式不合法，应为 YYYY-MM-DD');
    err.status = 400;
    throw err;
  }
  if (dayjs(startDate).isAfter(endDate)) {
    const err = new Error('开始日期不能晚于结束日期');
    err.status = 400;
    throw err;
  }
  return { startDate, endDate };
}

/** 校验店铺参数 */
function getShopName(req) {
  const { shopName } = req.query;
  if (!shopName || !SHOP_DIRS[shopName]) {
    const err = new Error(`店铺参数不合法或缺失，允许值：${Object.keys(SHOP_DIRS).join('、')}`);
    err.status = 400;
    throw err;
  }
  return shopName;
}

/** 统一错误处理 */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ code: status, message: err.message });
});

/**
 * GET /api/dashboard?shopName=物空旗舰店&startDate=2026-08-01&endDate=2026-08-20
 * 返回：
 *   - summaryCards : 顶部卡片汇总（每个汇总列在该区间内的总计）
 *   - series       : 折线图数据 { dates:[], series: [{ name, data:[] }] }
 *   - menu         : 明细文件菜单列表 [{ date, fileName, menuLabel }]
 *   - totals       : 同 summaryCards 但也返回方便扩展
 */
app.get('/api/dashboard', async (req, res, next) => {
  try {
    const shopName = getShopName(req);
    const { startDate, endDate } = getDateRange(req);
    const shopDir = path.join(ROOT, SHOP_DIRS[shopName]);

    const files = listFilesInRange(shopDir, startDate, endDate);

    // 按日期顺序汇总
    const dailyMap = new Map(); // date -> { 列名 -> 数值 }
    for (const f of files) {
      const { summary } = await readSummaryWorkbook(f.fullPath);
      for (const [date, cols] of Object.entries(summary)) {
        if (!dailyMap.has(date)) dailyMap.set(date, Object.fromEntries(SUMMARY_COLUMNS.map((c) => [c, 0])));
        const acc = dailyMap.get(date);
        for (const c of SUMMARY_COLUMNS) acc[c] += Number(cols[c] || 0);
      }
    }

    const dates = Array.from(dailyMap.keys()).sort();
    const chartSeries = SUMMARY_COLUMNS.map((name) => ({
      name,
      data: dates.map((d) => Number((dailyMap.get(d)[name] || 0).toFixed(2))),
    }));

    // 顶部卡片：对区间内所有日期累计求和
    const summaryCards = {};
    for (const c of SUMMARY_COLUMNS) {
      summaryCards[c] = 0;
    }
    for (const acc of dailyMap.values()) {
      for (const c of SUMMARY_COLUMNS) summaryCards[c] += Number(acc[c] || 0);
    }
    // 数值保留两位小数
    Object.keys(summaryCards).forEach((k) => (summaryCards[k] = Number(summaryCards[k].toFixed(2))));
    // 整体推广 ROI：推广交易额 / 成交花费
    summaryCards['整体推广 ROI'] = summaryCards['成交花费']
      ? Number((summaryCards['推广交易额'] / summaryCards['成交花费']).toFixed(2))
      : 0;

    const menu = files.map((f) => ({
      date: f.date,
      fileName: f.fileName,
      menuLabel: `${shopName}_商品推广与售后单透视汇总表_${f.date}`,
    }));

    res.json({
      code: 0,
      data: {
        shopName,
        startDate,
        endDate,
        summaryCards,
        chart: { dates, series: chartSeries },
        menu,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/detail?shopName=&startDate=&endDate=&fileName=
 * 返回某个明细文件的完整数据行。
 */
app.get('/api/detail', async (req, res, next) => {
  try {
    const shopName = getShopName(req);
    const { startDate, endDate, fileName } = req.query;
    if (!startDate || !endDate) {
      const err = new Error('需要 startDate 与 endDate');
      err.status = 400;
      throw err;
    }
    if (!fileName) {
      const err = new Error('需要 fileName');
      err.status = 400;
      throw err;
    }

    const shopDir = path.join(ROOT, SHOP_DIRS[shopName]);
    const fullPath = path.join(shopDir, path.basename(fileName));

    // 安全校验：必须落在 startDate ~ endDate 区间内
    const allowed = listFilesInRange(shopDir, startDate, endDate);
    if (!allowed.find((f) => f.fullPath === fullPath)) {
      const err = new Error('文件不在所选日期范围内或无权访问');
      err.status = 403;
      throw err;
    }

    const { rows, columns } = await readSummaryWorkbook(fullPath);
    res.json({
      code: 0,
      data: { fileName, rows, columns },
    });
  } catch (e) {
    next(e);
  }
});

/** 健康检查 */
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok' });
});

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://${HOST}:${PORT}`);
  console.log(`[backend] PDD reports root: ${ROOT}`);
});