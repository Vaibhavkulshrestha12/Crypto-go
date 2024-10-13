import React, { useState } from 'react';
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

const calculatePercentageChange = (currentPrice, previousPrice) => {
    if (!currentPrice || !previousPrice) return null;
    return (((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2);
};

const CryptoTracker = () => {
    const [cryptoIDs, setCryptoIDs] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState('24h');

    const handleFetchData = async () => {
        if (!cryptoIDs.trim()) {
            setError('Please enter valid cryptocurrency IDs.');
            return;
        }

        const ids = cryptoIDs.split(',').map(id => id.trim());
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8080/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    cryptoIDs: ids.join(','),
                    timeRange: timeRange,
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            if (!result.cryptoData || result.cryptoData.length === 0) {
                setError('No valid data found for the requested cryptocurrencies.');
            } else {
                setData(result.cryptoData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Error fetching data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

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
                {loading && <p className="text-yellow-500 text-center mb-6">Loading...</p>}

                {data && data.map(coin => {
                    const previousDayPrice = coin.historical_data && coin.historical_data[0] ? coin.historical_data[0][1] : null;
                    const percentageChange = calculatePercentageChange(coin.current_price, previousDayPrice);

                    return (
                        <div key={coin.id} className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                            <div className="flex items-center mb-4">
                                <img
                                    src={logoMap[coin.symbol.toLowerCase()] || 'https://cryptologos.cc/logos/default-logo.svg'}
                                    alt={`${coin.name} logo`}
                                    className="w-10 h-10 mr-3"
                                />
                                <h2 className="text-2xl font-bold">{coin.name} ({coin.symbol.toUpperCase()})</h2>
                            </div>

                            <div className="flex justify-between items-center">
                                <p className="text-3xl font-bold">
                                    ₹{coin.current_price ? coin.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                                </p>
                            </div>

                            <p className={`text-lg ${percentageChange < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {percentageChange ? `${percentageChange}%` : 'N/A'}
                            </p>

                            <p>
                                Market Cap: ₹{coin.market_cap ? coin.market_cap.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                            </p>
                            <p>
                                Volume: ₹{coin.total_volume ? coin.total_volume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                            </p>

                            {coin.historical_data && coin.historical_data.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <select
                                            value={timeRange}
                                            onChange={(e) => {
                                                setTimeRange(e.target.value);
                                                handleFetchData();
                                            }}
                                            className="p-2 border border-gray-700 rounded-lg bg-gray-800 text-white"
                                        >
                                            <option value="24h">24h</option>
                                            <option value="7d">7d</option>
                                            <option value="30d">30d</option>
                                            <option value="1y">1y</option>
                                        </select>
                                    </div>

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
                                            plugins: {
                                                tooltip: {
                                                    callbacks: {
                                                        title: (tooltipItem) => {
                                                            const label = tooltipItem[0]?.label;
                                                            return label ? `Date: ${label}` : '';
                                                        },
                                                    },
                                                },
                                            },
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
                    );
                })}
            </div>
        </div>
    );
};

export default CryptoTracker;