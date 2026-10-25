# Component-Design

## 飞书（Lark）

- 飞书相关任务优先用官方飞书 CLI `lark-cli`（`npm install -g @larksuite/cli`），不要先找连接器或自己写 Open API 调用。
- 配置时选择已有应用 `cli_a97849ed24bb9bd9`，不要新建；品牌用 `feishu`（trip.larkenterprise.com 属于飞书）。
- 以用户本人身份操作（`--as user`）：`lark-cli auth login --domain docs,drive --no-wait --json`，把授权链接和二维码发给用户，再在后台用 `--device-code` 轮询完成登录。
- 云端容器是临时的，新会话需要重新安装、配置和登录。
- `scripts/lark_doc_spec.py` 默认就走 `lark-cli`（`--client cli`），见 `scripts/README.md`。
