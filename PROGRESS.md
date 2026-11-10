# passmgmt 进度记录

最后更新：2026-11-11

## 项目目标

本地优先的加密资源库网页应用：

- 数据存成单个 `.vault` 文件；密码解密后查看/修改，重新加密导出新文件。
- 纯前端、无后端；当前桌面优先，后续做 iOS 可用的 HTTPS PWA。
- 中文界面；不做 App Store 签名上架；不做云同步。

## 已完成

- **加密**：Argon2id（64 MiB / t=3 / p=1）→ KEK → 解封 DEK；AES-256-GCM 分块加密；文件头作为 AAD；分块 AAD 绑定序号、flags、明文长度；密码错误或文件损坏显式失败。
- **文件格式**：`.vault` 单文件；manifest + blob 区；包含 items / folders / templates / blobs。
- **条目**：名称、描述、文件夹、字段；字段类型为 `text / password / totp / file`。
- **模板**：16 个内置模板（账号、金融、证件、生活）；用户自定义模板；模板只拷贝字段结构，不预填值。
- **文件夹**：新建、重命名、删除；条目移动；删除文件夹只把条目移到「未分组」。
- **密码生成器**：长度 6–64、大小写/数字/符号、排除易混淆字符、预设；点「生成」先弹配置界面，确认后填入；密码字段默认掩码，眼睛图标切换显示。
- **TOTP**：支持裸 Base32 和 `otpauth://` URI；SHA1 / SHA256 / SHA512；6/8 位；30/60 秒；实时验证码、倒计时、复制；验证码不落库。
- **附件**：图片显示缩略图，点击直接预览；其他文件下载/更换/清除；文件字段始终允许为空。
- **导入 CSV**：支持 KeePassXC CSV 与 KeePass 1.x/2.x CSV；解析双引号与反斜杠转义、BOM、CRLF、多行字段；`Group` → 文件夹，`Notes/Comments` → 描述，`Password` / `TOTP` 自动带字段类型；导入前有预览。
- **导出/导入 `.vault`**：重新加密导出；导入解密；未导出状态显式显示。
- **移动端**：`≤760px` 单栏主从切换（列表 ↔ 编辑 + 返回按钮）；顶栏图标按钮；触控目标约 40px；触屏上文件夹操作常显。
- **界面**：浅色/深色模式、内联 SVG 图标、模板选择/管理弹窗、CSV 导入预览、成功/错误提示。

## 当前验证

- `npm test`：**60 个测试全部通过**（加密、容器、格式、模板、KeePass CSV、密码生成、TOTP RFC 6238）。
- `tsc --noEmit`、`npm run build` 通过。
- Playwright + Edge：
  - 桌面：模板、密码生成、TOTP、图片预览、KeePass CSV 导入、导出 → 锁定 → 导入还原；控制台 0 错误。
  - 移动 390×844：无横向溢出；列表 ↔ 编辑切换、返回按钮、触控尺寸；控制台 0 错误。

## 运行

```bash
npm install
npm run dev      # 默认 http://localhost:5173
npm test
npm run build
npm run preview
```

必须通过 `http://` 或 `https://` 访问，不能直接双击 `dist/index.html`（`file://` 下 WebCrypto 不可用）。

## Git

- 本地仓库，`main` 分支。
- 提交：
  - `8e03c06` Add mobile master-detail layout
  - `7e854ac` Add typed fields, password generator and live TOTP
  - `452e54c` Add KeePass CSV import
  - `14de6e2` Add templates, folders and empty file fields
  - `700985b` Initial commit
- **没有配置 remote**；本机没有 `gh` CLI。要推送需提供仓库地址。

## 关键决策

- 文件优先：`.vault` 是唯一权威数据源；不做站点存储、自动保存、后台同步。
- 开发阶段不保证数据格式向后兼容。
- 模板只定义结构，不预填值；字段类型显式，不靠字段名猜。
- 导入合并到当前库，不查重；文件夹按名称复用；重复导入会产生重复条目。
- 删除文件夹不删条目，只移到「未分组」。
- 私有语义由用户决定：文件字段永远可以为空。
- 设计原则：**工具只做简单的事，不为任何事情兜底**（见长期记忆 `design-principle-simple-no-fallback`）。

## 尚未完成 / 后续

1. **推送远程仓库**：等待用户提供地址。
2. **PWA / iOS**：manifest、service worker、图标、离线缓存；在真实 iPhone Safari 上验证「添加到主屏幕」、导入/导出、TOTP。
3. **Bitwarden JSON 导入**：已调研格式（8 种条目类型、Passkey、加密导出检测），用户暂缓。
4. **未支持的导入**：KeePass `.kdbx` / XML、Bitwarden `.zip` 附件、KeePass CSV 附件。
5. **导入查重**：未实现；如需要按来源 ID 去重，需要给条目增加隐藏的来源 ID。
6. **安全/便捷功能未做**：自动锁定、剪贴板清理、密码强度提示。
7. **真机测试**：目前只用 Edge 做过移动模拟，未在真实 iOS / Android 设备上验证。

## 已知限制

- 密码丢失不可恢复（没有恢复密钥）。
- 内存中的明文无法彻底清除，不做「零残留」承诺。
- 每次导出重写整库；超大库会变慢或内存不足。
- TOTP 依赖设备时钟；设备时间错误会导致验证码错误。
- 密码生成器设置仅会话级，刷新或锁定后回到默认。
- 图片缩略图会创建 object URL，组件卸载时回收。

## 代码入口

- `src/crypto/`：Argon2id、分块 AES-GCM、密钥包装、密码生成、TOTP。
- `src/vault/`：数据模型、内置模板、KeePass CSV 解析、`.vault` 头格式/容器、创建/打开/导出。
- `src/state/useVaultApp.ts`：会话、条目、文件夹、模板、CSV 导入、密码选项。
- `src/ui/`：欢迎页、工作区、条目编辑、字段行、模板选择/管理/编辑、CSV 导入、密码生成、TOTP。
- `tests/`：60 个单元测试。
