import React, { useState } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(30px);
  padding: 30px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(120, 119, 198, 0.02) 0%,
      rgba(255, 119, 198, 0.02) 50%,
      rgba(119, 198, 255, 0.02) 100%
    );
    pointer-events: none;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
    gap: 15px;
  }
`;

const Input = styled.input`
  padding: 18px 24px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 16px;
  font-weight: 400;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.6) 100%
  );
  color: #111;
  backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  
  &::placeholder {
    color: rgba(0, 0, 0, 0.5);
    font-weight: 400;
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.85) 100%
    );
    box-shadow: 
      0 0 0 4px rgba(120, 119, 198, 0.1),
      0 8px 32px rgba(0, 0, 0, 0.15);
    transform: scale(1.02);
  }

  @media (min-width: 768px) {
    flex: 1;
  }
`;

const Button = styled.button`
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 600;
  color: #111;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(30px);
  font-family: inherit;
  position: relative;
  overflow: hidden;
  min-height: 56px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 12px 40px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.35) 0%,
      rgba(255, 255, 255, 0.2) 100%
    );
    border-color: rgba(255, 255, 255, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: scale(0.98);
  }

  @media (min-width: 768px) {
    min-width: 120px;
  }
`;

export default function SearchPanel({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <Panel as="form" onSubmit={handleSubmit}>
      <Input 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="キーワードを入力して検索..." 
        required
      />
      <Button type="submit">検索</Button>
    </Panel>
  );
}
