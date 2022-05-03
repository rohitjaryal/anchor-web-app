import React, { useCallback } from 'react';
import {
  useEarnEpochStatesQuery,
  useEarnWithdrawForm,
} from '@anchor-protocol/app-provider';
import { ActionButton } from '@libs/neumorphism-ui/components/ActionButton';
import { ViewAddressWarning } from 'components/ViewAddressWarning';
import { useAccount } from 'contexts/account';
import { WithdrawDialog } from '../WithdrawDialog';
import { aUST, u, UST } from '@anchor-protocol/types';
import { Big, BigSource } from 'big.js';
import { DialogProps } from '@libs/use-dialog';
import { useWithdrawUstTx } from 'tx/terra';

export function TerraWithdrawDialog(props: DialogProps<{}, void>) {
  const { connected } = useAccount();

  const { data } = useEarnEpochStatesQuery();

  const state = useEarnWithdrawForm();
  const { withdrawAmount, txFee, availablePost } = state;

  const [withdraw, withdrawTxResult] = useWithdrawUstTx();

  const proceed = useCallback(
    async (withdrawAmount: UST, txFee: u<UST<BigSource>> | undefined) => {
      if (!connected || !withdraw || !data) {
        return;
      }

      withdraw({
        withdrawAmount: Big(withdrawAmount)
          .div(data.moneyMarketEpochState.exchange_rate)
          .toString() as aUST,
      });
    },
    [connected, data, withdraw],
  );

  return (
    <WithdrawDialog {...props} {...state} txResult={withdrawTxResult}>
      <ViewAddressWarning>
        <ActionButton
          className="button"
          disabled={!availablePost || !connected || !withdraw || !availablePost}
          onClick={() => proceed(withdrawAmount, txFee)}
        >
          Proceed
        </ActionButton>
      </ViewAddressWarning>
    </WithdrawDialog>
  );
}
