import React, { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import LoadingScreen from './components/LoadingScreen';
import SearchPanel from './components/SearchPanel';
import ResultItem from './components/ResultItem';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    overflow-x: hidden;
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: linear-gradient(
      135deg,
      rgba(255, 240, 245, 1) 0%,
      rgba(240, 248, 255, 1) 25%,
      rgba(245, 240, 255, 1) 50%,
      rgba(255, 245, 240, 1) 75%,
      rgba(248, 255, 240, 1) 100%
    );
    color: #111;
    line-height: 1.6;
    min-height: 100vh;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(119, 198, 255, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 40px;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  background: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 25%,
    #f093fb 50%,
    #f5576c 75%,
    #4facfe 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  line-height: 1.2;
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
        <Title>過去問検索システム</Title>
        <SearchPanel onSearch={handleSearch} />
        {results.map(r => (
          <ResultItem 
            key={r.id} 
            title={r.properties['名前']?.title?.[0]?.plain_text || 'タイトル'} 
          />
        ))}
      </Container>
    </>
  );
}
