#!/bin/bash
# GitHub 推送脚本 - 使用 Token 认证

echo "🚀 Follow Builders Daily Digest - GitHub 推送工具"
echo "================================================"
echo ""

# 检查当前目录
if [ ! -f "generate-digest-v2.js" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    echo "正确目录：/Users/yantaomac/.openclaw/workspace/projects/follow-builders-notion"
    exit 1
fi

# 获取用户输入
read -p "👤 输入你的 GitHub 用户名: " USERNAME
read -p "🔑 输入你的 GitHub Token (ghp_xxx): " TOKEN
read -p "📦 输入仓库名称 (例如: follow-builders-notion): " REPO_NAME

# 构造 URL
GITHUB_URL="https://${TOKEN}@github.com/${USERNAME}/${REPO_NAME}.git"

echo ""
echo "📋 配置信息："
echo "   用户名: $USERNAME"
echo "   仓库名: $REPO_NAME"
echo "   URL: https://github.com/${USERNAME}/${REPO_NAME}"
echo ""
read -p "✅ 确认无误？(y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "🔄 正在推送到 GitHub..."
echo ""

# 删除旧的 remote
git remote remove origin 2>/dev/null

# 添加新的 remote
git remote add origin "$GITHUB_URL"

# 初始化 git（如果还没有）
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 仓库..."
    git init
fi

# 添加所有文件
echo "📝 添加文件..."
git add .

# 提交
echo "💾 提交更改..."
if git commit -m "Initial commit: Follow Builders Daily Digest automation" 2>&1 | grep -q "nothing to commit"; then
    echo "⚠️  没有新的更改需要提交"
fi

# 推送
echo "⬆️  推送到 GitHub..."
git branch -M main
if git push -u origin main; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📂 仓库地址: https://github.com/${USERNAME}/${REPO_NAME}"
    echo ""
    echo "🔐 下一步：设置 GitHub Secret"
    echo "   1. 访问: https://github.com/${USERNAME}/${REPO_NAME}/settings/secrets/actions"
    echo "   2. 点击 'New repository secret'"
    echo "   3. Name: NOTION_API_KEY"
    echo "   4. Value: （从 ~/.config/notion/api_key 获取）"
    echo "   5. 点击 'Add secret'"
    echo ""
else
    echo ""
    echo "❌ 推送失败！"
    echo ""
    echo "💡 可能的原因："
    echo "   1. Token 无效或过期"
    echo "   2. 仓库名称不存在（需要先在 GitHub 创建）"
    echo "   3. 网络问题"
    echo ""
    echo "🔧 请检查并重试"
    exit 1
fi
