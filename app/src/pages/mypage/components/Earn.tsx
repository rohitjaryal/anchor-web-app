import {
  demicrofy,
  formatRate,
  formatUSTWithPostfixUnits,
} from '@anchor-protocol/notation';
import { TokenIcon } from '@anchor-protocol/token-icons';
import {
  AnchorTokenBalances,
  computeCurrentAPY,
  computeTotalDeposit,
} from '@anchor-protocol/webapp-fns';
import {
  useAnchorWebapp,
  useEarnEpochStatesQuery,
} from '@anchor-protocol/webapp-provider';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { BorderButton } from '@terra-dev/neumorphism-ui/components/BorderButton';
import { HorizontalScrollTable } from '@terra-dev/neumorphism-ui/components/HorizontalScrollTable';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import { useConnectedWallet } from '@terra-money/wallet-provider';
import { useBank } from '@terra-money/webapp-provider';
import { fixHMR } from 'fix-hmr';
import { useDepositDialog } from 'pages/earn/components/useDepositDialog';
import { useWithdrawDialog } from 'pages/earn/components/useWithdrawDialog';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

export interface EarnProps {
  className?: string;
}

function EarnBase({ className }: EarnProps) {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const connectedWallet = useConnectedWallet();

  const { constants } = useAnchorWebapp();

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const {
    tokenBalances: { uaUST },
  } = useBank<AnchorTokenBalances>();

  const { data: { moneyMarketEpochState } = {} } = useEarnEpochStatesQuery();

  const { data: { overseerEpochState } = {} } = useEarnEpochStatesQuery();

  // ---------------------------------------------
  // computes
  // ---------------------------------------------
  const { totalDeposit } = useMemo(() => {
    return {
      totalDeposit: computeTotalDeposit(uaUST, moneyMarketEpochState),
    };
  }, [moneyMarketEpochState, uaUST]);

  const apy = useMemo(() => {
    return computeCurrentAPY(overseerEpochState, constants.blocksPerYear);
  }, [constants.blocksPerYear, overseerEpochState]);

  // ---------------------------------------------
  // dialogs
  // ---------------------------------------------
  const [openDepositDialog, depositDialogElement] = useDepositDialog();

  const [openWithdrawDialog, withdrawDialogElement] = useWithdrawDialog();

  const openDeposit = useCallback(async () => {
    await openDepositDialog({});
  }, [openDepositDialog]);

  const openWithdraw = useCallback(async () => {
    await openWithdrawDialog({});
  }, [openWithdrawDialog]);

  return (
    <Section className={className}>
      <HorizontalScrollTable minWidth={600} startPadding={20}>
        <colgroup>
          <col style={{ minWidth: 150 }} />
          <col style={{ minWidth: 100 }} />
          <col style={{ minWidth: 150 }} />
          <col style={{ minWidth: 200 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Stablecoin</th>
            <th>APY</th>
            <th>Deposit Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div>
                <i>
                  <TokenIcon token="ust" />
                </i>
                <div>
                  <div className="coin">UST</div>
                  <p className="name">Terra USD</p>
                </div>
              </div>
            </td>
            <td>{formatRate(apy)}%</td>
            <td>{formatUSTWithPostfixUnits(demicrofy(totalDeposit))} UST</td>
            <td>
              <ActionButton
                disabled={!connectedWallet || !moneyMarketEpochState}
                onClick={openDeposit}
              >
                Deposit
              </ActionButton>
              <BorderButton
                disabled={!connectedWallet || !moneyMarketEpochState}
                onClick={openWithdraw}
              >
                Withdraw
              </BorderButton>
            </td>
          </tr>
        </tbody>
      </HorizontalScrollTable>

      {depositDialogElement}
      {withdrawDialogElement}
    </Section>
  );
}

export const StyledEarn = styled(EarnBase)`
  table {
    thead,
    tbody {
      th:nth-child(2),
      td:nth-child(2),
      th:nth-child(3),
      td:nth-child(3),
      th:nth-child(4),
      td:nth-child(4) {
        text-align: center;
      }

      td:first-child > div {
        text-decoration: none;
        color: currentColor;

        text-align: left;

        display: flex;

        align-items: center;

        i {
          width: 60px;
          height: 60px;

          margin-right: 15px;

          svg,
          img {
            display: block;
            width: 60px;
            height: 60px;
          }
        }

        .coin {
          font-weight: bold;

          grid-column: 2;
          grid-row: 1/2;
        }

        .name {
          grid-column: 2;
          grid-row: 2;
        }
      }
    }

    button {
      font-size: 12px;
      width: 120px;
      height: 32px;

      &:first-child {
        margin-right: 8px;
      }
    }
  }
`;

export const Earn = fixHMR(StyledEarn);
