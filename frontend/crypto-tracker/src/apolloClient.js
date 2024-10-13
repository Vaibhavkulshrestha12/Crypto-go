// apolloClient.js
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',  // Adjust this based on your backend setup
  cache: new InMemoryCache(),
});

export default client;
