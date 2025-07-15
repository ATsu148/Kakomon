import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeInText = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const LoadingScreenWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--bg-grad);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity 0.3s ease-out, visibility 0.3s ease-out;
  overflow: hidden;

  &.hidden {
    opacity: 0;
    visibility: hidden;
  }
`;

export const LoadingText = styled.div`
  margin-top: 40px;
  color: var(--text-color);
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
  opacity: 0;
  animation: ${fadeInText} 1s ease-in-out 0.5s forwards;
  letter-spacing: 0.5px;
`;

export const RoseLoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  @media (max-width: 480px) {
    display: none;
  }
`;

export const RoseSVG = styled.svg`
  width: 450px;
  height: 450px;
  max-width: 90vmin;
  max-height: 90vmin;
  background: transparent;

  @media (max-width: 480px) {
    width: 350px;
    height: 350px;
    max-width: 80vmin;
    max-height: 80vmin;
  }

  @media (min-width: 481px) and (max-width: 1024px) {
    width: 400px;
    height: 400px;
    max-width: 85vmin;
    max-height: 85vmin;
  }

  @media (min-width: 1025px) {
    width: 450px;
    height: 450px;
    max-width: 90vmin;
    max-height: 90vmin;
  }
`;

export const SpinnerContainer = styled.div`
  display: none;
  flex-direction: column;
  align-items: center;

  @media (max-width: 480px) {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    flex-direction: column;
  }
`;

export const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(44, 62, 80, 0.3);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

export const SpinnerText = styled.div`
  color: var(--text-color);
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.5px;
`;

export default function LoadingScreen() {
  return (
    <LoadingScreenWrapper>
      <RoseLoadingContainer>
        <RoseSVG id="roseSVG" />
      </RoseLoadingContainer>
      <SpinnerContainer>
        <Spinner />
        <SpinnerText>Loading...</SpinnerText>
      </SpinnerContainer>
      <LoadingText>Loading...</LoadingText>
    </LoadingScreenWrapper>
  );
}
