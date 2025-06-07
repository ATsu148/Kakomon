const express = require('express');
const { Client } = require('@notionhq/client');
const path = require('path');
require('dotenv').config();

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

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
    
    res.json({
      subjects: Array.from(subjects).sort(),
      grades: Array.from(grades).sort(),
      periods: Array.from(periods).sort()
    });
  } catch (error) {
    console.error('Error fetching filters:', error.message);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

app.get('/search', async (req, res) => {
  const { q: query = '', subject, grade, period } = req.query;
  
  try {
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
    
    res.json(results);
  } catch (error) {
    console.error('Error querying Notion:', error.message);
    res.status(500).json({ error: 'Failed to query Notion database' });
  }
});

// ページの詳細情報とファイルを取得
app.get('/page/:pageId', async (req, res) => {
  const { pageId } = req.params;
  console.log(`Fetching page details for: ${pageId}`);
  
  try {
    // ページの詳細情報を取得
    console.log('Retrieving page...');
    const page = await notion.pages.retrieve({ page_id: pageId });
    console.log('Page retrieved successfully');
    
    // ページのブロックを取得（ファイル添付を含む）
    console.log('Fetching blocks...');
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    console.log(`Found ${blocks.results.length} blocks`);
    
    // テーブルブロックの子ブロック（行）も取得
    const allBlocks = [];
    for (const block of blocks.results) {
      allBlocks.push(block);
      
      // テーブルブロックの場合、その子ブロック（テーブル行）も取得
      if (block.type === 'table' && block.has_children) {
        try {
          const tableRows = await notion.blocks.children.list({ block_id: block.id });
          allBlocks.push(...tableRows.results);
        } catch (error) {
          console.error(`Error fetching table rows for block ${block.id}:`, error);
        }
      }
    }
    
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
    console.error('Error fetching page details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page details', 
      message: error.message,
      stack: error.stack 
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
