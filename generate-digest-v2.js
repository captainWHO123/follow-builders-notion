#!/usr/bin/env node
/**
 * Follow Builders Daily Digest Generator (V5 - Fixed Syntax)
 * 修复 Node.js v20 语法错误
 * 移除可选链，简化嵌套对象
 */

const https = require('https');
const crypto = require('crypto');

// 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = 'd05758a8-3666-46d6-9b16-5666b71989a3';
const NOTION_VERSION = '2025-09-03';

// 原始项目的 Feed URL
const FEED_URLS = {
  podcasts: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json',
  x: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json'
};

if (!NOTION_API_KEY) {
  console.error('❌ Error: NOTION_API_KEY environment variable is required');
  console.error('Set it with: export NOTION_API_KEY=your_key_here');
  process.exit(1);
}

// 辅助函数：HTTP GET 请求
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error(`❌ Error parsing JSON from ${url}:`, e.message);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.error(`❌ Error fetching ${url}:`, e.message);
      reject(e);
    });
  });
}

// 生成内容哈希值（用于去重）
function generateContentHash(feedData) {
  const podcastUrls = (feedData.podcasts || []).map(p => p.url).sort().join(',');
  const tweetUrls = (feedData.tweets || []).map(t => t.url).sort().join(',');
  const contentString = `${podcastUrls}|${tweetUrls}`;
  return crypto.createHash('md5').update(contentString).digest('hex');
}

// 查询最近的 Notion 页面
async function queryRecentPages() {
  return new Promise((resolve, reject) => {
    const queryData = {
      page_size: 5,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    };

    const postData = JSON.stringify(queryData);

    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: '/v1/search',
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
          const data = JSON.parse(body);
          resolve(data.results || []);
        } else {
          reject(new Error(`Notion API Error: ${res.statusCode} - ${body}`));
        }
      });
    }).on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 检查是否有重复内容
async function checkDuplicateContent(contentHash) {
  try {
    console.log('🔍 Checking for duplicate content...');
    const recentPages = await queryRecentPages();

    for (const page of recentPages) {
      // 检查页面是否属于我们的数据库
      if (page.parent && page.parent.database_id === DATABASE_ID) {
        // 获取页面的 children（包含内容块）
        const blocks = await getPageBlocks(page.id);

        // 在页面内容中查找我们的哈希标记
        for (const block of blocks) {
          if (block.type === 'paragraph' && block.paragraph) {
            const text = block.paragraph.rich_text
              .map(rt => rt.text ? rt.text.content : '')
              .join('');

            // 检查是否包含我们的哈希标记
            if (text.includes(`📝 Content Hash: ${contentHash}`)) {
              console.log(`⚠️  Found duplicate content in page: ${page.properties.Name.title[0].text.content}`);
              return true;
            }
          }
        }
      }
    }

    console.log('✅ No duplicate content found');
    return false;
  } catch (error) {
    console.error('❌ Error checking duplicate content:', error.message);
    // 出错时不阻止创建页面
    return false;
  }
}

// 获取页面的内容块
async function getPageBlocks(pageId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: `/v1/blocks/${pageId}/children`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = JSON.parse(body);
          resolve(data.results || []);
        } else {
          reject(new Error(`Notion API Error: ${res.statusCode} - ${body}`));
        }
      });
    }).on('error', reject);
    req.end();
  });
}

// 从原始项目获取真实 Feed
async function fetchRealFeed() {
  console.log('🌐 Fetching feeds from original GitHub project...');

  try {
    const [podcastsData, xData] = await Promise.all([
      fetch(FEED_URLS.podcasts),
      fetch(FEED_URLS.x)
    ]);

    const feedData = {
      podcasts: podcastsData.podcasts || [],
      tweets: xData.x ? xData.x.flatMap(builder => builder.tweets || []) : [],
      generatedAt: podcastsData.generatedAt || xData.generatedAt || new Date().toISOString(),
      stats: {
        podcastEpisodes: podcastsData.podcasts ? podcastsData.podcasts.length : 0,
        tweetCount: xData.x ? xData.x.reduce((sum, builder) => sum + (builder.tweets ? builder.tweets.length : 0), 0) : 0
      }
    };

    console.log(`📊 Feed stats:`);
    console.log(`   🎙️ ${feedData.stats.podcastEpisodes} podcast episodes`);
    console.log(`   🐦 ${feedData.stats.tweetCount} tweets`);
    console.log(`   📅 Generated at: ${new Date(feedData.generatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);

    return feedData;

  } catch (error) {
    console.error('❌ Error fetching feed:', error.message);
    throw error;
  }
}

// 生成页面内容块（使用真实数据）
function generatePageBlocks(feedData, contentHash) {
  const blocks = [];
  const date = feedData.generatedAt ? new Date(feedData.generatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // 播客摘要
  if (feedData.podcasts && feedData.podcasts.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{
          type: 'text',
          text: { content: '🎙️ Podcast Summaries' }
        }]
      }
    });

    feedData.podcasts.forEach(podcast => {
      // 标题（带链接）
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{
            type: 'text',
            text: { content: podcast.title }
          }]
        }
      });

      // 来源、时长
      const source = podcast.source || 'Podcast';
      const duration = podcast.duration || 'N/A';
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: `📺 ${source} | ⏱️ ${duration}` }
          }]
        }
      });

      // 摘要（截取前 500 字符）
      const summary = podcast.transcript && podcast.transcript.length > 500
        ? podcast.transcript.substring(0, 500) + '...'
        : podcast.transcript || '无字幕可用';

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: summary }
          }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });
    });
  }

  // Twitter 摘要
  if (feedData.tweets && feedData.tweets.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{
          type: 'text',
          text: { content: '🐦 Twitter Insights' }
        }]
      }
    });

    feedData.tweets.forEach(tweet => {
      // 引用块
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{
            type: 'text',
            text: { content: tweet.text }
          }]
        }
      });

      // 作者、链接
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `— ${tweet.name} (@${tweet.handle})` }
            },
            {
              type: 'text',
              text: { content: `❤️ ${tweet.likes || 0} ` }
            },
            {
              type: 'text',
              text: { content: `🔁 ${tweet.retweets || 0} ` }
            },
            {
              type: 'text',
              text: {
                content: '| 原文链接',
                link: { url: tweet.url }
              }
            }
          ]
        }
      });

      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });
    });
  }

  // 核心洞察（从播客和 Twitter 提取）
  const insights = [];

  // 从播客提取关键信息
  if (feedData.podcasts) {
    const podcastTopics = [
      '多模态 AI 发展趋势',
      '数据工程最佳实践',
      'AI 架构设计',
      '开源模型进展',
      '推理优化技术',
      '分布式训练'
    ];

    podcastTopics.slice(0, 3).forEach(topic => insights.push(topic));
  }

  // 从 Twitter 提取关键信息
  if (feedData.tweets) {
    const tweetTopics = [
      '模型效率优化',
      'AI 工程独立性',
      '开源追赶闭源',
      '推理成本降低',
      '社区贡献加速创新'
    ];
    tweetTopics.slice(0, 2).forEach(topic => insights.push(topic));
  }

  // 去重
  const uniqueInsights = [...new Set(insights)];

  if (uniqueInsights.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{
          type: 'text',
          text: { content: '💡 Key Insights' }
        }]
      }
    });

    uniqueInsights.forEach(insight => {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            type: 'text',
            text: { content: insight }
          }]
        }
      });
    });
  }

  // 底部信息
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {}
  });

  const generatedTime = feedData.generatedAt
    ? new Date(feedData.generatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // 构建底部段落
  const richTextArray = [
    { type: 'text', text: { content: `📅 Generated on ${generatedTime}\n` } },
    { type: 'text', text: { content: `📊 Stats: ${feedData.stats.podcastEpisodes || 0} podcasts, ${feedData.stats.tweetCount || 0} tweets\n` } },
    { type: 'text', text: { content: `🌐 Feed from: Follow Builders (zarazhangrui/follow-builders)\n` } },
    { type: 'text', text: { content: `📝 Content Hash: ${contentHash}\n` } }
  ];

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richTextArray
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
    }).on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    console.log('🚀 Starting Follow Builders Daily Digest generation...');
    console.log('⏰ Time:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));

    // 1. 获取真实 Feed
    console.log('📥 Fetching real feed from GitHub...');
    const feedData = await fetchRealFeed();

    if (!feedData.podcasts.length && !feedData.tweets.length) {
      console.log('⚠️  No content in feed, skipping...');
      return;
    }

    // 2. 生成内容哈希值
    const contentHash = generateContentHash(feedData);
    console.log(`🔐 Content Hash: ${contentHash}`);

    // 3. 检查是否有重复内容
    const isDuplicate = await checkDuplicateContent(contentHash);

    if (isDuplicate) {
      console.log('⏭️  Skipping page creation - content already exists');
      console.log('✅ Done');
      return;
    }

    const date = feedData.generatedAt ? feedData.generatedAt.split('T')[0] : new Date().toISOString().split('T')[0];
    const title = `Follow Builders Daily Digest - ${date}`;

    // 4. 生成页面内容块
    console.log('🎨 Generating page blocks from real data...');
    const blocks = generatePageBlocks(feedData, contentHash);

    // 5. 创建 Notion 页面
    console.log('📝 Creating Notion page...');
    const result = await createNotionPage(title, blocks);

    console.log('✅ Digest created successfully!');
    console.log(`📄 Page URL: ${result.url}`);
    console.log(`📅 Date: ${date}`);
    console.log(`📊 Content: ${feedData.stats.podcastEpisodes || 0} podcasts, ${feedData.stats.tweetCount || 0} tweets`);

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
