// 全局配置：店铺目录、聚合列定义
const path = require('path');

const ROOT = process.env.PDD_REPORTS_ROOT || path.resolve(__dirname, '../../拼多多销售报表');

// 汇总聚合列：出现在数据看板顶部卡片 + 折线图中
const SUMMARY_COLUMNS = [
  '店铺成交金额',
  '推广交易额',
  '成交花费',
  '总退款金额',
  '未发货退款金额',
];

// 所有日期统一从此列读取
const DATE_COLUMN = '同意退款时间';

// 店铺名 -> 子目录名 映射（目录名与店铺名保持一致）
const SHOP_DIRS = {
  '物空旗舰店': '物空旗舰店',
  '望穿专卖店': '望穿专卖店',
  '梵塔专卖店': '梵塔专卖店',
};

module.exports = {
  ROOT,
  SUMMARY_COLUMNS,
  DATE_COLUMN,
  SHOP_DIRS,
};