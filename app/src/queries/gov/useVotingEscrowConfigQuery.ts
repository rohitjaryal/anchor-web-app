import {
  ANCHOR_QUERY_KEY,
  useAnchorWebapp,
} from '@anchor-protocol/app-provider';
import { anchorToken, Second } from '@anchor-protocol/types';
import { wasmFetch, WasmQuery, QueryClient } from '@libs/query-client';
import { useAnchorQuery } from 'queries/useAnchorQuery';
import { createQueryFn } from '@libs/react-query-utils';

interface VotingEscrowConfigWasmQuery {
  config: WasmQuery<
    anchorToken.votingEscrow.Config,
    anchorToken.votingEscrow.ConfigResponse
  >;
}

export interface VotingEscrowConfig {
  minLockTime: Second;
  maxLockTime: Second;
  periodDuration: Second;
  boostCoefficient: number;
}

const VotingEscrowConfigQuery = async (
  votingEscrowContract: string,
  queryClient: QueryClient,
): Promise<VotingEscrowConfig> => {
  const {
    config: {
      min_lock_time,
      max_lock_time,
      period_duration,
      boost_coefficient,
    },
  } = await wasmFetch<VotingEscrowConfigWasmQuery>({
    ...queryClient,
    id: 'voting-escrow-config',
    wasmQuery: {
      config: {
        contractAddress: votingEscrowContract,
        query: { config: {} },
      },
    },
  });

  console.log({
    min_lock_time,
    max_lock_time,
    period_duration,
    boost_coefficient,
  });

  return {
    minLockTime: min_lock_time,
    maxLockTime: max_lock_time,
    periodDuration: period_duration,
    boostCoefficient: boost_coefficient,
  };

  // return {
  //   minLockTime: (86400 * 30) as Second,
  //   maxLockTime: (86400 * 365 * 4) as Second,
  //   periodDuration: (86400 * 7) as Second,
  //   boostCoefficient: boost_coefficient,
  // };
};

const VotingEscrowConfigQueryFn = createQueryFn(VotingEscrowConfigQuery);

export const useVotingEscrowConfigQuery = () => {
  const { queryClient, contractAddress } = useAnchorWebapp();

  const votingEscrowContract = contractAddress.anchorToken.votingEscrow;

  return useAnchorQuery(
    [ANCHOR_QUERY_KEY.ANC_MY_VOTING_POWER, votingEscrowContract, queryClient],
    VotingEscrowConfigQueryFn,
    {
      refetchOnMount: false,
      refetchInterval: 1000 * 60 * 5,
      keepPreviousData: false,
      enabled: !!votingEscrowContract,
    },
  );
};
