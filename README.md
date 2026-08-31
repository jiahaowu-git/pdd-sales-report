# 拼多多销售报表系统 - 源码

拼多多店铺（物空旗舰店、望穿专卖店、梵塔专卖店）日度销售与推广数据的可视化分析系统。

## 目录

- `backend/`：Node.js + Express 后端，解析拼多多透视汇总表
- `frontend/`：Vue 3 + shadcn-vue + ECharts 前端
- `ecosystem.config.js`：PM2 进程配置（后端 + 前端静态服务）

> 原始 xlsx 数据位于 `../拼多多销售报表/`，不进 git。

## 本地开发

```powershell
# 后端
cd 代码\backend  && npm install && cd ..
# 前端（HMR + dev server）
cd 代码\frontend && npm install && npm run dev:pm2
```

开发期只需 PM2 跑后端；前端用 vite dev server 自带 HMR。

## 局域网/生产部署

### 0. 目标机器一次性准备
1. 安装 Node.js LTS（≥ 18），重启 PowerShell 让 PATH 生效
2. 全局安装 PM2: `npm install -g pm2`
3. 防火墙放行 TCP 8002 / 9002（控制面板 → 防火墙 → 高级 → 入站规则 → 新建端口规则）

### 1. 拷贝文件
- `代码/` 仓库（含子目录）
- `拼多多销售报表/` 数据目录（不进 git，需手动拷贝）放在 `代码/` 的**上级**，与开发机目录结构一致：
  ```
  D:\pdd\
  ├─ 代码\           <- git 仓库
  └─ 拼多多销售报表\   <- 单独拷贝
  ```
  如目录不同，启动时用环境变量覆盖：
  ```powershell
  $env:PDD_REPORTS_ROOT="D:\data\pdd"; pm2 start ecosystem.config.js
  ```

### 2. 安装依赖 + 构建前端
```powershell
cd D:\pdd\代码\backend
npm install --omit=dev
cd ..\frontend
npm install --omit=dev
npm run build       # 生成 dist/
```

### 3. 启动
```powershell
cd D:\pdd\代码
pm2 start ecosystem.config.js
pm2 save            # 保存进程列表，机器重启后可 pm2 resurrect 恢复
```

### 4. 局域网访问
- 前端：http://&lt;服务器IP&gt;:8002
- 后端：http://&lt;服务器IP&gt;:9002（前端内部已 /api 反代，业务无需直连后端）

### 5. 修改端口
改 `ecosystem.config.js` 中对应 app 的 `env.PORT` / `env.API_BASE`，然后：
```powershell
pm2 delete all
pm2 start ecosystem.config.js
```
（直接 `pm2 restart` 不会重新读取 env，需用 delete + start。）

## 路径说明

`ecosystem.config.js` 中 `cwd` 用 `path.resolve(__dirname, ...)` 相对配置目录计算，机器无关。

`PDD_REPORTS_ROOT` 的解析顺序：
1. PM2 backend app 显式注入的 `env.PDD_REPORTS_ROOT`（生产路径 `D:\下载\影刀RPA下载\拼多多销售报表`），优先级最高。
2. 未注入时由后端 `config.js` 按 `NODE_ENV` 选择默认：
   - `development` → `<代码>/../拼多多销售报表`（本地 `npm run dev` 用）
   - `production`  → `D:\下载\影刀RPA下载\拼多多销售报表`
3. 也可手动覆盖：
   ```powershell
   $env:PDD_REPORTS_ROOT="D:\data\pdd"; pm2 start ecosystem.config.js
   ```
