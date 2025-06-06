# Notion Database Search Example

This example uses Node.js with Express and the Notion API to query a specific Notion database.
The application exposes a `/search` endpoint that can be called from the included HTML page.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with the following contents:
   ```env
   NOTION_TOKEN=your-secret-token
   NOTION_DATABASE_ID=your-database-id
   ```
3. Start the server:
   ```bash
   node index.js
   ```
4. Open `http://localhost:3000` in your browser and perform a search.

## Usage

Typing a search term into the input field will send a request to the server, which queries the
Notion database for pages whose `Name` property contains the search text. Matching results are
displayed on the page.
