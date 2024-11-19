const CRYPTOCOMPARE_API_KEY = '1a9286290d0a05d143066a71a3ab030390bf7cc27e8dfa671b11833ea929c7fb'; // Get free API key from CryptoCompare
const MAX_DATA_POINTS = 100;
let chart = null;
let priceData = [];
let timeData = [];
let updateTimer = null;
let lastPrice = null;
let highPrice = null;
let lowPrice = null;

async function fetchPrice(symbol) {
    try {
        const [base, quote] = symbol.split('/');
        const url = `https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=${quote}`;
        
        const response = await fetch(url, {
            headers: {
                'authorization': `Apikey ${CRYPTOCOMPARE_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data[quote];
    } catch (error) {
        showError(`Error fetching price: ${error.message}`);
        return null;
    }
}

async function fetch24HData(symbol) {
    try {
        const [base, quote] = symbol.split('/');
        const url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=${base}&tsym=${quote}&limit=24`;
        
        const response = await fetch(url, {
            headers: {
                'authorization': `Apikey ${CRYPTOCOMPARE_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.Data.Data;
    } catch (error) {
        showError(`Error fetching 24h data: ${error.message}`);
        return null;
    }
}

function updateChart(price) {
    const now = new Date();
    timeData.push(now.toLocaleTimeString());
    priceData.push(price);

    // Keep only last MAX_DATA_POINTS data points
    if (priceData.length > MAX_DATA_POINTS) {
        priceData.shift();
        timeData.shift();
    }

    // Update price info
    document.getElementById('currentPrice').textContent = `$${price.toFixed(2)}`;
    
    // Update high/low prices
    if (highPrice === null || price > highPrice) highPrice = price;
    if (lowPrice === null || price < lowPrice) lowPrice = price;
    
    document.getElementById('highPrice').textContent = highPrice ? `$${highPrice.toFixed(2)}` : '-';
    document.getElementById('lowPrice').textContent = lowPrice ? `$${lowPrice.toFixed(2)}` : '-';

    // Update price change
    if (lastPrice !== null) {
        const change = ((price - lastPrice) / lastPrice) * 100;
        const changeElement = document.getElementById('priceChange');
        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    lastPrice = price;

    // Update chart
    chart.data.labels = timeData;
    chart.data.datasets[0].data = priceData;
    chart.update('quiet');
}

function initChart() {
    const ctx = document.getElementById('realtimeChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeData,
            datasets: [{
                label: 'Price (USD)',
                data: priceData,
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                }
            },
            animation: {
                duration: 0
            }
        }
    });
}

async function startTracking() {
    const symbol = document.getElementById('cryptoPair').value;
    const interval = parseInt(document.getElementById('updateInterval').value) * 1000;
    
    stopTracking();
    
    // Reset data
    priceData = [];
    timeData = [];
    lastPrice = null;
    highPrice = null;
    lowPrice = null;
    
    // Initialize chart
    initChart();
    
    // Fetch initial 24h data
    const historicalData = await fetch24HData(symbol);
    if (historicalData) {
        highPrice = Math.max(...historicalData.map(d => d.high));
        lowPrice = Math.min(...historicalData.map(d => d.low));
    }

    // Initial fetch
    const price = await fetchPrice(symbol);
    if (price) {
        updateChart(price);
    }

    // Enable stop button
    document.getElementById('stopBtn').disabled = false;

    // Set up interval
    updateTimer = setInterval(async () => {
        const price = await fetchPrice(symbol);
        if (price) {
            updateChart(price);
        }
    }, interval);
}

function stopTracking() {
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
    document.getElementById('stopBtn').disabled = true;
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        errorElement.style.display = 'none';
    }
}

// Initialize chart on load
document.addEventListener('DOMContentLoaded', initChart); 