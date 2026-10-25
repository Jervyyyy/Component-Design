# Trip App 折叠屏组件截图 → 飞书表格

1. **截图（在连着 DeviceHub 的电脑上跑）**
   `components.txt` 每行一个组件名，要和表格第一列的文字完全一致（比如 T 行的名字）。
   ```bash
   adb devices                      # 确认 DeviceHub 的设备已连上
   python3 scripts/capture.py -s <serial> --components components.txt
   ```
   截图按模式依次拍：01 外屏竖 → 02 内屏展开横 → 03 内屏展开竖 → 04 半折 Book。
   结果保存为 `shots/<组件>/<模式>.png`，并记录到 `shots/plan.csv`。

2. **上传到飞书**
   需要一个自建应用，开通权限 `docx:document`、`wiki:wiki:readonly`、`drive:drive`
   （如果是电子表格，还要 `sheets:spreadsheet`），并在 Wiki 页面上把这个应用加为可编辑协作者。
   ```bash
   export LARK_APP_ID=cli_xxx LARK_APP_SECRET=xxx   # Feishu 租户另设 LARK_DOMAIN=https://open.feishu.cn
   python3 scripts/lark_table.py inspect <wiki链接>                 # 查看表格行列
   python3 scripts/lark_table.py upload  <wiki链接> --plan shots/plan.csv --dry-run
   python3 scripts/lark_table.py upload  <wiki链接> --plan shots/plan.csv
   ```
   已经有图的格子默认跳过；要追加的话加 `--append`。

## P0 组件 · iPhone Duo 适配规范 → 飞书文档

内容来自 Figma 节点 `1:8849`，已整理在 `specs/iphone-duo-p0.json`（9 个组件）。脚本把内容**追加到文档末尾**：每个形态一个两栏分栏（左说明、右示意图），示意图最高 380px；Specs 用飞书原生表格，核心规则用高亮块。

1. **示意图**：按 JSON 里每个 `config` 的 `node`，用 Figma MCP 的 `get_screenshot` 导出形态 frame（1×），裁掉左侧 Spec 文字区，存成 `shots/duo-p0/<node>.png`（如 `1_8858.png`）。
2. **写入**：默认通过飞书 CLI 以你本人身份写入，你对文档有编辑权限即可。
   ```bash
   npm install -g @larksuite/cli
   lark-cli config init                                    # 选择已有应用，品牌 feishu
   lark-cli auth login --domain docs,drive                 # 浏览器里确认授权
   python3 scripts/lark_doc_spec.py <文档链接> --spec specs/iphone-duo-p0.json --dry-run          # 只打印版式
   python3 scripts/lark_doc_spec.py <文档链接> --spec specs/iphone-duo-p0.json --until Navigation # 总览 + 第一个组件
   python3 scripts/lark_doc_spec.py <文档链接> --spec specs/iphone-duo-p0.json --from Sheet       # 其余组件
   ```
   每段写完会回读校验；已创建的块 ID 记在 `shots/duo-p0/progress.json`，中途失败可以用 `--from` 续写。
   不用 CLI 时可加 `--client app`，改用自建应用凭证（`LARK_APP_ID` / `LARK_APP_SECRET` / `LARK_DOMAIN`，应用需加为文档协作者）。
