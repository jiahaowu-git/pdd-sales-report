// 全局配置：店铺目录、聚合列定义
const path = require("path");

// 拼多多销售报表根目录，优先级：
//   1) 环境变量 PDD_REPORTS_ROOT（最高，手动覆盖用）
//   2) NODE_ENV === 'development'  → 开发机默认路径 <代码>/../拼多多销售报表
//   3) NODE_ENV === 'production'   → 生产机器默认路径 D:\下载\影刀RPA下载\拼多多销售报表
const NODE_ENV = process.env.NODE_ENV || "development";

const DEV_REPORTS_ROOT = path.resolve(__dirname, "../../拼多多销售报表");
const PROD_REPORTS_ROOT = "D:\\下载\\影刀RPA下载\\拼多多销售报表";

const DEFAULT_REPORTS_ROOT =
  NODE_ENV === "production" ? PROD_REPORTS_ROOT : DEV_REPORTS_ROOT;

const ROOT = process.env.PDD_REPORTS_ROOT || DEFAULT_REPORTS_ROOT;

// 汇总聚合列：出现在数据看板顶部卡片 + 折线图中
const SUMMARY_COLUMNS = [
  "店铺成交金额",
  "推广交易额",
  "成交花费",
  "总退款金额",
  "未发货退款金额",
];

// 所有日期统一从此列读取
const DATE_COLUMN = "同意退款时间";

// 店铺名 -> 子目录名 映射（目录名与店铺名保持一致）
const SHOP_DIRS = {
  物空旗舰店: "物空旗舰店",
  望穿专卖店: "望穿专卖店",
  梵塔专卖店: "梵塔专卖店",
};

module.exports = {
  ROOT,
  NODE_ENV,
  SUMMARY_COLUMNS,
  DATE_COLUMN,
  SHOP_DIRS,
};

// 启动时输出一下当前实际使用的根路径与 env，方便部署排查
// eslint-disable-next-line no-console
console.log(
  `[config] NODE_ENV=${NODE_ENV} | PDD reports root = ${ROOT}` +
    (process.env.PDD_REPORTS_ROOT ? " (overridden by PDD_REPORTS_ROOT)" : ""),
);
