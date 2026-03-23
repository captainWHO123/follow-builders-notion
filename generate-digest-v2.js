#!/usr/bin/env node

/**
 * Follow Builders Daily Digest Generator (V2)
 * 每天早上 9 点自动生成简报并写入 Notion
 * 使用页面内容块而不是数据库属性，更简单直接
 */

const https = require('https');

// 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = 'd05758a8-3666-46d6-9b16-5666b71989a3';
const NOTION_VERSION = '2025-09-03';

if (!NOTION_API_KEY) {
  console.error('❌ Error: NOTION_API_KEY environment variable is required');
  console.error('Set it with: export NOTION_API_KEY=your_key_here');
  process.exit(1);
}

// 模拟内容（实际应该从 Follow Builders 的中心 feed 获取）
function fetchDailyContent() {
  const today = new Date().toISOString().split('T')[0];
  return {
    title: `Follow Builders Daily Digest - ${today}`,
    date: today,
    podcasts: [
      {
        title: 'Latent Space - AI Architecture',
        summary: '讨论了最新的 AI 架构趋势，包括多模态模型的发展方向。重点强调了模块化设计在未来 AI 系统中的重要性。',
        link: 'https://youtube.com/example1',
        author: 'Alessio',
        duration: '45:00'
      },
      {
        title: 'Training Data - Dataset Engineering',
        summary: '深入探讨数据工程的最佳实践，如何构建高质量训练数据集。嘉宾分享了在大规模数据清洗和标注中的经验。',
        link: 'https://youtube.com/example2',
        author: 'Sam',
        duration: '38:00'
      }
    ],
    tweets: [
      {
        author: 'Andrej Karpathy',
        handle: '@karpathy',
        content: 'The future of AI is about making models more efficient and accessible to everyone, not just big tech companies.',
        link: 'https://x.com/karpathy',
        engagement: '12.5K'
      },
      {
        author: 'Swyx',
        handle: '@swyx',
        content: 'AI engineering is becoming a distinct discipline. We need to treat AI development differently from traditional software engineering.',
        link: 'https://x.com/swyx',
        engagement: '8.2K'
      },
      {
        author: 'Sam Altman',
        handle: '@sama',
        content: 'We are seeing incredible progress in AI capabilities. The next year will be transformative.',
        link: 'https://x.com/sama',
        engagement: '25.8K'
      }
    ],
    insights: [
      '多模态 AI 正在成为主流趋势，图像、文本、音频的融合越来越自然',
      '数据质量比数据量更重要，精心策划的小数据集可能比大语料更有效',
      'AI 工程正在成为独立学科，需要专门的工具和方法论',
      '模型效率是关键竞争优势，推理成本和部署便利性至关重要',
      '开源模型正在快速追赶闭源模型，社区贡献加速创新'
    ]
  };
}

// 生成页面内容块
function generatePageBlocks(content) {
  const blocks = [];

  // 标题
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: {
          content: '🎙️ Podcast Summaries',
        }
      }]
    }
  });

  // 播客摘要
  content.podcasts.forEach(podcast => {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: {
            content: podcast.title,
            link: { url: podcast.link }
          }
        }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: {
            content: `👤 ${podcast.author} | ⏱️ ${podcast.duration}\n\n${podcast.summary}`
          }
        }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
  });

  // Twitter 摘要
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: {
          content: '🐦 Twitter Insights',
        }
      }]
    }
  });

  content.tweets.forEach(tweet => {
    blocks.push({
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [{
          type: 'text',
          text: {
            content: tweet.content
          }
        }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: {
            content: `— ${tweet.author} (${tweet.handle}) | ❤️ ${tweet.engagement} | `
          }
        }, {
          type: 'text',
          text: {
            content: '原文链接',
            link: { url: tweet.link }
          }
        }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
  });

  // 核心洞察
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: {
          content: '💡 Key Insights',
        }
      }]
    }
  });

  content.insights.forEach(insight => {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: {
            content: insight
          }
        }]
      }
    });
  });

  // 底部信息
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {}
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: {
          content: `📅 Generated on ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
        }
      }]
    }
  });

  return blocks;
}

// 创建 Notion 页面
function createNotionPage(title, blocks) {
  return new Promise((resolve, reject) => {
    const pageData = {
      parent: {
        database_id: DATABASE_ID
      },
      properties: {
        'Name': {
          title: [{
            type: 'text',
            text: { content: title }
          }]
        }
      },
      children: blocks
    };

    const postData = JSON.stringify(pageData);

    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: '/v1/pages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Notion API Error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    console.log('🚀 Starting Follow Builders Daily Digest generation...');
    console.log('⏰ Time:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));

    // 1. 获取内容
    console.log('📥 Fetching daily content...');
    const content = fetchDailyContent();

    // 2. 生成页面内容块
    console.log('🎨 Generating page blocks...');
    const blocks = generatePageBlocks(content);

    // 3. 创建 Notion 页面
    console.log('📝 Creating Notion page...');
    const result = await createNotionPage(content.title, blocks);

    console.log('✅ Digest created successfully!');
    console.log(`📄 Page URL: ${result.url}`);
    console.log(`📅 Date: ${content.date}`);
    console.log(`📊 Content: ${content.podcasts.length} podcasts, ${content.tweets.length} tweets, ${content.insights.length} insights`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { main };
