# Agent 协作规范（pdd-sales-report）

本文件供接手本项目的 AI Agent / 协作者阅读，明确开发与版本管理约定。

---

## 1. 仓库与远程

- **Git 仓库根目录**：`e:\秀水泱泱开发\pdd-sales-report\代码`
  - 注意：项目根 `e:\秀水泱泱开发\pdd-sales-report` **不是** Git 仓库
  - Git 初始化在 `代码/` 子目录
- **GitHub Remote**：`git@github.com:jiahaowu-git/pdd-sales-report.git`
  - 已配 upstream，分支：`main` ↔ `main`
- **推送方式**：SSH（公钥需已加入 GitHub 账号）

常用命令参考：

```bash
cd e:/秀水泱泱开发/pdd-sales-report/代码
git status
git log --oneline -10
git remote -v
```

---

## 2. 每次改动必须：本地提交 + 推送到 GitHub

**强约束**：任何代码改动完成后，必须：
1. 在 `代码/` 目录下 `git add` 相关文件
2. `git commit` 写入规范的 commit message
3. `git push` 推送到 `origin/main`

> 防止本地与远程长期分叉，方便回溯与跨设备协作。

### 不要做

- 不要把 `git add .` / `git add -A` 用于批量提交——会误带 `.env`、构建产物等敏感文件
- 不要在 commit message 里写 "update"、"fix bug" 这种无意义描述
- 不要在未与用户确认前 `--force` 推送
- 不要跳过 push（除非推送失败并已告知用户等待处理）

---

## 3. Commit 规范（沿用仓库既有风格）

格式：`<type>(<scope>): <中文简述>`

### Type

- `feat` 新功能
- `fix` 修复 bug
- `refactor` 重构（非新功能、非 bug 修复）
- `perf` 性能优化
- `style` 样式调整（不影响逻辑）
- `docs` 文档 / 注释
- `chore` 杂项（依赖、配置）

### Scope

- `frontend` Vue 前端整体改动
- `backend` Node 后端整体改动
- 必要时细到文件：`frontend:LineChart`、`backend:excel.js` 等

### Commit message 写法

- 标题行 ≤ 72 字符，使用中文简述
- 空一行后写正文，逐条列出关键改动点（用 `-` 开头）
- 正文不写 "what" 以外的内容冗述，关注 "why" 与变更要点

### 拆分粒度

- 一次任务内按"模块 / 职责"拆分多个 commit
- 同一文件若涉及多种独立职责（如样式 + 逻辑 + 重命名），按职责分别提交
- 一次 commit 只动一类改动，便于 `git revert` / `git bisect`

**示例**：

```
feat(backend): Dashboard API 商品图新增 ROI/百分数列与推广名称

- excel.js: 新增商品图百分数列解析与 productNameByDate 记录
- server.js: 商品图改为 5 个系列，百分数 ×100
- server.js: 店铺总图新增店铺ROI/推广ROI 双 Y 轴序列
- server.js: chartByProduct 每项附带 promotionName
```

---

## 4. 文件与编码注意

- 所有源文件使用 **UTF-8 无 BOM**
- 文件末尾保留**单个换行符**（`\n`），不要写成 CRLF 后无换行
- 字符串引号优先双引号 `"..."`，与项目现有文件保持一致
- 不要在 commit 中加入 `node_modules/`、`dist/`、`.env`、`*.log` 等（仓库已有 `.gitignore` 覆盖）

---

## 5. 与用户协作约定

- 用户使用中文，所有回复使用中文
- 涉及多文件改动时，先列出"计划拆分几个 commit、每个 commit 改什么"，再执行
- 推送失败（鉴权、网络、远端拒绝 non-fast-forward）必须如实告知，并给出可选方案
- 任何"清空工作区"、"reset --hard"、"删除未跟踪文件"等破坏性操作必须先获得用户确认

---

## 6. 快速自检清单（每次 commit 前）

- [ ] 当前目录是 `代码/`？
- [ ] 改动文件已全部 `git add`？
- [ ] 没有误带 `.env` / `node_modules` / `dist` / `.log`？
- [ ] commit message 符合 `<type>(<scope>): 中文简述` 格式？
- [ ] 正文列出了关键改动点？
- [ ] 提交后立即 `git push`？
- [ ] `git status` 显示 `working tree clean` 且与 `origin/main` 一致？

---

最后更新：2026-09-03