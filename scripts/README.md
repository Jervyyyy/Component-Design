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

# P0 组件 · iPhone Duo 适配规范 → 飞书文档

内容来自 Figma「P0 组件 · iPhone Duo 适配规范」（9 个组件），文字在 `duo_spec/content.json`，
示意图（2x 导出）在 `duo_spec/images/`。每个形态用分栏排版：左栏规范文字、右栏示意图；
横屏图两张并排放在文字下方，不会出现一张图占满一屏。

```bash
python3 scripts/lark_duo_spec.py preview      # 本地预览排版：duo_spec/preview.html
export LARK_APP_ID=cli_xxx LARK_APP_SECRET=xxx  # 应用需加为目标文档的可编辑协作者
# 或者用自己的身份写：export LARK_USER_ACCESS_TOKEN=u-xxx
python3 scripts/lark_duo_spec.py write https://trip.larkenterprise.com/docx/BZVadsS5uoXkzuxpEo7ctGGgnDt --dry-run
python3 scripts/lark_duo_spec.py write https://trip.larkenterprise.com/docx/BZVadsS5uoXkzuxpEo7ctGGgnDt
```
- 默认追加到文档末尾；文档标题为空时自动设为「P0 组件 · iPhone Duo 适配规范」。
- `--clear` 会先清空文档正文（会二次确认），适合整篇重写。
- 按组件分段写入；中途失败时脚本会提示用 `--only` 从失败的那段继续，
  可选值：`intro,navbar,sheet,share,dialog,bottombar,list,calendar,ocr,sharec`。
