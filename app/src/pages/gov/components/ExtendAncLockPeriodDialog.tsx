import { Second } from '@libs/types';
import { DialogProps } from '@libs/use-dialog';
import { Modal } from '@material-ui/core';
import { Dialog } from '@libs/neumorphism-ui/components/Dialog';
import React, { useCallback, useEffect, useState } from 'react';
import { useBalances } from 'contexts/balances';
import { validateTxFee } from '@anchor-protocol/app-fns';
import { useFixedFee } from '@libs/app-provider';
import { MessageBox } from 'components/MessageBox';
import big from 'big.js';
import { UST_SYMBOL } from '@anchor-protocol/token-symbols';
import { demicrofy } from '@libs/formatter';
import styled from 'styled-components';
import { TxFeeList, TxFeeListItem } from 'components/TxFeeList';
import { IconSpan } from '@libs/neumorphism-ui/components/IconSpan';
import { formatOutput } from '@anchor-protocol/formatter';
import { ActionButton } from '@libs/neumorphism-ui/components/ActionButton';
import { useVotingEscrowConfigQuery } from 'queries/gov/useVotingEscrowConfigQuery';
import { useExtendAncLockPeriodTx } from 'tx/gov/useExtendAncLockPeriodTx';
import { useAccount } from 'contexts/account';
import { StreamStatus } from '@rx-stream/react';
import { TxResultRenderer } from 'components/tx/TxResultRenderer';
import { DurationSlider, SliderPlaceholder } from 'components/sliders';
import { DialogTitle } from '@libs/ui/text/DialogTitle';
import { useMyLockInfoQuery } from 'queries/gov/useMyLockInfoQuery';
import { VStack } from '@libs/ui/Stack';
import { ExpectedVeAncToReceive } from './ExpectedVeAncToReceive';
import { useMyAncStakedQuery } from 'queries';
import { ANC } from '@anchor-protocol/types';

type ExtendAncLockPeriodDialogProps = DialogProps<{}>;

export const ExtendAncLockPeriodDialog = ({
  closeDialog,
}: ExtendAncLockPeriodDialogProps) => {
  const { availablePost, connected } = useAccount();

  const { uUST } = useBalances();
  const fixedFee = useFixedFee();
  const invalidTxFee = validateTxFee(uUST, fixedFee);

  const { data: lockConfig } = useVotingEscrowConfigQuery();
  const [period, setPeriod] = useState<Second | undefined>();

  const { data: lockInfo } = useMyLockInfoQuery();
  const currentPeriod = lockInfo?.period;
  useEffect(() => {
    setPeriod(currentPeriod);
  }, [currentPeriod]);

  const isSubmitDisabled =
    !availablePost || invalidTxFee || lockInfo?.period === period;

  const [extendPeriod, extendPeriodResult] = useExtendAncLockPeriodTx();

  const { data: staked } = useMyAncStakedQuery();

  const extendForPeriod =
    period && lockInfo?.period
      ? ((period - lockInfo?.period) as Second)
      : undefined;

  const proceed = useCallback(() => {
    if (
      !connected ||
      !extendPeriod ||
      isSubmitDisabled ||
      extendForPeriod === undefined
    ) {
      return;
    }

    extendPeriod({
      period: extendForPeriod,
      onTxSucceed: () => {
        closeDialog();
      },
    });
  }, [closeDialog, connected, extendForPeriod, extendPeriod, isSubmitDisabled]);

  if (
    extendPeriodResult?.status === StreamStatus.IN_PROGRESS ||
    extendPeriodResult?.status === StreamStatus.DONE
  ) {
    return (
      <Modal open disableBackdropClick disableEnforceFocus>
        <Container>
          <TxResultRenderer
            resultRendering={extendPeriodResult.value}
            onExit={() => {
              switch (extendPeriodResult.status) {
                case StreamStatus.IN_PROGRESS:
                  extendPeriodResult.abort();
                  break;
                case StreamStatus.DONE:
                  extendPeriodResult.clear();
                  break;
              }
              closeDialog();
            }}
          />
        </Container>
      </Modal>
    );
  }

  return (
    <Modal open onClose={() => closeDialog()}>
      <Container onClose={() => closeDialog()}>
        <DialogTitle>Extend lock period</DialogTitle>
        {!!invalidTxFee && <MessageBox>{invalidTxFee}</MessageBox>}

        <VStack gap={8} fullWidth>
          {period !== undefined &&
          lockInfo?.period !== undefined &&
          lockConfig !== undefined ? (
            <DurationSlider
              value={period}
              min={lockInfo?.period}
              max={lockConfig.maxLockTime}
              step={lockConfig.periodDuration}
              onChange={setPeriod}
            />
          ) : (
            <SliderPlaceholder />
          )}
          {lockConfig && extendForPeriod !== undefined && (
            <ExpectedVeAncToReceive
              amount={(staked ? demicrofy(staked) : '0') as ANC}
              period={extendForPeriod}
              boostCoefficient={lockConfig.boostCoefficient}
              maxLockTime={lockConfig.maxLockTime}
            />
          )}
        </VStack>

        <TxFeeList className="receipt">
          {big(fixedFee).gt(0) && (
            <TxFeeListItem label={<IconSpan>Tx Fee</IconSpan>}>
              {`${formatOutput(demicrofy(fixedFee))} ${UST_SYMBOL}`}
            </TxFeeListItem>
          )}
        </TxFeeList>

        <ActionButton
          className="submit"
          disabled={isSubmitDisabled}
          onClick={proceed}
        >
          Extend
        </ActionButton>
      </Container>
    </Modal>
  );
};

export const Container = styled(Dialog)`
  width: 720px;
  touch-action: none;

  h1 {
    margin-bottom: 50px;
  }

  .amount {
    width: 100%;
    margin-bottom: 5px;

    .MuiTypography-colorTextSecondary {
      color: currentColor;
    }
  }

  .wallet {
    display: flex;
    justify-content: space-between;

    font-size: 12px;
    color: ${({ theme }) => theme.dimTextColor};

    &[aria-invalid='true'] {
      color: ${({ theme }) => theme.colors.negative};
    }
  }

  .graph {
    margin-top: 80px;
    margin-bottom: 40px;
  }

  .receipt {
    margin-top: 30px;
  }

  .submit {
    margin-top: 45px;

    width: 100%;
    height: 60px;
    border-radius: 30px;
  }
`;