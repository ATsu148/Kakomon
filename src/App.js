import React, { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import LoadingScreen from './components/LoadingScreen';
import SearchPanel from './components/SearchPanel';
import ResultItem from './components/ResultItem';

const GlobalStyle = createGlobalStyle`
  :root {
    --bg-grad: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    --text-color: #2c3e50;
    --accent-start: rgba(255, 145, 115, 0.85);
    --accent-end: rgba(255, 138, 101, 0.85);
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--bg-grad);
    color: var(--text-color);
    line-height: 1.6;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch('/search?' + params.toString());
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlobalStyle />
      {loading && <LoadingScreen />}
      <Container>
        <h1>過去問検索システム</h1>
        <SearchPanel onSearch={handleSearch} />
        {results.map(r => (
          <ResultItem key={r.id} title={r.properties['名前']?.title?.[0]?.plain_text || 'タイトル'} />
        ))}
      </Container>
    </>
  );
}
