import React from 'react';
import styled, { keyframes } from 'styled-components';

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  backdrop-filter: blur(10px);
  background: rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fade} 0.3s ease;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(44,62,80,0.3);
  border-top-color: var(--accent-start);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0); }
    100% { transform: rotate(360deg); }
  }
`;

export default function LoadingScreen() {
  return (
    <Overlay>
      <Spinner />
    </Overlay>
  );
}
