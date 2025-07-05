import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { 
    opacity: 0; 
    transform: translateY(20px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
`;

const spin = keyframes`
  0% { 
    transform: rotate(0deg); 
  }
  100% { 
    transform: rotate(360deg); 
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  backdrop-filter: blur(40px) saturate(180%);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.6s cubic-bezier(0.4, 0, 0.2, 1);
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 40px;
  border-radius: 24px;
  backdrop-filter: blur(20px);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.5) inset;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 2px solid transparent;
  border-radius: 50%;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(45deg, #007AFF, #5AC8FA, #34C759, #FF9500, #FF3B30) border-box;
  animation: ${spin} 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 32px;
    height: 32px;
    background: white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 50%;
    width: 4px;
    height: 4px;
    background: #007AFF;
    border-radius: 50%;
    transform: translateX(-50%);
  }
`;

const LoadingText = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
  text-align: center;
  animation: ${pulse} 2s ease-in-out infinite;
  letter-spacing: -0.2px;
  line-height: 1.4;
`;

const LoadingDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 2px;
  margin-top: 4px;
  font-size: 17px;
  font-weight: 600;
  color: #86868b;

  &::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
  }

  @keyframes dots {
    0%, 20% {
      content: '';
    }
    40% {
      content: '.';
    }
    60% {
      content: '..';
    }
    80%, 100% {
      content: '...';
    }
  }
`;

export default function LoadingScreen() {
  return (
    <Overlay>
      <SpinnerContainer>
        <Spinner />
        <div>
          <LoadingText>検索中</LoadingText>
          <LoadingDots />
        </div>
      </SpinnerContainer>
    </Overlay>
  );
}
