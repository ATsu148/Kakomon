const express = require('express');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

app.use(express.static('public'));

app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Name',
        text: {
          contains: query
        }
      }
    });
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
