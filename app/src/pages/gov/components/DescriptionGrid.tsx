import { ReactNode } from 'react';
import styled from 'styled-components';

export interface DescriptionGridProps {
  className?: string;
  children: ReactNode;
}

function DescriptionGridBase({ className, children }: DescriptionGridProps) {
  return <section className={className}>{children}</section>;
}

export const DescriptionGrid = styled(DescriptionGridBase)`
  h4 {
    font-size: 13px;
    font-weight: 500;
    color: ${({ theme }) => theme.dimTextColor};

    &:not(:first-child) {
      margin-top: 10px;
    }

    margin-bottom: 5px;
  }

  p {
    font-size: 14px;
    line-height: 1.5;
    max-width: 90%;
  }

  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 40px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;
