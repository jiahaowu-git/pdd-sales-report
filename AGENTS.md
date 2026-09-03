# AGENTS.md

> 本文件定义本仓库对 **AI Agent / 自动化工具体系** 的全部协作约定。
> 凡自动或半自动参与本仓库改动、提交、PR、发布的工具（含 Claude / Codex / Aider / Cursor / Devin 等），在动手前**必须**完整阅读本文件，并按其行事。
> 人类协作者同样适用本文件中的工作流与质量要求。

---

## 目录

1. [仓库结构与远程](#1-仓库结构与远程)
2. [技术栈与运行环境](#2-技术栈与运行环境)
3. [核心工作流（强约束）](#3-核心工作流强约束)
4. [Commit 规范](#4-commit-规范)
5. [分支与版本管理](#5-分支与版本管理)
6. [Pull Request 规范](#6-pull-request-规范)
7. [代码风格与工程实践](#7-代码风格与工程实践)
8. [文件与编码约定](#8-文件与编码约定)
9. [敏感文件与 .gitignore](#9-敏感文件与-gitignore)
10. [与用户沟通约定](#10-与用户沟通约定)
11. [测试与验收](#11-测试与验收)
12. [故障处理与降级](#12-故障处理与降级)
13. [常见任务清单](#13-常见任务清单)
14. [自检清单（每次 commit 前必过）](#14-自检清单每次-commit-前必过)
15. [变更日志](#15-变更日志)

---

## 1. 仓库结构与远程

### 1.1 本地路径

- **Git 仓库根目录**：`e:\秀水泱泱开发\pdd-sales-report\代码`
  - ⚠️ **项目根** `e:\秀水泱泱开发\pdd-sales-report` **不是** Git 仓库
  - Git 初始化在 `代码/` 子目录，`.git/` 位于 `代码/.git`
- 所有 `git` 命令**必须**在 `代码/` 目录下执行；切勿在父目录误跑 `git init` / `git add`。

### 1.2 远程仓库

- **GitHub Remote**：`git@github.com:jiahaowu-git/pdd-sales-report.git`
- **默认分支**：`main`（本地与远程均已配 upstream）
- **传输协议**：SSH（GitHub 账号需配置 SSH 公钥）
- 克隆命令：`git clone git@github.com:jiahaowu-git/pdd-sales-report.git`

### 1.3 目录布局

```
代码/
├─ backend/                  # Node.js + Express 后端
│  ├─ src/
│  │  ├─ config.js           # 路径 / NODE_ENV 解析
│  │  ├─ excel.js            # xlsx 解析（依赖 ExcelJS）
│  │  └─ server.js           # API 入口
│  ├─ .gitignore
│  ├─ package.json
│  └─ package-lock.json
├─ frontend/                 # Vue 3 + Vite 前端
│  ├─ src/
│  │  ├─ api/index.js        # fetch 封装
│  │  ├─ components/         # 业务组件 + shadcn-vue UI
│  │  ├─ views/              # DashboardView / DetailView
│  │  ├─ lib/                # 工具（request / cn）
│  │  ├─ App.vue
│  │  ├─ main.js
│  │  └─ styles.css
│  ├─ scripts/serve.js       # 生产环境静态文件服务（8002）
│  ├─ .env                   # 本机配置（不进 git）
│  ├─ index.html
│  ├─ vite.config.js
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  └─ package.json
├─ ecosystem.config.js       # PM2 开发配置（进 git）
├─ ecosystem.config.js.prod  # PM2 生产配置（不进 git，本机维护）
├─ README.md                 # 人类阅读的部署与运行手册
├─ AGENTS.md                 # 本文件（Agent 协作规范）
└─ .gitignore
```

### 1.4 不进 git 的内容

- `../拼多多销售报表/`：原始 xlsx 数据（父目录，不在仓库内）
- `D:\下载\影刀RPA下载\拼多多销售报表\`：生产数据目录
- `frontend/.env`：本机环境变量
- `ecosystem.config.js.prod`：生产配置（仅本机）
- `node_modules/`、`dist/`、日志：已由 `.gitignore` 覆盖

---

## 2. 技术栈与运行环境

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3（Composition API + `<script setup>`） |
| UI 组件 | shadcn-vue（基于 reka-ui）+ Tailwind CSS |
| 图表 | ECharts 5（按需引入 LineChart / BarChart / 必要 Component） |
| 前端构建 | Vite |
| 前端静态服务（生产） | 自研 `scripts/serve.js`（serve-handler） |
| 后端 | Node.js ≥ 18 LTS + Express |
| xlsx 解析 | ExcelJS |
| 日期 | dayjs |
| 进程托管 | PM2 |
| 反代 | 前端内置 `/api` → 后端 `:9002` |

- **端口**：后端 9002，前端 8002
- **Node 版本**：≥ 18 LTS（生产部署说明在 `README.md`）

---

## 3. 核心工作流（强约束）

### 3.1 任何代码改动都必须经过三步

```
改代码  →  git commit  →  git push
```

**不允许**出现以下情形：
- 改动停留在本地工作区超过一个任务周期
- 改动只 commit 不 push
- 改动只 push 不 commit（不可能但请确认 working tree clean）

### 3.2 标准执行顺序

1. **改前确认**
   - 在 `代码/` 目录下
   - `git status` 干净或仅含本次改动
   - `git pull --rebase`（多人协作时；单人项目可省略）
2. **改代码**（按 §7 §8 规范）
3. **拆分 commit**（按 §4 规范）
4. **本地 commit**
5. **`git push`** 到 `origin/main`
6. **验收** `git status` 显示 clean 且 `git log -1` 是新 commit

### 3.3 一次任务多个 commit 的拆分原则

| 维度 | 拆开 |
|---|---|
| 模块 | frontend / backend / docs / config 分开 |
| 职责 | 新功能 / 重构 / 样式 / 重命名 分开 |
| 风险 | 实验性改动与确定性修复分开（便于 revert） |

同一次对话中，每次 `git add` 与 `git commit` 都对应**一个明确的、可独立回滚的变更单元**。

---

## 4. Commit 规范

采用 **Conventional Commits** 风格，描述部分使用**中文**（沿用仓库既有惯例）。

### 4.1 格式

```
<type>(<scope>): <中文简述>

[可选正文]
[可选脚注]
```

### 4.2 Type 清单

| Type | 含义 | 是否引入版本号变化 |
|---|---|---|
| `feat` | 新功能 | minor（`feat!` / `BREAKING CHANGE` 触发 major） |
| `fix` | 修复 bug | patch |
| `refactor` | 重构（非新功能、非 bug 修复） | — |
| `perf` | 性能优化 | patch |
| `style` | 样式调整（不影响逻辑） | — |
| `docs` | 文档 / 注释 | — |
| `test` | 增加 / 修改测试 | — |
| `chore` | 依赖、配置、构建等杂项 | — |
| `revert` | 回滚之前的 commit | — |
| `build` | 影响构建系统或外部依赖 | — |
| `ci` | CI 配置 | — |

### 4.3 Scope 建议

- `frontend`：前端整体改动
- `backend`：后端整体改动
- 必要时细到组件 / 文件：`frontend:LineChart`、`backend:excel.js`、`docs`、`AGENTS.md`、`deps`、`config`
- 不在清单内可自由扩展，但**保持稳定**以便检索

### 4.4 标题行规则

- 长度 ≤ 72 字符
- 中文为主，必要时英文术语
- **动词开头**或**名词短语**均可，但同一仓库风格统一
- 不要句号结尾
- 不写 "update"、"fix bug"、"some changes"、"WIP" 等无意义字样
- 不带 emoji（除非用户明确要求）

### 4.5 正文规则

- 标题与正文之间空一行
- 用 `-` 开头列出**关键改动点**（不是逐行 diff 翻译）
- 关注 "why" 而非 "what"——能体现设计决策、改动动机、与上下游的耦合
- 多文件改动按"文件: 改动要点"格式列举
- 引用 issue / 需求：`Refs: #123` 或 `需求: …`

### 4.6 BREAKING CHANGE

- 重大变更在正文首行写 `BREAKING CHANGE: <说明>`
- 或 type 后加 `!`：`feat(backend)!: 重写 /api/dashboard 响应结构`
- 同步更新 `README.md` 与本 `AGENTS.md` 中受影响章节

### 4.7 示例

```
feat(backend): Dashboard API 商品图新增 ROI/百分数列与推广名称

- excel.js: 新增商品图百分数列解析与 productNameByDate 记录
- server.js: 商品图改为 5 个系列（店铺ROI/推广ROI/退款率/仅退款率/销售占比），百分数 ×100
- server.js: 店铺总图新增店铺ROI/推广ROI 双 Y 轴序列
- server.js: chartByProduct 每项附带 promotionName（取自该商品最近日期的推广名称）
```

```
fix(frontend): DashboardView 商品图首次点击图标无反应

- toggleProduct 中 undefined 取反仍为 true，与默认展开状态相同
- 改为 current === undefined ? false : !current，首次点击必折叠
```

```
docs: AGENTS.md 全面重写，按业内标准补全仓库结构 / 风格 / 故障处理等章节
```

---

## 5. 分支与版本管理

### 5.1 当前策略

- 主分支 `main`：长期存在，受保护
- **不启用 feature branch**：所有改动直接 commit 到 `main`
- 不打 Git tag、不发布版本号（业务为内部工具，不需要语义化版本）

### 5.2 何时需要 feature branch

如果未来出现以下场景，需先与用户确认再启用分支策略：
- 多人协作 + 需要 PR 评审
- 灰度发布
- 大型重构需要长期隔离

启用时建议规范：
- `feat/<scope>-<short-desc>`：新功能
- `fix/<scope>-<short-desc>`：bug 修复
- `chore/<desc>`：杂项
- 通过 PR 合并到 `main`，squash merge，PR 标题沿用 commit 规范

### 5.3 主分支保护（建议，未来启用）

- 禁止直接 push（仅 PR merge）
- 必过 CI：build、test（如有）
- 必过 1 个 reviewer 批准（人类）
- 历史 commit 必须线性（squash 或 rebase）

---

## 6. Pull Request 规范

> 当前未启用 PR 流程。本节为将来启用做准备。

### 6.1 标题

沿用 commit 规范：`<type>(<scope>): 中文简述`

### 6.2 描述模板

```markdown
## 改动概要
（一两句话）

## 改动详情
- 列出关键变更点（与 commit 正文保持一致或合并）

## 验证步骤
1. 后端 `npm run dev` 启动
2. 前端 `npm run dev:pm2` 启动
3. 选择店铺 / 日期范围 → 查询
4. 检查 …

## 影响范围
- API：[如有]
- UI：[如有]
- 配置 / 环境变量：[如有]

## 截图 / 日志
（如适用）

Refs: #issue
```

### 6.3 合并策略

- 默认 **squash merge**（PR 内的所有 commit 合并为 1 个 commit 到 `main`）
- 重构类 PR 可选 **rebase merge**（保留每个 commit）

---

## 7. 代码风格与工程实践

### 7.1 前端（Vue 3 + JS）

- 全部使用 **Composition API + `<script setup>`**，不写 Options API
- 组件命名为 PascalCase（`DashboardView.vue`、`LineChart.vue`）
- 私有方法 / 变量 camelCase；常量 UPPER_SNAKE
- Props / emits 使用 `defineProps` / `defineEmits` 类型化
- 计算属性用 `computed`，副作用用 `watch` / `watchEffect`，DOM 副作用用 `onMounted`
- 模板中 class 合并用 `cn()`（来自 `lib/utils.js`），避免字符串拼接
- 优先使用 shadcn-vue 现有 UI 组件，避免自造轮子
- 引入 ECharts 必须**按需引入模块**（`echarts/core` + `echarts.use([...])`）
- 字符串统一使用**双引号** `"..."`
- 文件末尾保留**单个换行符**

### 7.2 后端（Node.js + Express）

- 使用 **CommonJS**（`require` / `module.exports`），与 `backend/package.json` 保持一致
- 路由集中在 `server.js`（小型项目）；如扩大会拆出 `routes/` 目录
- 异步统一使用 `async/await`，避免回调地狱
- 错误处理用 `try/catch` + `next(err)` 传到 Express 错误中间件
- 第三方依赖保持最小化（cors / express / exceljs / dayjs）
- 日志用 `console.log` / `console.error`（PM2 收集）；不引入额外日志库
- 配置 / 路径常量集中在 `config.js`

### 7.3 工程实践红线

- **不要**引入未经用户同意的依赖
- **不要**改动 `package-lock.json` 除非依赖本身有变更（`npm install <pkg>` 后提交）
- **不要**直接编辑 `dist/`（构建产物），先改源码再 `npm run build`
- **不要**把调试用的 `console.log` 留在生产代码（必要时改用注释）
- **不要**留 `TODO` / `FIXME` 不说明责任人

---

## 8. 文件与编码约定

- 所有源文件 **UTF-8 无 BOM**
- 行尾用 **LF (`\n`)**，不用 CRLF（PowerShell 默认可能产生 CRLF，编辑器需配置）
- 文件末尾保留**单个换行符**（POSIX 标准）
- 字符串引号统一使用**双引号** `"..."`（除非必须单引号）
- 缩进：**2 空格**（前端模板、JS、CSS、YAML、JSON 均如此）
- Tailwind class 顺序按 `@tailwindcss/order` 或 LLM 自然分组；同一文件内风格一致
- 删除文件用 `git rm`，不要只删文件不 `git add` 状态变更

---

## 9. 敏感文件与 .gitignore

### 9.1 严禁进入仓库的内容

| 内容 | 原因 |
|---|---|
| `.env` / `.env.local` / `.env.*` | 可能含数据库密码 / API key |
| `node_modules/` | 可由 `npm install` 重建 |
| `dist/` / `build/` | 构建产物，可由 `npm run build` 重建 |
| `*.log` | 运行时日志 |
| `ecosystem.config.js.prod` | 生产环境专属路径，不通用 |
| `拼多多销售报表/` 整个目录 | 商业数据 |

### 9.2 提交前自检

每次 `git status` 必须确认：**没有 `.env`、`node_modules`、`dist`、`*.log`、`ecosystem.config.js.prod`**。

如发现误带，立即 `git restore --staged <file>` 撤回，不要 commit。

---

## 10. 与用户沟通约定

### 10.1 语言

- 用户使用 **中文**，所有回复使用中文
- 代码注释使用中文（与代码内既有注释保持一致）
- commit message 中文为主，专有名词可保留英文

### 10.2 主动性原则

- **直接执行**：明确的小改、单文件修复、用户已给出完整指令 → 直接动手
- **先确认再动手**：涉及多文件 / 跨模块 / 设计取舍 / 破坏性操作 → 先列出"打算做什么"，确认后再执行
- **告知而非擅自**：推送失败 / 测试失败 / 依赖缺失 → 如实反馈，并给出 2~3 个可选方案

### 10.3 破坏性操作的强制确认

以下操作**必须先获得用户明确同意**才能执行：

- `git reset --hard`
- `git checkout .` / `git restore .`
- `git clean -fd`
- `git branch -D`
- `git push --force` / `--force-with-lease`
- `rm -rf` / `Remove-Item -Recurse -Force`（对仓库内目录）
- 改写 `.gitignore` 后 `git add -A`
- 切换 `main` 的历史（rebase 已推送的 commit）
- 删改 `/api/dashboard` 等关键接口的响应结构

### 10.4 失败时的反馈模板

```
❌ 操作失败：[操作名]
📍 失败位置：[文件 / 命令 / commit hash]
🔍 错误信息：[原文摘录]
💡 建议方案：
   1. [方案 A：...]
   2. [方案 B：...]
请告诉我选哪个，或者提供其他指示。
```

---

## 11. 测试与验收

### 11.1 当前测试现状

- 本项目当前**未引入自动化测试框架**（单元测试 / E2E）
- 验收依赖**人工在浏览器中验证**

### 11.2 Agent 必须做的人工验证清单

每次完成一个功能改动，Agent 在 commit 前应**自行**至少执行以下检查：

**后端改动**

- `cd backend && npm install`（新依赖时）
- `node -e "require('./src/server.js')"` 至少能加载（语法检查）
- 关键 API 用 `curl` 或 `http://localhost:9002/api/dashboard?shopName=...&startDate=...&endDate=...` 验证响应结构

**前端改动**

- `cd frontend && npm run build` 必须通过（语法 + 依赖完整性）
- 如有 TypeScript / ESLint 配置则通过 lint
- 浏览器打开 `http://localhost:8002/`，按用户需求逐项验证

### 11.3 未来引入测试时

- 前端：`vitest` + `@vue/test-utils`
- 后端：`jest` 或 `node:test`（Node 18+ 内置）
- E2E：`playwright`
- 在 `package.json` 加 `"test": "..."` 脚本
- CI 工作流：`.github/workflows/ci.yml`

---

## 12. 故障处理与降级

### 12.1 推送失败

| 错误 | 原因 | 处理 |
|---|---|---|
| `Permission denied (publickey)` | SSH 公钥未配置 | 提示用户在 GitHub 配置 SSH key |
| `Could not resolve host github.com` | 网络问题 | 提示用户检查网络 |
| `non-fast-forward` | 远端有新 commit | `git pull --rebase` 后再 push |
| `GH001: Protected branch update failed` | 主分支保护 | 提示用户走 PR 流程 |
| `RPC failed; HTTP 413` | 单文件 / 整批超过 100MB | 排查是否误带大文件，`git reset` 撤 commit |

### 12.2 冲突

- 优先 `git pull --rebase`，保持线性历史
- 冲突由**人类协作者**解决，不擅自处理
- Agent 遇到冲突应停止并报告

### 12.3 commit 写错

- **未 push**：
  - 改 message：`git commit --amend`
  - 撤回：`git reset --soft HEAD~1`（保留改动），再重 commit
- **已 push**：
  - message 错误：`git commit --amend` + `git push --force-with-lease`（需用户确认）
  - 内容错误：新建 `revert:` commit，不修改历史

### 12.4 代码错误导致无法启动

- 后端：用 `node --check src/server.js` 语法检查；用 `console.log` 缩窄问题
- 前端：`npm run build` 找报错；删除 `node_modules` 重新 `npm install` 作为兜底
- 回退方案：`git revert HEAD` 或 `git reset --hard HEAD~1`（需用户确认）

---

## 13. 常见任务清单

### 13.1 新增前端页面

1. `frontend/src/views/<Name>View.vue`
2. `frontend/src/App.vue` 加路由分支（如未启用 vue-router 则用 `activeKey`）
3. `frontend/src/components/ui/` 缺啥补啥（沿用 shadcn-vue 风格）
4. `git add frontend/src/views/<Name>View.vue frontend/src/App.vue`
5. commit：`feat(frontend): 新增 <Name> 页面`
6. push

### 13.2 新增后端 API

1. `backend/src/server.js` 加路由
2. 必要时 `backend/src/excel.js` / `config.js` 扩展
3. `git add backend/src/`
5. commit：`feat(backend): 新增 /api/<path> 接口`
6. push

### 13.3 修改前端组件样式

1. 改 `frontend/src/components/<Name>.vue` 模板 / `<style scoped>` / class
2. commit：`style(frontend):<Name>: <改动概要>`
3. push

### 13.4 修复 bug

1. 复现 → 定位 → 修复 → 自验
2. commit：`fix(<scope>): <中文简述>`
3. 正文写**根因**与**修复思路**
4. push

### 13.5 升级依赖

1. `npm install <pkg>@latest`（frontend 或 backend）
2. 验证 build / dev 仍能启动
3. commit：`chore(<scope>):deps: 升级 <pkg> 至 <version>`
4. push

---

## 14. 自检清单（每次 commit 前必过）

```
[ ] 当前终端 PWD 是 代码/？（git rev-parse --show-toplevel 应输出代码/ 路径）
[ ] 改动文件已逐个 git add，未用 git add -A / git add .
[ ] git status 中没有 .env / node_modules / dist / *.log / ecosystem.config.js.prod
[ ] commit message 是 <type>(<scope>): 中文简述 格式
[ ] 标题 ≤ 72 字符，无句号
[ ] 正文列出关键改动点（why，不是逐行 diff）
[ ] 涉及的源文件以 LF 结尾、UTF-8 无 BOM
[ ] 前端改动：npm run build 通过
[ ] 后端改动：node --check src/*.js 通过；接口 smoke test 通过
[ ] git commit 已执行，hash 已记录
[ ] git push 已执行，输出含 "main -> main"
[ ] git status 显示 working tree clean
[ ] git log -1 与 origin/main 一致
```

---

## 15. 变更日志

| 日期 | 变更 | 作者 |
|---|---|---|
| 2026-09-03 | 新建 `AGENTS.md`（基于 `agent.md`），明确仓库根、commit 规范、推送要求 | Claude |
| 2026-09-03 | `agent.md` → `AGENTS.md` 重命名（Git rename，100% 相似） | Claude |
| 2026-09-03 | 全面重写 `AGENTS.md`，按业内标准补全 §1–§15 共 15 个章节 | Claude |

---

> **阅读完毕即视为承诺遵守本文档全部约束。**
> 如对某条规则有异议或建议优化，请直接在本文件提 PR。