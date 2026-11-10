# CLAUDE.md

本文件是给新 Claude Code 会话的项目交接说明。**仓库是自包含的**：先读完本文件，再读 `PROGRESS.md` 和 `README.md`，然后看代码。不要依赖仓库外的会话记忆或临时文件。

## 项目一句话

passmgmt：本地优先的加密资源库网页应用。数据存成单个 `.vault` 文件，密码解密后查看/修改，重新加密导出新文件。纯前端、无后端；中文界面；桌面优先，后续做 iOS 可用的 HTTPS PWA；不做 App Store 签名、不做云同步。

## 阅读顺序

1. 本文件：原则、约束、当前状态、下一步、操作陷阱。
2. `PROGRESS.md`：详细功能清单、验证状态、已知限制、代码入口。
3. `README.md`：用户视角的使用说明、字段类型、KeePass 导入、移动端。
4. `src/vault/model.ts`：数据模型。
5. `src/state/useVaultApp.ts`：全部状态与动作。

## 不可违背的设计原则（用户原话）

> 工具只做简单的事情，不为任何事情兜底，区分面向用户还是面向开发者，对于用户来说，需要一个可靠的心智模型，错误的输入导致的错误输出用户会自己看懂并负责，对应的，用户也可以使用输入得到自己想要的输出，因为用户知道你是怎么工作的

落地含义：

- 不做自动纠错、静默降级、隐藏默认值、"以防万一"的魔法。
- 不拦截关闭页面、不自动清剪贴板、不自动压缩、不设隐藏上限。
- 错误和状态（已保存/未导出、当前模式）直接、显式呈现。
- 唯一例外是密码学正确性：认证失败必须拒绝，不返回可疑数据。
- 面向用户和面向开发者分开：用户界面要可预测；内部实现可以直白，不为"友好"隐藏机制。

## 当前状态（2026-11-11）

已实现：

- 创建/导入/导出 `.vault`；Argon2id + AES-256-GCM；分块加密与 AAD 完整性。
- 条目、文件夹、内置模板与用户模板。
- 字段类型：`text / password / totp / file`。
- 密码生成器（点生成先弹配置界面）、密码掩码 + 眼睛切换。
- TOTP 实时验证码（裸 Base32 / `otpauth://` URI，SHA1/256/512，6/8 位）。
- 图片缩略图直接预览；其他附件下载/更换/清除。
- KeePassXC / KeePass 1.x CSV 导入（含预览、错误提示）。
- 移动端 `≤760px` 列表全屏；编辑时左侧抽屉切换条目/文件夹，遮罩或「返回」回列表；顶部用 safe-area 实色条避免 iOS 主屏状态栏模糊。
- 单文件构建：`npm run build:single` 产出 `dist-single/passmgmt.html`，JS/CSS/WASM/Worker 全内联；已在 Edge `file://` 下通过创建/导出/导入 E2E。
- PWA 构建：`npm run build:pwa` 产出 `dist-pwa/`（manifest、图标、Service Worker）；已实测 Service Worker 注册、缓存全部资源、断网重载、断网创建库。
- 60 个单元测试、`tsc`、构建、桌面/移动 Playwright E2E 均通过。

详细清单、验证结果和限制见 `PROGRESS.md`。

## 运行与验证

```bash
npm install
npm run dev        # 默认 http://localhost:5173
npx tsc --noEmit
npm test           # 60 tests
npm run build
npm run build:single  # dist-single/passmgmt.html（单文件）
npm run build:pwa     # dist-pwa/（PWA 静态目录）
```

必须通过 `http://` 或 `https://` 访问；不能直接双击 `dist/index.html`（`file://` 下 WebCrypto 不可用）。

改完代码后的最小验证：

1. `npx tsc --noEmit && npm test && npm run build`
2. 冒烟：新建库 → 用模板建条目 → 生成密码 → 填 TOTP → 导出 → 锁定 → 导入 → 内容还原。
3. 移动端 390×844：列表 ↔ 编辑、返回按钮、顶栏不横向溢出。

## 关键约束

- **开发阶段**：`.vault` 数据格式不保证向后兼容；不要主动加迁移/兼容代码，除非用户明确要求。
- **文件优先**：`.vault` 是唯一权威数据源；不做站点存储、自动保存、后台同步。
- **不要自己实现密码学原语**：只使用 WebCrypto 和 `hash-wasm`；不要引入新的加密库。
- **导入合并、不查重**：重复导入会产生重复条目；文件夹按名称复用；删除文件夹只把条目移到「未分组」。
- **字段类型显式**：不要按字段名猜密码/TOTP；模板和导入负责设置类型，用户可改。
- **文件字段永远可以为空**：是否存附件由用户决定，工具不替用户解释。
- **TOTP 验证码不落库**：只存密钥，验证码实时计算。
- **中文 UI**：所有用户可见文案用中文。
- **最小依赖**：新增依赖前先确认必要性；目前运行时依赖只有 `react`、`react-dom`、`hash-wasm`。
- **样式集中在 `src/styles.css`**：没有 CSS 框架。移动端规则在文件末尾，必须放在基础样式之后，否则会被覆盖。

## 代码地图

- `src/crypto/`：`kdf.ts`（Argon2id）、`aead.ts`（分块 AES-GCM）、`keys.ts`（KEK/DEK）、`password.ts`（密码生成）、`totp.ts`（TOTP）、`argon2*`（Worker）、`bytes.ts`（BufferSource 类型适配）。
- `src/vault/`：`model.ts`（类型）、`format.ts`（文件头）、`container.ts`（manifest+blob 打包/校验）、`vault.ts`（创建/打开/导出）、`builtinTemplates.ts`、`templates.ts`、`keepassCsv.ts`。
- `src/state/useVaultApp.ts`：会话、条目、文件夹、模板、CSV 导入、密码选项、通知。
- `src/ui/`：`Welcome`、`Workspace`、`ItemEditor`、`FieldRow`、`TemplatePicker/Manager/Editor`、`CsvImportDialog`、`PasswordGeneratorDialog`、`TotpCode`、`PromptDialog`、`icons`。
- `pwa/`：manifest、Service Worker 模板、注册脚本、PNG 图标。
- `.github/workflows/deploy-pages.yml`：GitHub Pages 构建与发布工作流；`configure-pages` 带 `enablement: true`。若报 `Get Pages site failed`，先在 Settings → Pages 把 Source 设为 GitHub Actions；首次启用后可能还要重跑一次（站点创建有传播延迟）。私有仓库需要套餐支持，否则改为 public 或换 Cloudflare Pages。
- `scripts/build-single.mjs` / `scripts/build-pwa.mjs`：单文件和 PWA 的后处理脚本。
- `tests/`：Vitest 单元测试。

## 下一步（按优先级）

1. **远程仓库**：等待用户提供地址后 `git remote add origin <url> && git push -u origin main`。本机没有 `gh` CLI。
2. **iOS 真机验证**：PWA 构建和 GitHub Pages 工作流已完成，下一步是在真实 iPhone Safari 验证「添加到主屏幕」、导入/导出、TOTP。iOS Safari 没有 File System Access API，保存是新下载。单文件 HTML 在 iOS 上只能尝试通过 Files/Safari 打开，可靠性不保证；PWA 是稳定路线。
3. **Bitwarden 未加密 JSON 导入**：格式已调研（8 种条目类型、Passkey、加密导出检测），用户此前暂缓；要做时先确认范围。
4. **未支持的导入**：KeePass `.kdbx` / XML、Bitwarden `.zip` 附件。
5. **导入查重**：未实现；如需要按来源 ID 去重，需要给条目增加隐藏来源 ID。
6. **安全/便捷功能**：自动锁定、剪贴板清理等未做。
7. **真机测试**：目前只有 Edge 移动模拟，未在真实 iOS / Android 设备上验证。

## 已知操作陷阱

- **Vite HMR 缓存**：大规模重写组件后可能报 `does not provide an export named ...`。处理：结束所有 passmgmt 的 node 进程 → 删除 `node_modules/.vite` → 重启 `npm run dev`。
- **后台 npm 子进程**：父进程被杀后子进程可能仍占着 5173。用进程命令行筛选 `*passmgmt*` 清理，再 `--strictPort` 启动。
- **CSP**：生产 CSP 在 `vite.config.ts` 的 `inject-csp` 插件里只在 build 注入；需要 `script-src 'self' 'wasm-unsafe-eval'` 和 `connect-src 'none'`。
- **WebCrypto 类型**：字节数组传给 WebCrypto/Blob 时用 `src/crypto/bytes.ts` 的 `toBufferSource`，避免 TypeScript 的 `ArrayBufferLike` 报错。
- **测试数据**：E2E 脚本此前在仓库外临时目录运行，未提交；仓库内的自动化验证是 `npm test` + 手动冒烟清单。
- **单文件构建**：`scripts/build-single.mjs` 负责把 Vite 产物内联成 `passmgmt.html`；Worker 通过 `?worker&inline` 内联。单文件版 CSP 允许 `'unsafe-inline'`，普通/PWA 构建仍用严格 CSP。
- **移动端抽屉过渡**：`transition: transform` 只加在 `.workspace-body.editing.drawer-animate .sidebar` 上；不要直接加在 `.editing .sidebar`，否则从全屏列表进入编辑时整块白色列表会滑出去。
- **PWA 更新白屏**：`pwa/sw.js` 的导航请求必须 network-first，安装预缓存用 `cache: 'reload'`，避免旧 HTML 指向新/旧哈希资源。用户若已白屏，清除该站点 Website Data 后重新打开；不要在部署窗口刷新。
- **iOS 顶部安全区**：`index.html` 使用 `viewport-fit=cover`；`.app` 用 `env(safe-area-inset-top)` 留白，`.app::before` 画实色条；修改时不要移除，否则 PWA 状态栏会透出内容并出现模糊。
- **PWA 构建**：`pwa/sw.js` 是简单的 cache-first Service Worker，构建时把资源清单和构建时间写入；`manifest.json`、`register-sw.js`、SW 缓存都使用相对路径，因此可部署在站点根目录或任意子路径（GitHub Pages 项目站点）。PWA 的 `theme-color` 按浅色/深色分别注入。

## Git

- 本地 `main` 分支；最近提交见 `git log --oneline`。
- 没有 remote；`gh` 未安装。
- 提交信息末尾按项目约定加：
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## 协作偏好

- 用户使用中文；回答、文档、提交说明尽量用中文/简洁英文。
- 用户重视可预测、显式的行为；不要用"智能"推断替代用户选择。
- 功能范围由用户确认；不要擅自扩大范围或添加兜底。
