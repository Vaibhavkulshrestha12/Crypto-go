import React, { useState, useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    Title,
    Tooltip,
    Legend,
    CategoryScale
} from 'chart.js';


ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    Title,
    Tooltip,
    Legend,
    CategoryScale
);

const logoMap = {
    bitcoin: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg',
    ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    ripple: 'https://cryptologos.cc/logos/ripple-xrp-logo.svg',
    litecoin: 'https://cryptologos.cc/logos/litecoin-ltc-logo.svg',
    cardano: 'https://cryptologos.cc/logos/cardano-ada-logo.svg',
    polkadot: 'https://cryptologos.cc/logos/polkadot-dots-logo.svg',
    dogecoin: 'https://cryptologos.cc/logos/dogecoin-doge-logo.svg',
};

const CryptoTracker = () => {
    const [cryptoIDs, setCryptoIDs] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const handleFetchData = async () => {
        if (!cryptoIDs.trim()) {
            setError('Please enter valid cryptocurrency IDs.');
            return;
        }

        const ids = cryptoIDs.split(',').map(id => id.trim());
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

            const result = await response.json();
            console.log('Fetched data:', result);
            setData(result.cryptoData);
            setError(''); 
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Error fetching data. Please try again later.');
        }
    };

    useEffect(() => {
        
        return () => {
            if (data) {
                setData(null); 
            }
        };
    }, [data]);

    return (
        <div className="bg-gray-900 min-h-screen text-gray-100">
            <div className="container mx-auto p-5">
                <h1 className="text-5xl font-extrabold mb-8 text-center text-yellow-500">CryptoTracker</h1>

                <div className="flex justify-between mb-6">
                    <input
                        type="text"
                        placeholder="Enter cryptocurrency IDs (e.g. bitcoin, ethereum)"
                        value={cryptoIDs}
                        onChange={(e) => setCryptoIDs(e.target.value)}
                        className="p-4 border border-gray-700 rounded-lg w-3/4 bg-gray-800 text-white"
                    />
                    <button
                        onClick={handleFetchData}
                        className="bg-yellow-500 text-gray-900 font-bold p-4 ml-4 rounded-lg hover:bg-yellow-600 transition duration-200"
                    >
                        Fetch Prices
                    </button>
                </div>

                {error && <p className="text-red-500 text-center mb-6">{error}</p>}

                {data && data.map(coin => (
                    <div key={coin.id} className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                        <div className="flex items-center mb-4">
                            <img
                                src={logoMap[coin.symbol.toLowerCase()] || 'https://cryptologos.cc/logos/default-logo.svg'}
                                alt={`${coin.name} logo`}
                                className="w-10 h-10 mr-3"
                            />
                            <h2 className="text-2xl font-bold">{coin.name} ({coin.symbol.toUpperCase()})</h2>
                        </div>
                        <p>Current Price: ₹{coin.PriceINR ? coin.PriceINR.toFixed(2) : 'N/A'}</p>
                        <p>Market Cap: ₹{coin.MarketCap ? coin.MarketCap.toFixed(2) : 'N/A'}</p>
                        <p>Volume: ₹{coin.Volume ? coin.Volume.toFixed(2) : 'N/A'}</p>

                        
                        {coin.historical_data && coin.historical_data.length > 0 && (
                            <div className="mt-6">
                                <Line
                                    data={{
                                        labels: coin.historical_data.map(price => new Date(price[0]).toLocaleDateString()),
                                        datasets: [{
                                            label: `${coin.name} Price History`,
                                            data: coin.historical_data.map(price => price[1]),
                                            borderColor: 'rgba(255, 206, 86, 1)',
                                            backgroundColor: 'rgba(255, 206, 86, 0.2)',
                                            borderWidth: 2,
                                        }],
                                    }}
                                    options={{
                                        responsive: true,
                                        scales: {
                                            y: {
                                                type: 'linear',
                                                beginAtZero: false,
                                                title: {
                                                    display: true,
                                                    text: 'Price in INR',
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => (
    <ApolloProvider client={client}>
        <CryptoTracker />
    </ApolloProvider>
);

export default App;
