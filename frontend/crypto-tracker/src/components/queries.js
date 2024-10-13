import { gql } from '@apollo/client';

export const GET_CRYPTO_DATA = gql`
    query GetCryptoData($ids: [String!]!) {
        coins(ids: $ids) {
            id
            symbol
            name
            market_cap
            total_volume
            current_price
            historical_data {
                prices {
                    timestamp
                    price
                }
            }
        }
    }
`;