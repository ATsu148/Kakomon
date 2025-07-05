import React, { useState } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  background: var(--panel-bg, rgba(255,255,255,0.25));
  backdrop-filter: blur(20px);
  padding: 20px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: 0 8px 32px rgba(31,38,135,0.15);
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
`;

const Input = styled.input`
  padding: 16px 20px;
  border-radius: 15px;
  border: 2px solid rgba(255,255,255,0.4);
  font-size: 16px;
  background: rgba(255,255,255,0.95);
  color: var(--text-color);
  backdrop-filter: blur(10px);
  &:focus {
    outline: none;
    border-color: var(--accent-start);
    background: white;
  }
`;

const Button = styled.button`
  padding: 14px 22px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg,var(--accent-start) 0%,var(--accent-end) 100%);
  border: none;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
  }
`;

export default function SearchPanel({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <Panel as="form" onSubmit={handleSubmit}>
      <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="キーワード検索" />
      <Button type="submit">検索</Button>
    </Panel>
  );
}
