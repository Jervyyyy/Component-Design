---
name: iphone-duo-adapt
description: 把直板机（普通 iPhone）Figma 设计稿适配成 iPhone DUO 折叠屏稿（01 外屏 outerPortrait / 02 内屏竖屏 innerPortrait / 03 内屏横屏 innerLandscape）。先给推荐方案和按开发难度降级的备选方案（通常是通栏适配）示意图，设计师确认后生成适配稿，放在直板机稿旁边或设计师指定的位置。Use when someone shares a Figma frame link and asks to adapt / 适配 it to iPhone DUO, 折叠屏, foldable, outer/inner screen, or to generate / 输出 DUO 适配稿 or 适配方案.
---

# iPhone DUO 适配（直板机稿 → DUO 适配稿）

用 Figma MCP 的 `use_figma` 执行本目录下两个脚本来驱动：
`scripts/analyze.js`（只读，分析直板机稿）和 `scripts/generate.js`（写入，生成方案示意图或最终适配稿）。
规则和方案怎么选见 `reference/duo-rules.md`。路径均相对本 skill 目录 `.claude/skills/iphone-duo-adapt/`。

## 需要设计师提供

1. **直板机设计稿**：一屏 frame 的 Figma 链接（带 `node-id`）。只给文件链接、或选中的是 Section / Group 时，先让设计师给出具体 frame。
2. （可选）**输出位置**：一个 Section / Frame 的链接，或「某页某坐标」。不提供就默认放在直板机稿旁边。

## 前置

- Figma MCP 已连接。拆链接：`/design/<fileKey>/...?node-id=1-2` → `fileKey`、`nodeId = "1:2"`。
- 先 `create_session(fileKey)`，后续每个 Figma 工具都带返回的 `sessionId`。
- 调 `use_figma` 前加载 `figma-use` skill；写入调用（generate）再加载 `figma-generate-design`，`skillNames` 传 `figma-use,figma-generate-design`。
- 改了脚本后本地先跑语法检查（脚本是带顶层 `await`/`return` 的 use_figma 代码，检查器会包一层再编译，并确认 `PARAMS` 是单行）：

```bash
node .claude/skills/iphone-duo-adapt/scripts/check.mjs
```

## 流程（agent 路径）

**调用方式**：读出脚本全文，只替换第 4 行左右的 `const PARAMS = ...;` 这一行（单行 JSON），整段作为 `use_figma` 的 `code`。脚本约 9k / 29k 字符，低于 50k 上限。

### 1. 分析直板机稿（只读）

`analyze.js` 的 PARAMS：

```js
const PARAMS = { sourceId: "9821:71286" };
```

返回：`guess`（pageType / layoutType / hasBottomBar / 原页边距）、`nav`（是否 TDS NavigationBar）、`bottomBar`、`blocks`（内容块及 kind：card / hscroll / media / text）、`repeatGroups`（可网格化的同构项，带 `parentId` + `itemIds`）、`images`、`fixedNarrow`、`overlays`、`warnings`。
同时用 `get_screenshot` 看一眼原稿（长页面用 `maxDimension` 1400）。

### 2. 定方案（推荐 + 备选）

按 `reference/duo-rules.md` 第 3 节决策表，为 01/02/03 各定一个推荐方案、一个降级备选方案（通常是通栏单栏）。约束：
外屏和内屏横屏的 VB 处理必须一致（推荐行都 `vb:"B"`，备选行都 `vb:"A"`）；`grid` / `split` 只能引用 analyze 返回的节点 id。

### 3. 出方案示意图 → 等设计师确认

`generate.js`，`mode: "proposal"`。每屏裁成一屏高（678 / 951 / 669），上下两行 = 推荐 / 备选，默认放在直板机稿所在顶层节点**下方**的空位。实测通过的 PARAMS（规范文件「多目的地 - 首次进入」）：

```js
const PARAMS = {"sourceId":"9821:71286","mode":"proposal","target":null,"layoutType":"card","header":["页面判定：pageType = secondary（非一级页，无全局导航）· layoutType = card · hasBottomBar = false · 无浮层 / 底部提示条","通用：标题栏头部 84（24 + 48 + 12），返回按钮与标题左对齐；控件 / 图标 / 文字保持直板机尺寸，只加宽不放大；页边距按第 5 节断点取值（直板机本页为 12）","Vertical Bar：外屏与内屏横屏须统一 —— 推荐「方式 B 内容避让、背景延伸」，备选「方式 A 整体避让、VB 置白」"],"rows":[{"tag":"推荐方案","forms":[{"form":"outer","vb":"B","title":"01 外屏 outerPortrait · 方式 B","notes":["内容区 382（466 − VB 84），单栏结构与直板机一致","AI 背景延伸到 Vertical Bar 下方"]},{"form":"innerPortrait","title":"02 内屏竖屏 innerPortrait · 对比项双列","grid":[{"parentId":"9821:71306","itemIds":["9821:71308","9821:71309"],"columns":2},{"parentId":"9821:71311","itemIds":["9821:71313","9821:71314"],"columns":2},{"parentId":"9821:71316","itemIds":["9821:71318","9821:71319"],"columns":2}],"notes":["「Based on what matters to you」中 Tokyo / Osaka 并排对比","标题栏右侧避让 Reserved Region（151）","开发成本：中（对比项改为横向两列）"]},{"form":"innerLandscape","vb":"B","title":"03 内屏横屏 innerLandscape · Main–Support 分栏","split":{"mode":"mainSupport","secondaryIds":["9821:71303"]},"notes":["主栏：标题、城市卡、My Pick、追问；次栏：「Based on what matters to you」详细对比","标题栏只覆盖主栏，两栏各自滚动","开发成本：高（分栏容器 + 状态保持）"]}]},{"tag":"备选方案","forms":[{"form":"outer","vb":"A","title":"01 外屏 outerPortrait · 方式 A","notes":["整页避让 Vertical Bar，VB 区域置白","开发成本：低"]},{"form":"innerPortrait","title":"02 内屏竖屏 innerPortrait · 通栏拉伸","notes":["结构与直板机完全一致，卡片拉伸到版心 621","开发成本：最低"]},{"form":"innerLandscape","vb":"A","title":"03 内屏横屏 innerLandscape · 通栏单栏","notes":["不分栏，内容区 867（避让 VB），版心 803","与外屏同为方式 A，VB 置白","开发成本：低"]}]}]};
```

跑完 `get_screenshot(sectionId)` 检查（看标题栏、VB/Reserved Region、网格、有无裁切异常），然后在对话里用表格列出 01/02/03 的推荐 vs 备选（做法、开发成本、风险），用 `AskUserQuestion` 让设计师选：全部推荐 / 全部备选 / 按屏混选 / 修改。**确认前不要出最终稿。**

### 4. 生成 DUO 适配稿

`mode: "final"`，只用 `rows[0]`——把设计师确认的三屏配置放进去（可以混搭推荐和备选）。整页高度跟随内容（原稿高 ≤ 940 的单屏稿保持设备高度），附「适配说明」卡（`notes` + 自动记录的改动 + 警告）。

- 默认：放在直板机稿所在顶层节点**右侧**的空位（会跳过已有节点，不会重叠）。
- 设计师指定位置：`"target":{"nodeId":"<Section 或 Frame id>"}`（Section 内会新建子 Section 并自动撑大父 Section；可加 `"x","y"`），或 `"target":{"pageId":"<页面 id>","x":0,"y":0}`。

实测通过的两组 PARAMS（规范文件 · 推荐方案放旁边；测试文件 · 备选方案放进指定 Section）：

```js
const PARAMS = {"sourceId":"9821:71286","mode":"final","target":null,"layoutType":"card","rows":[{"tag":"推荐方案","forms":[{"form":"outer","vb":"B"},{"form":"innerPortrait","grid":[{"parentId":"9821:71306","itemIds":["9821:71308","9821:71309"],"columns":2},{"parentId":"9821:71311","itemIds":["9821:71313","9821:71314"],"columns":2},{"parentId":"9821:71316","itemIds":["9821:71318","9821:71319"],"columns":2}]},{"form":"innerLandscape","vb":"B","split":{"mode":"mainSupport","secondaryIds":["9821:71303"]}}]}],"notes":["设计师确认：推荐方案（外屏方式 B · 内屏竖屏对比项双列 · 内屏横屏 Main–Support 分栏）","外屏与内屏横屏统一为方式 B：内容避让 Vertical Bar，背景延伸"]};
```

```js
const PARAMS = {"sourceId":"1:2","mode":"final","target":{"nodeId":"1:1556"},"layoutType":"card","rows":[{"tag":"备选方案","forms":[{"form":"outer","vb":"A"},{"form":"innerPortrait"},{"form":"innerLandscape","vb":"A"}]}],"notes":["设计师确认：备选方案（通栏适配，开发成本最低）"]};
```

最后 `get_screenshot(sectionId)` 复核，向设计师汇报返回的 `applied` / `warnings`、各 frame id，并问是否删除第 3 步的方案示意图 Section。

## generate.js PARAMS 字段

| 字段 | 说明 |
|---|---|
| `sourceId` | 直板机 frame id（FRAME / COMPONENT / INSTANCE；Section、Group 不行） |
| `mode` | `"proposal"` 方案示意图 / `"final"` 适配稿 |
| `target` | `null` = 放旁边；`{nodeId[,x,y]}`；`{pageId,x,y}` |
| `layoutType` | `"card"` / `"fullBleed"`，决定默认页边距（用 analyze 的 `guess.layoutType`） |
| `header` | proposal 顶部说明行（页面判定、通用规则、VB 方式） |
| `notes` | final 适配说明卡里的额外说明 |
| `rows[].tag` | `"推荐方案"`（蓝标签）/ `"备选方案"`（灰标签） |
| `rows[].forms[]` | 每屏一项：`form`（`outer` / `innerPortrait` / `innerLandscape`），`vb`（`"B"`/`"A"`，仅外屏和内屏横屏），`margin`（覆盖默认边距，简化方案填 20），`grid`（`[{parentId,itemIds,columns,gap?}]`），`split`（仅内屏横屏：`{mode, secondaryIds, detailSourceId?, primaryWidth?, secondaryMargin?}`），`ratio34`（默认 true），`title` / `notes` / `summary`（文案） |
| `keys` | 覆盖组件 key（库换版本时用），默认见脚本顶部 `KEYS` |

## 脚本自动做了什么

克隆原稿（不改原稿）→ 窗口加宽到 466 / 669 / 951 → 内容避让 VB（根 paddingRight +84）→ 页边距按断点替换 → 原本撑满父级的固定宽节点改为 FILL → 标题栏换成 DUO 头部 → 按配置网格化 / 分栏 → 窄卡片图片 3:4 → 加 Vertical Bar（方式 A 再垫白条）或 Reserved Region → 标注与说明。

## Gotchas

- **DUO 标题栏不是独立组件**：就是 TDS `NavigationBar · theme=default, type=basic`（key `1b79ad4a…`）加覆盖——隐藏 StatusBar、paddingTop 12、固定高 84、居中、标题 `.Title` 左对齐、左右 padding = 边距 + 40、leading padding = 边距。`importComponentByKeyAsync` 拿到的是直板机样式（带状态栏、标题居中、高 106），必须由脚本补这些覆盖。
- **原标题栏的覆盖要搬过去**：原稿 NavigationBar 常隐藏了标题、换了右侧图标、背景透明。脚本按 `overrides` 逐条回放；覆盖 id 形如 `I<实例id>;<子层id>`（带前缀 `I`）。隐藏的子层默认取不到——必须先 `figma.skipInvisibleInstanceChildren = false`，否则隐藏的标题会重新出现。
- **Pane controls（Vertical Bar）、竖向 Status bar、Hinge 没有发布**：按 key 导入报 `Component with key "…" not found`。脚本退而在当前页找同 key 的实例复用（规范文件里有）；业务文件里找不到就画矢量复刻（图层名带「（复刻）」），并在警告里注明。
- **Pane controls 默认带业务按钮**（Controls slot 里的心形、邮件等），模板里是空 spacer；脚本会隐藏 `Controls`，只留摄像头 / 时间 / 信号。
- **往自动布局里插入含文字的实例会报** `in appendChild: unloaded font "Trip-Inter Variable Medium"`：脚本先 `loadNodeFonts` 原稿和新实例的全部字体。
- **聊天类页面根节点是底部对齐**（`primaryAxisAlignItems: MAX`），裁成一屏高时只露出页面底部。proposal 模式会强制顶部对齐；final 模式高度跟随内容，不受影响。
- **网格目标在组件实例内部时改不了布局**（实例子层不能改 layoutMode），会出警告，需要设计师手动处理或先 detach。
- **3:4 规则只自动处理横向卡片里的图**（图在左、文字在右）；纵向卡片里的图只报警告，让设计师确认。
- **浮层 / 提示条 / 对话框不会自动改**：按 `duo-rules.md` 第 2 节在说明里提醒。
- **use_figma 每次都从第一页开始**：脚本里只 `setCurrentPageAsync` 一次（切到直板机稿所在页）。输出到别的页用 `target.pageId`。
- **组件复用只搜当前页**（不能遍历所有页面），所以规范文件以外的业务文件基本都会走矢量复刻。
- **跑完后核对原稿标题栏高度**：首次在规范文件里跑完后，同页 6 张直板机稿的 NavigationBar 实例从 102 变成 106（内层 40 → 44，实例的高度覆盖被重置）。脚本只写克隆和新实例，但 `importComponentByKeyAsync` 会把最新版 NavigationBar 带进文件，不能排除是它触发的（也可能是同时有人接受了库更新）。生成后看一眼原稿，有变化就提醒设计师用版本历史核对。

## Troubleshooting

- **`组件 paneControls / statusBar / hinge 无法导入…已用矢量复刻代替`**：库组件未发布，属预期。想用真组件：把规范文件里的 NavigationSplitView 模板实例拖一份到直板机稿所在页再重跑，或在 `keys` 里传已发布的 key。
- **示意图里看到的是页面底部、标题栏不见了**：说明用的是旧脚本；当前 `generate.js` 在 proposal 模式会把根节点改为顶部对齐。
- **标题栏出现「Title」或右侧图标变成默认图标**：覆盖没回放成功，检查原稿标题栏是否 TDS NavigationBar（analyze 的 `nav.comp.key` 应为 `1b79ad4a…`）；不是的话脚本只迁移标题文字并发警告。
- **`source must be a FRAME / COMPONENT / INSTANCE screen`**：传成了 Section / Group 的 id，让设计师给具体 frame。
- **`节点 … 不在直板机稿内，已忽略`**：`grid` / `split` 里的 id 不属于 `sourceId`，重新跑 analyze 取 id。

## 已验证

- 规范文件「Spec for AI」页，直板机稿「多目的地 - 首次进入」(`9821:71286`)：proposal → 方案板 `9924:27862`；final（推荐）→ `9926:28308`（右侧放置、真组件复用、Main–Support 分栏、对比项双列）。
- 新建测试文件里的 mock 一级页（TabBar + 4 张横向酒店卡）：proposal（跨文件导入 NavigationBar、矢量复刻 VB / Reserved Region、2 列网格 + 3:4）和 final（`target` 指定 Section、单屏保持设备高度）。
