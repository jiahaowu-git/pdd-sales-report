# 拼多多销售报表系统 - 源码

拼多多店铺（物空旗舰店、望穿专卖店、梵塔专卖店）日度销售与推广数据的可视化分析系统。

## 目录

- `backend/`：Node.js + Express 后端，解析拼多多透视汇总表
- `frontend/`：Vue 3 + shadcn-vue + ECharts 前端
- `ecosystem.config.js`：PM2 联合启动配置

> 原始 xlsx 数据位于 `../拼多多销售报表/`，不进 git。

## 启动

```powershell
cd backend  && npm install && cd ..
cd frontend && npm install && npm run build && cd ..
pm2 start ecosystem.config.js
pm2 save
```

默认端口：
- 前端：http://&lt;IP&gt;:8002
- 后端：http://&lt;IP&gt;:9002

修改端口只需改 `ecosystem.config.js` 后 `pm2 restart`。
