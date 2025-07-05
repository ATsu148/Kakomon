import React from 'react';
import styled, { keyframes } from 'styled-components';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Item = styled.div`
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(30px);
  padding: 24px;
  margin: 20px 0;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: ${slideIn} 0.6s ease-out;

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

  &:hover {
    transform: translateY(-4px);
    box-shadow: 
      0 16px 48px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.08) 100%
    );
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: translateY(-2px) scale(0.99);
  }
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #111;
  line-height: 1.4;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
`;

const Subtitle = styled.div`
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 400;
  line-height: 1.5;
`;

const MetaBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  margin: 8px 8px 0 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 12px;
  font-weight: 500;
  color: #111;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.2) 100%
    );
    transform: scale(1.05);
  }
`;

export default function ResultItem({ title, subtitle, meta = [] }) {
  return (
    <Item>
      <Title>{title}</Title>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
      {meta.length > 0 && (
        <div>
          {meta.map((item, index) => (
            <MetaBadge key={index}>{item}</MetaBadge>
          ))}
        </div>
      )}
    </Item>
  );
}
