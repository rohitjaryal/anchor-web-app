import type { Rate } from '@anchor-protocol/types';
import { ContractAddress } from '@anchor-protocol/types/contracts';
import { createMap, map, Mapped, useMap } from '@anchor-protocol/use-map';
import { ApolloClient, gql, useQuery } from '@apollo/client';
import { useContractAddress } from 'contexts/contract';
import { useService } from 'contexts/service';
import { parseResult } from 'queries/parseResult';
import { MappedApolloQueryResult, MappedQueryResult } from 'queries/types';
import { useQueryErrorHandler } from 'queries/useQueryErrorHandler';
import { useRefetch } from 'queries/useRefetch';
import { useMemo } from 'react';
import { Data as MarketState } from './marketState';

export interface RawData {
  borrowRate: {
    Result: string;
  };

  oraclePrice: {
    Result: string;
  };

  overseerWhitelist: {
    Result: string;
  };
}

export interface Data {
  borrowRate: {
    Result: string;
    rate: Rate<string>;
  };

  oraclePrice: {
    Result: string;
    rate: Rate<string>;
    last_updated_base: number;
    last_updated_quote: number;
  };

  overseerWhitelist: {
    Result: string;

    elems: {
      collateral_token: string;
      custody_contract: string;
      max_ltv: Rate<string>;
    }[];
  };
}

export const dataMap = createMap<RawData, Data>({
  borrowRate: (existing, { borrowRate }) => {
    return parseResult(existing.borrowRate, borrowRate.Result);
  },
  oraclePrice: (existing, { oraclePrice }) => {
    return parseResult(existing.oraclePrice, oraclePrice.Result);
  },
  overseerWhitelist: (existing, { overseerWhitelist }) => {
    return parseResult(existing.overseerWhitelist, overseerWhitelist.Result);
  },
});

export const mockupData: Mapped<RawData, Data> = {
  __data: {
    borrowRate: {
      Result: '',
    },
    oraclePrice: {
      Result: '',
    },
    overseerWhitelist: {
      Result: '',
    },
  },
  borrowRate: {
    Result: '',
    rate: '1' as Rate,
  },
  oraclePrice: {
    Result: '',
    rate: '1' as Rate,
    last_updated_base: 0,
    last_updated_quote: 0,
  },
  overseerWhitelist: {
    Result: '',
    elems: [],
  },
};

export interface RawVariables {
  interestContractAddress: string;
  interestBorrowRateQuery: string;
  oracleContractAddress: string;
  oracleQuery: string;
  overseerContractAddress: string;
  overseerWhitelistQuery: string;
}

export interface Variables {
  interestContractAddress: string;
  interestBorrowRateQuery: {
    borrow_rate: {
      market_balance: string;
      total_liabilities: string;
      total_reserves: string;
    };
  };
  oracleContractAddress: string;
  oracleQuery: {
    price: {
      base: string;
      quote: string;
    };
  };
  overseerContractAddress: string;
  overseerWhitelistQuery: {
    whitelist: {
      collateral_token: string;
    };
  };
}

export function mapVariables({
  interestContractAddress,
  interestBorrowRateQuery,
  oracleContractAddress,
  oracleQuery,
  overseerContractAddress,
  overseerWhitelistQuery,
}: Variables): RawVariables {
  return {
    interestContractAddress,
    interestBorrowRateQuery: JSON.stringify(interestBorrowRateQuery),
    oracleContractAddress,
    oracleQuery: JSON.stringify(oracleQuery),
    overseerContractAddress,
    overseerWhitelistQuery: JSON.stringify(overseerWhitelistQuery),
  };
}

export const query = gql`
  query __marketOverview(
    $interestContractAddress: String!
    $interestBorrowRateQuery: String!
    $oracleContractAddress: String!
    $oracleQuery: String!
    $overseerContractAddress: String!
    $overseerWhitelistQuery: String!
  ) {
    borrowRate: WasmContractsContractAddressStore(
      ContractAddress: $interestContractAddress
      QueryMsg: $interestBorrowRateQuery
    ) {
      Result
    }

    oraclePrice: WasmContractsContractAddressStore(
      ContractAddress: $oracleContractAddress
      QueryMsg: $oracleQuery
    ) {
      Result
    }

    overseerWhitelist: WasmContractsContractAddressStore(
      ContractAddress: $overseerContractAddress
      QueryMsg: $overseerWhitelistQuery
    ) {
      Result
    }
  }
`;

export function useMarketOverview({
  marketBalance,
  marketState,
}: {
  marketBalance: MarketState['marketBalance'] | undefined;
  marketState: MarketState['marketState'] | undefined;
}): MappedQueryResult<RawVariables, RawData, Data> {
  const { cw20, moneyMarket } = useContractAddress();

  const { online } = useService();

  const variables = useMemo(() => {
    return mapVariables({
      interestContractAddress: moneyMarket.interestModel,
      interestBorrowRateQuery: {
        borrow_rate: {
          market_balance:
            marketBalance?.find(({ Denom }) => Denom === 'uusd')?.Amount ?? '',
          total_liabilities: marketState?.total_liabilities ?? '',
          total_reserves: marketState?.total_reserves ?? '',
        },
      },
      oracleContractAddress: moneyMarket.oracle,
      oracleQuery: {
        price: {
          base: cw20.bLuna,
          quote: 'uusd',
        },
      },
      overseerContractAddress: moneyMarket.overseer,
      overseerWhitelistQuery: {
        whitelist: {
          collateral_token: cw20.bLuna,
        },
      },
    });
  }, [
    cw20.bLuna,
    marketBalance,
    marketState?.total_liabilities,
    marketState?.total_reserves,
    moneyMarket.interestModel,
    moneyMarket.oracle,
    moneyMarket.overseer,
  ]);

  const onError = useQueryErrorHandler();

  const { data: _data, refetch: _refetch, error, ...result } = useQuery<
    RawData,
    RawVariables
  >(query, {
    skip: !online || !marketBalance || !marketState,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    variables,
    onError,
  });

  const data = useMap(_data, dataMap);
  const refetch = useRefetch(_refetch, dataMap);

  return {
    ...result,
    data: online ? data : mockupData,
    refetch,
  };
}

export function queryMarketOverview(
  client: ApolloClient<any>,
  address: ContractAddress,
  marketBalance: MarketState['marketBalance'],
  marketState: MarketState['marketState'],
): Promise<MappedApolloQueryResult<RawData, Data>> {
  return client
    .query<RawData, RawVariables>({
      query,
      fetchPolicy: 'network-only',
      variables: mapVariables({
        interestContractAddress: address.moneyMarket.interestModel,
        interestBorrowRateQuery: {
          borrow_rate: {
            market_balance:
              marketBalance.find(({ Denom }) => Denom === 'uusd')?.Amount ?? '',
            total_liabilities: marketState.total_liabilities,
            total_reserves: marketState.total_reserves,
          },
        },
        oracleContractAddress: address.moneyMarket.oracle,
        oracleQuery: {
          price: {
            base: address.cw20.bLuna,
            quote: 'uusd',
          },
        },
        overseerContractAddress: address.moneyMarket.overseer,
        overseerWhitelistQuery: {
          whitelist: {
            collateral_token: address.cw20.bLuna,
          },
        },
      }),
    })
    .then((result) => {
      return {
        ...result,
        data: map(result.data, dataMap),
      };
    });
}
