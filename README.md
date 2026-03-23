# Follow Builders Daily Digest

每天自动生成 AI 建设者简报并同步到 Notion

## 功能

- 📅 每天早上 9:00 自动运行
- 🎙️ 追踪 5 个 AI 播客
- 🐦 监控 25 个顶级 AI 建设者的 Twitter
- 📝 生成双语简报
- 📄 自动写入 Notion 数据库

## 本地运行

```bash
# 安装依赖
npm install

# 运行脚本
node generate-digest-v2.js
```

## GitHub Actions 自动化

### 设置步骤

1. **创建 GitHub 仓库**
   - 将此项目推送到 GitHub
   - 仓库可以是公开或私有

2. **添加 GitHub Secret**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `NOTION_API_KEY`
   - Value: 你的 Notion API key（从 `~/.config/notion/api_key` 获取）
   - 点击 "Add secret"

3. **启用 GitHub Actions**
   - 进入 Actions 标签页
   - 点击 "I understand my workflows, go ahead and enable them"

4. **手动测试（可选）**
   - 进入 Actions 标签页
   - 选择 "Follow Builders Daily Digest" workflow
   - 点击 "Run workflow" 按钮
   - 选择分支并点击 "Run workflow"

5. **查看运行日志**
   - Actions 标签页可以查看每次运行的历史
   - 点击具体运行可以查看详细日志

## 配置说明

### 修改运行时间

编辑 `.github/workflows/daily-digest.yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: '0 1 * * *'  # UTC 时间，北京时间 = UTC + 8
```

常见时间示例：
- 北京时间 9:00 → `0 1 * * *`
- 北京时间 12:00 → `0 4 * * *`
- 北京时间 18:00 → `0 10 * * *`

### 修改数据库 ID

如果需要修改 Notion 数据库，编辑 `generate-digest-v2.js`：

```javascript
const DATABASE_ID = '你的数据库ID';
```

## 文件说明

- `generate-digest-v2.js` - 主脚本，生成简报并写入 Notion
- `run-digest.sh` - 本地运行脚本
- `.github/workflows/daily-digest.yml` - GitHub Actions 配置
- `package.json` - Node.js 项目配置

## Notion 数据库

- 名称：Follow Builders Daily Digest V2
- 访问：https://www.notion.so/d05758a8366646d69b165666b71989a3

## 开发计划

- [ ] 接入真实的 Follow Builders API
- [ ] 支持自定义内容源
- [ ] 添加邮件通知
- [ ] 支持多种输出格式（PDF、Markdown）

## License

MIT
