# Ads APP 广告位 · iPhone Duo 适配说明

需求来源：《Nov 2026【Ads】APP 端广告组件 iPhone Duo + Resizable 适配》（11.26 上线）
参考规范：Figma `iPhone-Duo-Adaptive-Design-for-Trip-1` ·「讨论问题四：广告类组件适配方式」（node `248:67872`）

## Figma 产出

文件：[iPhone-Duo-Adaptive-Design-for-Trip-1 › Page「Ads · iPhone Duo 适配」](https://www.figma.com/design/oHezsUjHCypfTlqnOL15cY/iPhone-Duo-Adaptive-Design-for-Trip-1?node-id=275-20704)

| Section | 内容 |
|---|---|
| ⓪ 本地组件 | `Ad/Creative · Banner`、`Ad/Creative · Poster`、`Ad/Creative · Feed`、`Page/Pager`、`Page/Entry`、`Page/TabBar`、`Page/HotelCard`、`Page/HotelListItem`。全部用 TDS Token 搭建，广告素材按「延展区·左 \| 安全区 \| 延展区·右」结构，改宽度即可看到切图效果 |
| ① 页面还原 · 直板机 375 | 文档中有截图的 7 个页面：P1 机票首页、P2 私家团首页、P3 酒店 Search Stays、P4 酒店列表、P5 首页 + 弹窗、P6 首页 Feed、P7 日本站首页 |
| ② 广告图片类型分类 | 全部广告位按展示方式分为 A–G 7 类，附类型示意 |
| ③ iPhone Duo 适配 | 机型参数总览 + 每类的切图方案 / 兜底（外屏竖、内屏竖、内屏横三种形态） |

还原规范：

- 组件使用 **Trip Design System ToC 2026** 团队库（NavigationBar、StatusBar、Tab、Search、Button、IconButton、Choice、Tag、Indicator.Dot 等）和 **Trip Icon & Illustration** 图标。
- 颜色、间距、圆角、描边都绑定 TDS 变量；文字都用 TDS 文本样式；投影使用 `Shadow/Default`、`Shadow/Enhanced`。
- 所有容器都是 Auto Layout。只有覆盖层（蒙层、悬浮按钮、导航叠在头图上、标注线）使用绝对定位。
- 检查结果：新页面中 Auto Layout 以外的 frame 0 个，未绑定变量的颜色 / 间距 0 处，未套文本样式的文字 0 处。
- 广告素材的文案、按钮都是可编辑图层，底图换成了内容相近的免费授权实拍图，叠加一层绑定 `Bg/Scrim` 的遮罩，保证白字可读。酒店列表图是从文档截图里裁出的干净内容图。

## 机型参数

| 形态 | 屏幕 | 内容宽 | 页面边距 | 卡片 Banner 宽 |
|---|---|---|---|---|
| 直板机（基准） | 375×812 | 375 | 12 | 351 |
| 外屏 · 竖向 | 466×678 | 382（右侧 Vertical Bar 84） | 12 | 358 |
| 内屏 · 竖向 | 669×951 | 669 | 24 | 621 |
| 内屏 · 横向 | 951×669 | 867（右侧 Vertical Bar 84） | 32 | 804 |

## 广告图片类型分类

| 类型 | 广告位 | 还原页面 | 切图 | 兜底 |
|---|---|---|---|---|
| **A 头图 / 通栏 Banner** | 807（1500×960）、834、10000573、10001049；火车各站首页 Banner 690/692/717/793/799/801/817/819/821/823/825/857/859/861/863/865/867/869（无截图，待确认） | P1 | 需要 | 高斯模糊 |
| **B 卡片式 Banner** | 10000250（703×234）、10000818（702×256）、711（686×228）、10000860 / 10000881（1125×368）、10000048 / 10000041 / 10000034（702×112）、841、10000104、10000125（703×180）、10000797、10001056、704、809 / 811 / 813 / 10000271 / 10000440、10000825 / 10001042 | P1、P2、P7 | 需要 | 高斯模糊 |
| **C 横滑 Deals 卡片** | 632、664（686×228） | P3、P4 | 不需要 | — |
| **D 信息流卡片** | 738 / 739（670×960）、740（670×560） | P6、P7 | 不需要 | — |
| **E 弹窗广告** | 714、10000118、10000349、10000874（654×800）、10000166 | P5 | 不需要 | — |
| **F 开屏** | 725（1242×2688）、726（1242×2208） | — | 需要 | 高斯模糊 |
| **G 图标 / 文字通知** | 10000370、10000391、10000412、10000426（32×32） | — | 不需要 | — |

## 各类型适配方式

### A 头图 / 通栏 Banner：切图 + 兜底

- **切图**：整图宽 1366（iPad 基准），展示高度 H 固定（示例 260）。主体、品牌标识和关键文案放在固定居中的安全区 S（示例 351）。两侧只放可以裁掉的延展背景。宽度跟随窗口，从两侧居中裁切，不拉高、不放大补满。上下边缘做渐变，融入底色。
- **兜底**：容器宽 = 窗口宽，高 = 直板机高度。直板机原图居中放置，规格不变。两侧空白用同一张图铺满，加 Blur 40。

### B 卡片式 Banner：方案一 / 方案二 + 兜底

- **方案一 · 安全区裁切（推荐）**：整图 1120 × H，中间的安全区 = 351（直板机 Banner 宽）。宽度跟随版心，最大 1120，高度不变。
- **方案二 · 1.5 倍居中（过渡用）**：素材来不及延展时，把直板机 351×117 整张等比放大，最多 1.5 倍（526.5×175.5），居中显示。
- **兜底**：容器宽 = 版心宽，高 = 117。原图居中，两侧用同一张图铺满并加 Blur 40。运营只需要提供 1 张图。

### C 横滑 Deals 卡片：只改布局

卡片尺寸固定 320×106，屏幕变宽时多露出几张：外屏 1 张 + 半张预览 → 内屏竖约 1.9 张 → 内屏横约 2.5 张。

### D 信息流卡片：只改布局

卡片宽度跟随列宽，高度按素材比例等比缩放。列数：外屏 2 列 → 内屏竖 3 列 → 内屏横 4 列。

### E 弹窗广告：只改布局

弹窗固定 327×400，在整屏居中，不跟着屏幕放大。蒙层铺满整屏，包括 Vertical Bar 区域。

### F 开屏：切图 + 兜底

- **切图**：新增整图，建议 1366×1024（导出倍率待确认），安全区 327×560。按各形态的屏高等比缩放后，从中间裁出屏幕宽度。外屏、内屏竖、内屏横都能用同一张整图覆盖。
- **兜底**：原竖版开屏图按屏高等比缩放后居中，两侧用同一张图铺满并加 Blur 40。

### G 图标 / 文字通知：只改布局

图标保持 32×32，文案区宽度随容器拉伸，超过两行截断。

## 图片来源

设计稿里的示意图片来自 [Openverse](https://openverse.org/)（Flickr 上 CC BY / CC0 授权的照片），只用于设计稿示意，上线素材仍由运营提供。按 CC BY 要求注明作者和出处：

| 位置 | 图片 | 作者 | 授权 |
|---|---|---|---|
| P1 头图 807、③A、② A 缩略图 | [Sunset Hong Kong](https://www.flickr.com/photos/29418416@N08/14599570053) | Studio Incendo | CC BY 2.0 |
| P1 卡片 Banner 711 | [Suitcase artwork](https://www.flickr.com/photos/57868312@N00/8996166797) | Matt From London | CC BY 2.0 |
| P2 顶部大图（内容图） | [Jade Dragon Snow Mountain](https://www.flickr.com/photos/37508546@N07/4588998912) | Kain Kalju | CC BY 2.0 |
| P2 卡片 Banner 10000860、③B、② B 缩略图 | [Giant Panda](https://www.flickr.com/photos/12587661@N06/11502320753) | Michael Gwyther-Jones | CC BY 2.0 |
| P3 酒店卡片 | [Shanghai Bund](https://www.flickr.com/photos/70889483@N00/5480866364) | trioptikmal | CC BY 2.0 |
| P3 Deals「Double Reward」、③C、② C 缩略图 | [On the airplane](https://www.flickr.com/photos/40422902@N00/10720103175) | skyseeker | CC BY 2.0 |
| P3 Deals「Thai Airways Payday」、③C | [Wat Arun Bangkok.](https://www.flickr.com/photos/88123769@N02/48047658306) | Bernard Spragg | CC0 1.0 |
| P4 Deals、P6 信息流 738、③C/③D、② D 缩略图 | [Petronas Towers Skyline Kuala Lumpur #IPhone6s #dailyshoot](https://www.flickr.com/photos/46018453@N06/23937462761) | Leshaines123 | CC BY 2.0 |
| P4 Deals 第 2 张、③C | [Panorama of tropical beach](https://www.flickr.com/photos/53355131@N07/4973140074) | victoria white2010 | CC BY 2.0 |
| P5 弹窗 714、③E、② E 缩略图 | [Tokyo Bay Area - Tokyo night view](https://www.flickr.com/photos/9004977@N04/12482206173) | oisa | CC BY 2.0 |
| P6 信息流 740、③D、② D 缩略图 | [Marina Bay, Singapore](https://www.flickr.com/photos/66239816@N08/22324973030) | ^Joe | CC BY 2.0 |
| P6 内容卡（上海） | [Shanghai Skyline](https://www.flickr.com/photos/37398884@N03/16363177946) | gags9999 | CC BY 2.0 |
| P6 内容卡（清迈） | [Chiang Mai Temple](https://www.flickr.com/photos/34073237@N04/3343844179) | Christian Haugen | CC BY 2.0 |
| P7 S Banner 10000250 | [Tokyo Night 2](https://www.flickr.com/photos/19594487@N00/39762107) | machu. | CC BY 2.0 |
| P7 信息流（JP） | [cherry blossom japan](https://www.flickr.com/photos/7274020@N06/5561573496) | Fotois.com / Dmaniax.com / 246g.com | CC BY 2.0 |
| P7 内容卡（大阪餐厅） | [Sushi and sashimi at Izakaya Mizu](https://www.flickr.com/photos/34948727@N00/8104669952) | ultrakml | CC BY 2.0 |
| ③F 开屏、② F 缩略图 | [mountain lake landscape](https://www.flickr.com/photos/25106463@N00/52841907928) | Tysto | CC BY 2.0 |

## 待确认

1. 安全区 S、头图高度 H 和导出倍率（1366 指 px，还是设计基准宽 × 倍率）。
2. 开屏整图的规格（建议 1366×1024）和安全区（327×560）。
3. 火车各站首页 Banner 等无截图的广告位，类型需要业务方确认。
4. 需求里给的本地 TDS kit 路径在云端环境读不到，所以改用 Figma 团队库「Trip Design System ToC 2026」，参考稿文件本来就订阅了这个库。
