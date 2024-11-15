const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

let priceChart = null;
let cryptoData = null;

async function getCoinId(symbol) {
    const response = await fetch(`${COINGECKO_API_BASE}/search?query=${symbol}`);
    if (!response.ok) throw new Error('Failed to search coin');
    const data = await response.json();
    const coin = data.coins.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
    if (!coin) throw new Error('Cryptocurrency not found');
    return coin.id;
}

async function analyzeCrypto() {
    const symbol = document.getElementById('cryptoSymbol').value.toLowerCase().trim();
    if (!symbol) {
        showError('Please enter a crypto symbol');
        return;
    }

    try {
        showError('');
        document.getElementById('dataContainer').classList.remove('active');
        
        const coinId = await getCoinId(symbol);
        const response = await fetch(`${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=minutely`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        
        if (!data || !data.prices || data.prices.length === 0) {
            throw new Error('No price data available');
        }

        cryptoData = data;
        document.getElementById('dataContainer').classList.add('active');
        updateChart(data);

    } catch (error) {
        showError(error.message);
        console.error('Error:', error);
        document.getElementById('dataContainer').classList.remove('active');
    }
}

function updateChart(historyData) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    if (priceChart) {
        priceChart.destroy();
    }

    const dates = historyData.prices.map(price => new Date(price[0]).toLocaleTimeString());
    const prices = historyData.prices.map(price => price[1]);

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Price (USD)',
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: value => '$' + value.toLocaleString()
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => '$' + context.parsed.y.toLocaleString()
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cryptoSymbol').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            analyzeCrypto();
        }
    });
});
