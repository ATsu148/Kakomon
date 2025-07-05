import React from 'react';
import styled from 'styled-components';

const Item = styled.div`
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(20px);
  padding: 20px;
  margin: 15px 0;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: 0 8px 32px rgba(31,38,135,0.15);
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: bold;
`;

export default function ResultItem({ title }) {
  return (
    <Item>
      <Title>{title}</Title>
    </Item>
  );
}
