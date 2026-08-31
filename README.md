# 拼多多销售报表系统 - 源码

拼多多店铺（物空旗舰店、望穿专卖店、梵塔专卖店）日度销售与推广数据的可视化分析系统。

## 目录

- `backend/`：Node.js + Express 后端，解析拼多多透视汇总表
- `frontend/`：Vue 3 + shadcn-vue + ECharts 前端
- `ecosystem.config.js`：PM2 开发环境配置（进 git）
- `ecosystem.config.js.prod`：PM2 生产环境配置（不进 git，本机维护）

> 原始 xlsx 数据位于 `../拼多多销售报表/`，不进 git。

## 本地开发

后端按 `NODE_ENV` 自动选择 xlsx 根目录：

| `NODE_ENV`      | xlsx 根目录                                |
| --------------- | ------------------------------------------ |
| `development`   | `<代码>/../拼多多销售报表`（默认）          |
| `production`    | `D:\下载\影刀RPA下载\拼多多销售报表`        |

`ecosystem.config.js` 默认 `NODE_ENV=development`，直接 PM2 跑即可。

### 方式 A：PM2 全程托管（推荐，跟生产环境一致）
```powershell
cd 代码\backend  && npm install && cd ..
cd 代码\frontend && npm install && npm run build && cd ..
pm2 start ecosystem.config.js   # 默认 development，读开发路径
```
前端走 `serve.js`（8002）托管 `dist/`，无 HMR；改前端代码后**必须**：
```powershell
cd 代码\frontend && npm run build && pm2 restart pdd-frontend
```
否则浏览器看到的是旧 `dist/`（缓存的 js 文件）。

### 方式 B：前端用 vite dev server（带 HMR）
```powershell
cd 代码\backend  && npm install && cd ..
cd 代码\frontend && npm install
# 两个终端分别跑：
cd 代码\backend  && npm run dev            # nodemon + development，后端 9002
cd 代码\frontend && npm run dev:pm2        # vite dev server，前端 8002（带 HMR）
```

## 局域网/生产部署

### 0. 目标机器一次性准备
1. 安装 Node.js LTS（≥ 18），重启 PowerShell 让 PATH 生效
2. 全局安装 PM2：`npm install -g pm2`
3. 防火墙放行 TCP 8002 / 9002：
   ```powershell
   netsh advfirewall firewall add rule name="PDD" dir=in action=allow protocol=TCP localport=9002,8002
   ```

### 1. 拷贝文件
**只拷源码 + dist + PM2 配置，不拷 node_modules**（目标机现场装）：
```
D:\pdd\
├─ 代码\           <- git 仓库（含 ecosystem.config.js.prod）
│  ├─ backend\
│  │  ├─ src\
│  │  ├─ package.json
│  │  └─ package-lock.json
│  ├─ frontend\
│  │  ├─ scripts\serve.js         <- 必须有
│  │  ├─ package.json
│  │  ├─ package-lock.json
│  │  └─ dist\                     <- 必须有（前端构建产物）
│  └─ ecosystem.config.js.prod
└─ 拼多多销售报表\   <- 单独拷贝（不进 git）
```

### 2. 安装依赖 + 构建前端
```powershell
cd D:\pdd\代码\backend
npm install --omit=dev              # 后端依赖（cors/express/exceljs 等）
cd ..\frontend
npm install --omit=dev              # 前端依赖（关键是 serve-handler）
npm run build                        # 生成 dist/（如果拷过来的已经是 dist 跳过这步）
```

### 3. 切到生产配置 + 启动
```powershell
cd D:\pdd\代码
Rename-Item ecosystem.config.js.prod ecosystem.config.js -Force
pm2 start ecosystem.config.js
pm2 save            # 保存进程列表，机器重启后可 pm2 resurrect 恢复
```

> `ecosystem.config.js.prod` 已写死 `NODE_ENV=production` 和生产路径，
> 重命名后无需任何环境变量。部署到此完成。
> 后续若要拉代码更新，重命名会被仓库的 dev 版覆盖，可以重新拷一份 `.prod` 过来再改名。

### 4. 局域网访问
- 前端：http://&lt;服务器IP&gt;:8002
- 后端：http://&lt;服务器IP&gt;:9002（前端内部已 /api 反代，业务无需直连后端）

### 5. 修改端口
改对应 PM2 配置中的 `env.PORT` / `env.API_BASE`，然后：
```powershell
pm2 delete all
pm2 start ecosystem.config.js
```
（直接 `pm2 restart` 不会重新读取 env，需用 delete + start。）

## 路径说明

- PM2 配置的 `cwd` 用 `path.resolve(__dirname, ...)` 相对配置目录计算，机器无关。
- 后端 `config.js` 解析 `PDD_REPORTS_ROOT` 的顺序：
  1. 显式注入的环境变量 `PDD_REPORTS_ROOT`（手动覆盖）
  2. 未注入时按 `NODE_ENV` 选默认：
     - `development` → `<代码>/../拼多多销售报表`
     - `production`  → `D:\下载\影刀RPA下载\拼多多销售报表`
- 如需覆盖默认路径：
  ```powershell
  $env:PDD_REPORTS_ROOT="D:\data\pdd"; pm2 start ecosystem.config.js
  ```

## 常用 PM2 命令

| 操作 | 命令 |
| --- | --- |
| 启动（首次） | `pm2 start ecosystem.config.js` |
| 查看状态 | `pm2 status` |
| 看日志 | `pm2 logs`（或指定 `pm2 logs pdd-backend`） |
| 重启（应用代码更新后） | `pm2 restart all` 或 `pm2 restart pdd-backend` |
| 重新读取 env（如改过端口） | `pm2 delete all && pm2 start ecosystem.config.js` |
| 临时停止（端口立即释放，PM2 还记着） | `pm2 stop all` 或 `pm2 stop pdd-backend` |
| 彻底关闭（从 PM2 列表删除） | `pm2 delete all` 或 `pm2 delete pdd-backend` |
| 应急杀全部进程 | `pm2 kill` |
| 保存进程列表（开机恢复） | `pm2 save` + 重启后 `pm2 resurrect` |
| 清空日志 | `pm2 flush` |
| 监控面板 | `pm2 monit` |

`stop` vs `delete` 怎么选：
- 想**临时让位**（比如端口要给别的程序用，下次还要启动）→ `stop`
- 想**彻底停掉、不再跑** → `delete`
- `restart` 既不会释放端口也不会清掉 PM2 记录，只是重启进程