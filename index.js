const express = require('express');
const { Client } = require('@notionhq/client');
const path = require('path');
require('dotenv').config();

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

// 高度なキャッシュシステム
const cache = new Map();
const searchCache = new Map();
const pageCache = new Map();
const filterCache = new Map();

const CACHE_DURATION = 10 * 60 * 1000; // 10分
const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 検索結果は5分
const PAGE_CACHE_DURATION = 15 * 60 * 1000; // ページ詳細は15分
const FILTER_CACHE_DURATION = 30 * 60 * 1000; // フィルターは30分

// 強化されたキャッシュヘルパー関数
function setCacheWithExpiry(key, value, duration = CACHE_DURATION, cacheMap = cache) {
  const expiryTime = Date.now() + duration;
  cacheMap.set(key, {
    value: value,
    expiry: expiryTime,
    accessCount: 0,
    lastAccessed: Date.now()
  });
}

function getCacheValue(key, cacheMap = cache) {
  const item = cacheMap.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cacheMap.delete(key);
    return null;
  }
  
  item.accessCount++;
  item.lastAccessed = Date.now();
  return item.value;
}

// 検索結果キャッシュ用のキー生成
function generateSearchCacheKey(query, filters) {
  return `search:${query}:${filters.subject || ''}:${filters.grade || ''}:${filters.period || ''}`;
}

// インテリジェントなキャッシュクリーンアップ
function cleanupCache() {
  const now = Date.now();
  const caches = [
    { cache: cache, name: 'general' },
    { cache: searchCache, name: 'search' },
    { cache: pageCache, name: 'page' },
    { cache: filterCache, name: 'filter' }
  ];

  caches.forEach(({ cache: cacheMap, name }) => {
    const initialSize = cacheMap.size;
    
    // 期限切れのアイテムを削除
    for (const [key, value] of cacheMap.entries()) {
      if (now > value.expiry) {
        cacheMap.delete(key);
      }
    }
    
    // メモリ制限チェック（1000アイテム以上の場合、古いものから削除）
    if (cacheMap.size > 1000) {
      const entries = Array.from(cacheMap.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toDelete = entries.slice(0, cacheMap.size - 800);
      toDelete.forEach(([key]) => cacheMap.delete(key));
    }
    
    console.log(`Cache cleanup [${name}]: ${initialSize} -> ${cacheMap.size} items`);
  });
}

// 2分ごとにキャッシュクリーンアップ（より頻繁に）
setInterval(cleanupCache, 2 * 60 * 1000);

app.use(express.static('public'));
app.use(express.json());

// テスト用エンドポイント
app.get('/test', async (req, res) => {
  try {
    console.log('Testing Notion connection...');
    console.log('Database ID:', databaseId);
    console.log('Token:', process.env.NOTION_TOKEN ? 'Set' : 'Not set');
    
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 1
    });
    
    console.log('Test response:', JSON.stringify(response, null, 2));
    
    res.json({
      success: true,
      pageCount: response.results.length,
      samplePage: response.results[0] || null
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// フィルタオプションを取得するエンドポイント
app.get('/filters', async (req, res) => {
  try {
    const cacheKey = 'filter_options';
    
    // キャッシュから結果を確認
    const cachedFilters = getCacheValue(cacheKey, filterCache);
    if (cachedFilters) {
      console.log('Cache hit for filters');
      res.json(cachedFilters);
      return;
    }
    
    console.log('Cache miss for filters - fetching from Notion');
    
    let results = [];
    let cursor = undefined;
    do {
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 100,
        start_cursor: cursor
      });
      results = results.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const subjects = new Set();
    const grades = new Set();
    const periods = new Set();
    
    results.forEach(page => {
      // 教科
      if (page.properties['教科'] && page.properties['教科'].type === 'multi_select') {
        page.properties['教科'].multi_select.forEach(item => {
          if (item && item.name) subjects.add(item.name);
        });
      }
      // 学年
      if (page.properties['学年'] && page.properties['学年'].type === 'select' && page.properties['学年'].select) {
        grades.add(page.properties['学年'].select.name);
      }
      // 時期
      if (page.properties['時期'] && page.properties['時期'].type === 'multi_select') {
        page.properties['時期'].multi_select.forEach(item => {
          if (item && item.name) periods.add(item.name);
        });
      }
    });
    
    const filterResults = {
      subjects: Array.from(subjects).sort(),
      grades: Array.from(grades).sort(),
      periods: Array.from(periods).sort()
    };
    
    // フィルター結果をキャッシュに保存
    setCacheWithExpiry(cacheKey, filterResults, FILTER_CACHE_DURATION, filterCache);
    console.log('Cached filter options');
    
    res.json(filterResults);
  } catch (error) {
    console.error('Error fetching filters:', error.message);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

app.get('/search', async (req, res) => {
  const { q: query = '', subject, grade, period } = req.query;
  
  try {
    // キャッシュキーを生成
    const cacheKey = generateSearchCacheKey(query, { subject, grade, period });
    
    // キャッシュから結果を確認
    const cachedResults = getCacheValue(cacheKey, searchCache);
    if (cachedResults) {
      console.log(`Cache hit for search: ${cacheKey}`);
      res.json(cachedResults);
      return;
    }
    
    console.log(`Cache miss for search: ${cacheKey}`);
    
    // フィルタ条件を構築
    const filters = [];
    
    // テキスト検索フィルタ
    if (query) {
      filters.push({
        property: "名前",
        title: {
          contains: query
        }
      });
    }
    
    // 教科フィルタ
    if (subject) {
      filters.push({
        property: "教科",
        multi_select: {
          contains: subject
        }
      });
    }
    
    // 学年フィルタ
    if (grade) {
      filters.push({
        property: "学年",
        select: {
          equals: grade
        }
      });
    }
    
    // 時期フィルタ
    if (period) {
      filters.push({
        property: "時期",
        multi_select: {
          contains: period
        }
      });
    }
    
    // フィルタ条件を組み合わせ
    let filter = null;
    if (filters.length === 1) {
      filter = filters[0];
    } else if (filters.length > 1) {
      filter = {
        and: filters
      };
    }
    
    const queryOptions = {
      database_id: databaseId
    };
    
    if (filter) {
      queryOptions.filter = filter;
    }
    
    const response = await notion.databases.query(queryOptions);
    
    const results = response.results.map(page => ({
      id: page.id,
      properties: page.properties
    }));
    
    // 結果をキャッシュに保存
    setCacheWithExpiry(cacheKey, results, SEARCH_CACHE_DURATION, searchCache);
    console.log(`Cached search results for: ${cacheKey}`);
    
    res.json(results);
  } catch (error) {
    console.error('Error querying Notion:', error.message);
    res.status(500).json({ error: 'Failed to query Notion database' });
  }
});

// デバッグ用: ページのブロック構造を詳しく調べるエンドポイント
app.get('/debug/:pageId', async (req, res) => {
  const { pageId } = req.params;
  console.log(`Debug: Analyzing page structure for: ${pageId}`);
  
  try {
    // ページ情報を取得
    const page = await notion.pages.retrieve({ page_id: pageId });
    console.log('Page properties:', Object.keys(page.properties));
    
    // ブロックを取得
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    console.log(`Total blocks: ${blocks.results.length}`);
    
    const blockAnalysis = blocks.results.map(block => ({
      id: block.id,
      type: block.type,
      has_children: block.has_children,
      ...(block.type === 'child_page' ? { child_page: block.child_page } : {}),
      ...(block.type === 'paragraph' ? { 
        text_content: block.paragraph?.rich_text?.map(t => t.plain_text).join(''),
        mentions: block.paragraph?.rich_text?.filter(t => t.type === 'mention').map(t => ({
          type: t.mention?.type,
          id: t.mention?.page?.id || t.mention?.database?.id
        }))
      } : {})
    }));
    
    res.json({
      page: {
        id: page.id,
        properties: Object.keys(page.properties)
      },
      blocks: blockAnalysis
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ページの詳細情報とファイルを取得
app.get('/page/:pageId', async (req, res) => {
  const { pageId } = req.params;
  console.log(`Fetching page details for: ${pageId}`);
  
  try {
    const cacheKey = `page_${pageId}`;
    
    // キャッシュから結果を確認
    const cachedPage = getCacheValue(cacheKey, pageCache);
    if (cachedPage) {
      console.log(`Cache hit for page: ${pageId}`);
      res.json(cachedPage);
      return;
    }
    
    console.log(`Cache miss for page: ${pageId} - fetching from Notion`);
    
    // ページの詳細情報を取得
    console.log('Retrieving page...');
    const page = await notion.pages.retrieve({ page_id: pageId });
    console.log('Page retrieved successfully');
    
    // ページのブロックを取得（ファイル添付を含む）
    console.log('Fetching blocks...');
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    console.log(`Found ${blocks.results.length} blocks`);
    
    // デバッグ: ブロックのタイプを確認
    blocks.results.forEach((block, index) => {
      console.log(`Block ${index}: type=${block.type}, has_children=${block.has_children}, id=${block.id}`);
      if (block.type === 'child_page') {
        console.log(`  Child page title: ${block.child_page?.title}`);
      }
    });
    
    // 子ページのIDを事前に特定
    const childPageIds = new Set();
    const childPageBlocks = [];
    
    // 最初に子ページを特定
    for (const block of blocks.results) {
      if (block.type === 'child_page') {
        childPageIds.add(block.id);
        childPageBlocks.push(block);
        console.log(`Pre-identified child page: ${block.id}, title: ${block.child_page?.title}`);
      }
    }
    
    // 親ページのコンテンツのみを取得（子ページを除外）
    const parentBlocks = blocks.results.filter(block => block.type !== 'child_page');
    
    // 親ページのブロックのみを処理
    const allBlocks = [];
    const childFetchPromises = [];

    for (const block of parentBlocks) {
      allBlocks.push(block);

      // テーブルや他の has_children ブロックの子要素を取得（子ページは除外済み）
      if (block.has_children && block.type !== 'child_page') {
        console.log(`Fetching children for parent block type: ${block.type}, id: ${block.id}`);
        const promise = notion.blocks.children.list({ block_id: block.id })
          .then(children => {
            console.log(`Found ${children.results.length} children for ${block.type}`);

            // 子ブロックから子ページタイプを除外
            return children.results.filter(childBlock => {
              if (childBlock.type === 'child_page') {
                console.log(`Excluding child page from parent content: ${childBlock.child_page?.title}`);
                return false;
              }
              return true;
            });
          })
          .catch(error => {
            console.error(`Error fetching children for block ${block.id}:`, error);
            return [];
          });

        childFetchPromises.push(promise);
      }
    }

    const childResults = await Promise.all(childFetchPromises);
    childResults.forEach(result => {
      allBlocks.push(...result);
    });
    
    // ファイルブロックを抽出
    const files = allBlocks.filter(block => 
      block.type === 'file' || block.type === 'pdf'
    ).map(block => {
      console.log(`Processing block type: ${block.type}`);
      if (block.type === 'file' && block.file) {
        return {
          type: 'file',
          name: block.file.name || 'Unnamed file',
          url: block.file.type === 'external' ? block.file.external.url : block.file.file.url,
          caption: block.file.caption ? block.file.caption.map(c => c.plain_text).join('') : ''
        };
      } else if (block.type === 'pdf' && block.pdf) {
        return {
          type: 'pdf',
          name: block.pdf.name || 'Unnamed PDF',
          url: block.pdf.type === 'external' ? block.pdf.external.url : block.pdf.file.url,
          caption: block.pdf.caption ? block.pdf.caption.map(c => c.plain_text).join('') : ''
        };
      }
      return null;
    }).filter(file => file !== null);
    
    console.log(`Found ${files.length} files`);
    
    // 子ページを取得
    console.log('Fetching child pages...');
    const childPages = [];
    
    // 事前に特定した子ページブロックから取得
    for (const block of childPageBlocks) {
      try {
        console.log(`Found child_page block: ${block.id}, title: ${block.child_page?.title}`);
        
        // 子ページの詳細を取得
        const childPage = await notion.pages.retrieve({ page_id: block.id });
        childPages.push({
          id: block.id,
          title: block.child_page.title,
          properties: childPage.properties
        });
      } catch (error) {
        console.error(`Error fetching child page ${block.id}:`, error);
        
        // エラーが発生した場合でもタイトルだけは表示
        childPages.push({
          id: block.id,
          title: block.child_page.title,
          properties: null,
          error: 'アクセスできません'
        });
      }
    }
    
    // 親ページのコンテンツ（子ページのブロックは既に除外済み）
    const parentPageContent = allBlocks;
     console.log(`Final child pages count: ${childPages.length}`);
    console.log(`Parent page content blocks: ${parentPageContent.length}`);
    
    const result = {
      page: {
        id: page.id,
        properties: page.properties
      },
      content: parentPageContent, // 子ページのブロックを除外したコンテンツ
      files: files,
      childPages: childPages
    };
    
    // ページ詳細をキャッシュに保存
    setCacheWithExpiry(cacheKey, result, PAGE_CACHE_DURATION, pageCache);
    console.log(`Cached page details for: ${pageId}`);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching page details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page details', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 子ページの詳細を取得するエンドポイント
app.get('/child-page/:pageId', async (req, res) => {
  try {
    const pageId = req.params.pageId;
    console.log(`Fetching child page details for: ${pageId}`);
    
    // ページ情報を取得
    const page = await notion.pages.retrieve({ page_id: pageId });
    console.log('Child page retrieved');
    
    // ページのブロックを取得
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    console.log(`Found ${blocks.results.length} blocks in child page`);
    
    // 子ページの子ページを除外して親コンテンツのみを取得
    const parentBlocks = blocks.results.filter(block => block.type !== 'child_page');
    
    // テーブルブロックの子ブロック（行）も取得
    const allBlocks = [];
    for (const block of parentBlocks) {
      allBlocks.push(block);
      
      if (block.type === 'table' && block.has_children) {
        try {
          const tableRows = await notion.blocks.children.list({ block_id: block.id });
          // テーブル行からも子ページを除外
          const nonChildPageRows = tableRows.results.filter(row => row.type !== 'child_page');
          allBlocks.push(...nonChildPageRows);
        } catch (error) {
          console.error(`Error fetching table rows for block ${block.id}:`, error);
        }
      }
    }
    
    // ファイルブロックを抽出
    const files = allBlocks.filter(block => 
      block.type === 'file' || block.type === 'pdf'
    ).map(block => {
      if (block.type === 'file' && block.file) {
        return {
          type: 'file',
          name: block.file.name || 'Unnamed file',
          url: block.file.type === 'external' ? block.file.external.url : block.file.file.url,
          caption: block.file.caption ? block.file.caption.map(c => c.plain_text).join('') : ''
        };
      } else if (block.type === 'pdf' && block.pdf) {
        return {
          type: 'pdf',
          name: block.pdf.name || 'Unnamed PDF',
          url: block.pdf.type === 'external' ? block.pdf.external.url : block.pdf.file.url,
          caption: block.pdf.caption ? block.pdf.caption.map(c => c.plain_text).join('') : ''
        };
      }
      return null;
    }).filter(file => file !== null);
    
    const result = {
      page: {
        id: page.id,
        properties: page.properties
      },
      content: allBlocks,
      files: files
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching child page details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch child page details', 
      message: error.message 
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
