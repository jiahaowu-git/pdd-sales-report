// 后端 HTTP 服务
// 允许 PM2 传入的 env 覆盖 .env 文件
require("dotenv").config({ override: false });
const express = require("express");
const cors = require("cors");
const path = require("path");
const dayjs = require("dayjs");

const { ROOT, SUMMARY_COLUMNS, SHOP_DIRS } = require("./config");
const { readSummaryWorkbook, listFilesInRange } = require("./excel");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/** 校验日期范围参数 */
function getDateRange(req) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    const err = new Error("参数缺失：需要 startDate 与 endDate (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }
  if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) {
    const err = new Error("日期格式不合法，应为 YYYY-MM-DD");
    err.status = 400;
    throw err;
  }
  if (dayjs(startDate).isAfter(endDate)) {
    const err = new Error("开始日期不能晚于结束日期");
    err.status = 400;
    throw err;
  }
  return { startDate, endDate };
}

/** 校验店铺参数 */
function getShopName(req) {
  const { shopName } = req.query;
  console.log(
    "[backend] req.url=",
    req.url,
    "shopName=",
    JSON.stringify(shopName),
  );
  if (!shopName || !SHOP_DIRS[shopName]) {
    const err = new Error(
      `店铺参数不合法或缺失，允许值：${Object.keys(SHOP_DIRS).join("、")}`,
    );
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
app.get("/api/dashboard", async (req, res, next) => {
  try {
    const shopName = getShopName(req);
    const { startDate, endDate } = getDateRange(req);
    const shopDir = path.join(ROOT, SHOP_DIRS[shopName]);

    const files = listFilesInRange(shopDir, startDate, endDate);

    // 按日期顺序汇总
    const dailyMap = new Map(); // date -> { 列名 -> 数值 }
    // 按商品ID 汇总：{ 商品ID: { 日期: { 列名: 数值 } } }
    const productMap = new Map();
    // 按商品ID × 日期 的推广名称：{ 商品ID: { 日期: 推广名称 } }
    const productNameMap = new Map();
    const allProductIds = new Set();
    for (const f of files) {
      const { summary, byProduct, productNameByDate } =
        await readSummaryWorkbook(f.fullPath, {
          fileDate: f.source === "daily" ? f.date : null,
          fileDateRange: f.source === "range" ? f.dateRange : null,
        });
      for (const [date, cols] of Object.entries(summary)) {
        if (!dailyMap.has(date))
          dailyMap.set(
            date,
            Object.fromEntries(SUMMARY_COLUMNS.map((c) => [c, 0])),
          );
        const acc = dailyMap.get(date);
        for (const c of SUMMARY_COLUMNS) acc[c] += Number(cols[c] || 0);
      }
      // 累加商品ID 维度数据
      for (const [date, prodCols] of Object.entries(byProduct || {})) {
        for (const [pid, cols] of Object.entries(prodCols)) {
          allProductIds.add(pid);
          if (!productMap.has(pid)) {
            productMap.set(
              pid,
              new Map(), // date -> { 列名 -> 数值 }
            );
          }
          const prodAcc = productMap.get(pid);
          if (!prodAcc.has(date)) {
            prodAcc.set(
              date,
              Object.fromEntries(SUMMARY_COLUMNS.map((c) => [c, 0])),
            );
            // 预置商品图百分数列默认值（excel.js 解析时会覆盖）
            ["退货率", "仅退款率", "销售占比"].forEach((c) => {
              prodAcc.get(date)[c] = 0;
            });
          }
          const accDay = prodAcc.get(date);
          for (const c of SUMMARY_COLUMNS) accDay[c] += Number(cols[c] || 0);
          // 商品图百分数列：原值为 0~1 小数（同一商品同一日期每日文件只有一行，直接覆盖）
          for (const c of ["退货率", "仅退款率", "销售占比"]) {
            if (cols[c] !== undefined && cols[c] !== null && cols[c] !== "")
              accDay[c] = Number(cols[c]) || 0;
          }
        }
      }
      // 累加推广名称（同商品同日期用最新读到的；后读到的覆盖先读到的，区间表通常在最末所以生效）
      for (const [date, prodNames] of Object.entries(productNameByDate || {})) {
        for (const [pid, pname] of Object.entries(prodNames)) {
          if (!productNameMap.has(pid)) productNameMap.set(pid, new Map());
          productNameMap.get(pid).set(date, pname);
        }
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
    Object.keys(summaryCards).forEach(
      (k) => (summaryCards[k] = Number(summaryCards[k].toFixed(2))),
    );

    // 卡片标题里"推广成交花费"对应底表的"成交花费"，这里加别名便于前端直接拿
    summaryCards["推广成交花费"] = summaryCards["成交花费"];

    // 派生字段（前端卡片直接展示）
    // 1. 店铺净销售 = 店铺成交金额 - 总退款金额
    summaryCards["店铺净销售"] = Number(
      (summaryCards["店铺成交金额"] - summaryCards["总退款金额"]).toFixed(2),
    );
    // 2. 推广净销售 = 推广交易额 - 总退款金额
    summaryCards["推广净销售"] = Number(
      (summaryCards["推广交易额"] - summaryCards["总退款金额"]).toFixed(2),
    );
    // 3. 店铺 ROI = 店铺净销售 / 推广成交花费
    summaryCards["店铺ROI"] = summaryCards["推广成交花费"]
      ? Number(
          (summaryCards["店铺净销售"] / summaryCards["推广成交花费"]).toFixed(
            2,
          ),
        )
      : 0;
    // 4. 推广 ROI = 推广净销售 / 推广成交花费
    summaryCards["推广ROI"] = summaryCards["推广成交花费"]
      ? Number(
          (summaryCards["推广净销售"] / summaryCards["推广成交花费"]).toFixed(
            2,
          ),
        )
      : 0;
    // 5. 退款率 = 总退款金额 / 推广交易额
    summaryCards["退款率"] = summaryCards["推广交易额"]
      ? Number(
          (summaryCards["总退款金额"] / summaryCards["推广交易额"]).toFixed(4),
        )
      : 0;
    // 6. 仅退款率 = 未发货退款金额 / 总退款金额
    summaryCards["仅退款率"] = summaryCards["总退款金额"]
      ? Number(
          (summaryCards["未发货退款金额"] / summaryCards["总退款金额"]).toFixed(
            4,
          ),
        )
      : 0;
    // 注：销售占比（店铺成交金额 / 推广交易额）在按店铺聚合场景下恒为 100%，
    //     没有信息量，因此不在 summaryCards 中计算。
    //     明细表里仍保留这一列——直接从每日 xlsx 文件里读取。

    // 图表里增加派生指标"店铺净销售 / 推广净销售"的每日序列，
    // 让前端折线图能展示 7 个系列
    chartSeries.push({
      name: "店铺净销售",
      data: dates.map((d) => {
        const a = dailyMap.get(d);
        return Number((a["店铺成交金额"] - a["总退款金额"]).toFixed(2));
      }),
    });
    chartSeries.push({
      name: "推广净销售",
      data: dates.map((d) => {
        const a = dailyMap.get(d);
        return Number((a["推广交易额"] - a["总退款金额"]).toFixed(2));
      }),
    });
    // 店铺 ROI / 推广 ROI 每日序列（数值小，挂右侧 Y 轴）
    chartSeries.push({
      name: "店铺ROI",
      data: dates.map((d) => {
        const a = dailyMap.get(d);
        const spend = a["成交花费"] || 0;
        if (!spend) return 0;
        return Number(
          ((a["店铺成交金额"] - a["总退款金额"]) / spend).toFixed(2),
        );
      }),
    });
    chartSeries.push({
      name: "推广ROI",
      data: dates.map((d) => {
        const a = dailyMap.get(d);
        const spend = a["成交花费"] || 0;
        if (!spend) return 0;
        return Number(((a["推广交易额"] - a["总退款金额"]) / spend).toFixed(2));
      }),
    });

    // 按商品ID × 指标 的折线图数据
    // 商品图只保留两类系列：
    //  - 左 Y 轴：店铺ROI / 推广ROI（数值小）
    //  - 右 Y 轴：退款率 / 仅退款率 / 销售占比（百分数 0~100%）
    // 注：明细 Excel 列名为 "退货率"（不是 "退款率"）；原值是 0~1 小数，需 *100 转为百分数
    const PRODUCT_CHART_COLS = [
      "店铺ROI",
      "推广ROI",
      "退款率", // 实际对应明细里的 "退货率"
      "仅退款率",
      "销售占比",
    ];
    const PERCENT_COLS = new Set(["退款率", "仅退款率", "销售占比"]);
    const chartByProduct = Array.from(allProductIds)
      .sort()
      .map((pid) => {
        const prodAcc = productMap.get(pid) || new Map();
        // 派生列
        const series = [];
        for (const col of PRODUCT_CHART_COLS) {
          const data = dates.map((d) => {
            const a = prodAcc.get(d);
            if (!a) return 0;
            const spend = a["成交花费"] || 0;
            if (col === "店铺ROI")
              return spend
                ? Number(
                    ((a["店铺成交金额"] - a["总退款金额"]) / spend).toFixed(2),
                  )
                : 0;
            if (col === "推广ROI")
              return spend
                ? Number(
                    ((a["推广交易额"] - a["总退款金额"]) / spend).toFixed(2),
                  )
                : 0;
            if (PERCENT_COLS.has(col)) {
              // 明细里百分数列以小数存储（0.3064 表示 30.64%），统一 ×100
              const raw = col === "退款率" ? a["退货率"] || 0 : a[col] || 0;
              return Number((raw * 100).toFixed(2));
            }
            return Number((a[col] || 0).toFixed(2));
          });
          series.push({ name: col, data });
        }
        return { productId: pid, series };
      });

    // 给每个商品 ID 补上"最近日期的推广名称"——按 dates 倒序查找第一个有名称的
    const promotionNameByProduct = {};
    for (const pid of allProductIds) {
      const nameMap = productNameMap.get(pid);
      let latestName = "";
      if (nameMap) {
        // dates 已是升序；倒序找第一个非空的
        for (let i = dates.length - 1; i >= 0; i--) {
          const v = nameMap.get(dates[i]);
          if (v) {
            latestName = v;
            break;
          }
        }
      }
      promotionNameByProduct[pid] = latestName;
    }
    for (const item of chartByProduct) {
      item.promotionName = promotionNameByProduct[item.productId] || "";
    }

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
        chartByProduct,
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
app.get("/api/detail", async (req, res, next) => {
  try {
    const shopName = getShopName(req);
    const { startDate, endDate, fileName } = req.query;
    if (!startDate || !endDate) {
      const err = new Error("需要 startDate 与 endDate");
      err.status = 400;
      throw err;
    }
    if (!fileName) {
      const err = new Error("需要 fileName");
      err.status = 400;
      throw err;
    }

    const shopDir = path.join(ROOT, SHOP_DIRS[shopName]);
    const fullPath = path.join(shopDir, path.basename(fileName));

    // 安全校验：必须落在 startDate ~ endDate 区间内
    const allowed = listFilesInRange(shopDir, startDate, endDate);
    if (!allowed.find((f) => f.fullPath === fullPath)) {
      const err = new Error("文件不在所选日期范围内或无权访问");
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
app.get("/api/health", (req, res) => {
  res.json({ code: 0, message: "ok" });
});

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://${HOST}:${PORT}`);
  console.log(`[backend] PDD reports root: ${ROOT}`);
});
