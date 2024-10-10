import React, { useState } from 'react';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';
import { Line } from 'react-chartjs-2';

const CryptoTracker = () => {
    const [cryptoIDs, setCryptoIDs] = useState('');
    const [data, setData] = useState(null);

    const handleFetchData = () => {
        const ids = cryptoIDs.split(',').map(id => id.trim());
        fetchData(ids);
    };

    const fetchData = async (ids) => {
        try {
            const response = await fetch('http://localhost:8080/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    cryptoIDs: ids.join(','),
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Fetched data:', data); 
            setData(data.cryptoData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    return (
        <div className="container mx-auto p-5">
            <h1 className="text-3xl font-bold mb-4 text-center">Cryptocurrency Prices</h1>
            <div className="flex justify-between mb-4">
                <input
                    type="text"
                    placeholder="Enter cryptocurrency IDs (e.g. bitcoin, ethereum)"
                    value={cryptoIDs}
                    onChange={(e) => setCryptoIDs(e.target.value)}
                    className="p-2 border rounded w-full"
                />
                <button onClick={handleFetchData} className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200">
                    Fetch Prices
                </button>
            </div>

            {data && data.map(coin => (
                <div key={coin.id} className="bg-white p-4 rounded shadow-md mb-4">
                    <h2 className="text-xl font-bold">{coin.name} ({coin.symbol})</h2>
                    <p>Current Price: ₹{coin.current_price}</p>
                    <p>Market Cap: ₹{coin.market_cap}</p>
                    <p>Volume: ₹{coin.total_volume}</p>
                    {coin.historical_data && coin.historical_data.prices && (
                        <Line
                            data={{
                                labels: coin.historical_data.prices.map(price => new Date(price[0]).toLocaleDateString()),
                                datasets: [{
                                    label: coin.name,
                                    data: coin.historical_data.prices.map(price => price[1]),
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                    borderWidth: 1,
                                }],
                            }}
                            options={{
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        title: {
                                            display: true,
                                            text: 'Price in INR',
                                        },
                                    },
                                },
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

const App = () => (
    <ApolloProvider client={client}>
        <CryptoTracker />
    </ApolloProvider>
);

export default App;