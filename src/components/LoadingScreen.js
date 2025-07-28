import React from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';

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

const liquidGlassShimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const glassReflection = keyframes`
  0% {
    transform: translateX(-250px);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateX(250px);
    opacity: 0;
  }
`;

const liquidMotion = keyframes`
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.03);
  }
`;

export const ColorVariables = createGlobalStyle`
  :root {
    --panel-bg:
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 70%),
      radial-gradient(circle at 70% 70%, rgba(135, 206, 235, 0.3) 0%, transparent 70%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
    --glass-shimmer: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.8) 50%, transparent 70%);
    --glass-reflection: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%);
  }
`;

export const LoadingScreenWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: 
    linear-gradient(135deg, 
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%,
      rgba(255, 255, 255, 0.1) 100%
    ),
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 70% 70%, rgba(135, 206, 235, 0.3) 0%, transparent 50%),
    linear-gradient(45deg, #f0f8ff, #e6f3ff);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity 0.3s ease-out, visibility 0.3s ease-out;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%),
      linear-gradient(-45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: 
      radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(135, 206, 235, 0.2) 0%, transparent 50%);
    animation: ${liquidMotion} 8s ease-in-out infinite;
    pointer-events: none;
  }

  &.hidden {
    opacity: 0;
    visibility: hidden;
  }
`;

export const LoadingText = styled.div`
  margin-top: 40px;
  color: rgba(44, 62, 80, 0.9);
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  opacity: 0;
  animation: ${fadeInText} 1s ease-in-out 0.5s forwards;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 10px rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.9), rgba(52, 152, 219, 0.8));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 10;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -10px;
    right: -10px;
    bottom: -2px;
    background: linear-gradient(45deg, 
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
    border-radius: 20px;
    backdrop-filter: blur(10px);
    z-index: -1;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

export const RoseLoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    height: 500px;
    background: var(--panel-bg);
    border-radius: 50%;
    backdrop-filter: blur(15px);
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.1),
      inset 0 2px 10px rgba(255, 255, 255, 0.3),
      0 0 50px rgba(135, 206, 235, 0.2);
    animation: ${liquidMotion} 8s ease-in-out infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 520px;
    height: 520px;
    background: var(--glass-shimmer);
    border-radius: 50%;
    animation: ${glassReflection} 6s ease-in-out infinite;
    pointer-events: none;
  }

  @media (max-width: 480px) {
    display: none;
  }
`;

export const RoseSVG = styled.svg`
  width: 450px;
  height: 450px;
  max-width: 90vmin;
  max-height: 90vmin;
  background: var(--panel-bg);
  border-radius: 50%;
  backdrop-filter: blur(20px);
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.1),
    inset 0 3px 15px rgba(255, 255, 255, 0.4),
    0 0 60px rgba(135, 206, 235, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -20%;
    width: 140%;
    height: 200%;
    background: var(--glass-shimmer);
    animation: ${liquidGlassShimmer} 3s ease-in-out infinite;
    pointer-events: none;
  }

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
  padding: 40px;
  background: 
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 70%),
    radial-gradient(circle at 70% 70%, rgba(135, 206, 235, 0.3) 0%, transparent 70%),
    linear-gradient(135deg, 
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0.1) 25%,
      rgba(135, 206, 235, 0.15) 50%,
      rgba(255, 255, 255, 0.1) 75%,
      rgba(255, 255, 255, 0.25) 100%
    );
  border-radius: 30px;
  backdrop-filter: blur(25px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.1),
    inset 0 2px 10px rgba(255, 255, 255, 0.3),
    0 0 50px rgba(135, 206, 235, 0.2);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, 
      transparent 40%, 
      rgba(255, 255, 255, 0.6) 50%, 
      transparent 60%
    );
    animation: ${liquidGlassShimmer} 4s ease-in-out infinite;
    pointer-events: none;
  }

  @media (max-width: 480px) {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 280px;
    height: 200px;
    flex-direction: column;
  }
`;

export const Spinner = styled.div`
  width: 60px;
  height: 60px;
  background: 
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6) 0%, transparent 70%),
    radial-gradient(circle at 70% 70%, rgba(135, 206, 235, 0.5) 0%, transparent 70%),
    linear-gradient(135deg, 
      rgba(255, 255, 255, 0.3) 0%,
      rgba(135, 206, 235, 0.2) 50%,
      rgba(255, 255, 255, 0.3) 100%
    );
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid rgba(52, 152, 219, 0.8);
  border-radius: 50%;
  backdrop-filter: blur(15px);
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.1),
    inset 0 2px 8px rgba(255, 255, 255, 0.4),
    0 0 30px rgba(135, 206, 235, 0.3);
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
  position: relative;
  z-index: 10;
  
  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    background: var(--glass-shimmer);
    animation: ${glassReflection} 6s ease-in-out infinite;
    z-index: -1;
  }
`;

export const SpinnerText = styled.div`
  color: rgba(44, 62, 80, 0.9);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.9), rgba(52, 152, 219, 0.8));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 10;
`;

export default function LoadingScreen() {
  return (
    <>
      <ColorVariables />
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
    </>
  );
}
