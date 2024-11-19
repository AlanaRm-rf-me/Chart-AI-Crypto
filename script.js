const COINCAP_API_BASE = 'https://api.coincap.io/v2';
let priceChart = null;
let portfolio = JSON.parse(localStorage.getItem('portfolio')) || {};

// Technical Analysis Parameters
const RSI_PERIOD = 14;
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;
const FAST_PERIOD = 12;
const SLOW_PERIOD = 26;
const SIGNAL_PERIOD = 9;
const MA_FAST = 20;
const MA_SLOW = 50;

async function analyzeCrypto() {
    const symbol = document.getElementById('cryptoSymbol').value.toLowerCase().trim();
    const errorMessage = document.getElementById('errorMessage');
    const dataContainer = document.getElementById('dataContainer');
    
    try {
        errorMessage.style.display = 'none';
        const response = await fetch(`${COINCAP_API_BASE}/assets/${symbol}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data. Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data) {
            throw new Error('Invalid cryptocurrency symbol');
        }
        
        dataContainer.style.display = 'flex';
        updateUI(data.data);
    } catch (error) {
        dataContainer.style.display = 'none';
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        if (priceChart) {
            priceChart.destroy();
            priceChart = null;
        }
    }
}

function updateUI(coin) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `
        <tr>
            <td>Current Price</td>
            <td>$${parseFloat(coin.priceUsd).toFixed(2)}</td>
        </tr>
        <tr>
            <td>24h Change</td>
            <td class="${parseFloat(coin.changePercent24Hr) >= 0 ? 'positive' : 'negative'}">
                ${parseFloat(coin.changePercent24Hr).toFixed(2)}%
            </td>
        </tr>
        <tr>
            <td>Market Cap</td>
            <td>$${parseFloat(coin.marketCapUsd).toLocaleString()}</td>
        </tr>
        <tr>
            <td>Volume (24h)</td>
            <td>$${parseFloat(coin.volumeUsd24Hr).toLocaleString()}</td>
        </tr>
    `;

    fetchHistory(coin.id);
}

async function fetchHistory(id) {
    try {
        const now = new Date();
        const start = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days of data for better analysis
        
        const response = await fetch(`${COINCAP_API_BASE}/assets/${id}/history?interval=h1&start=${start.getTime()}&end=${now.getTime()}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch history data. Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid history data received');
        }
        
        updateChart(data.data);
        generateTradingSignal(data.data);
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message;
        document.getElementById('errorMessage').style.display = 'block';
        if (priceChart) {
            priceChart.destroy();
            priceChart = null;
        }
    }
}

function updateChart(history) {
    const ctx = document.getElementById('priceChart');
    
    if (priceChart) {
        priceChart.destroy();
    }

    const dates = history.map(price => new Date(price.time).toLocaleTimeString());
    const prices = history.map(price => parseFloat(price.priceUsd));

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
            }
        }
    });
}

function generateTradingSignal(history) {
    const prices = history.map(price => parseFloat(price.priceUsd));
    const signalIndicator = document.getElementById('signalIndicator');
    const signalReason = document.getElementById('signalReason');
    
    // Calculate technical indicators
    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const movingAverages = calculateMovingAverages(prices);
    
    // Generate trading signal based on multiple indicators
    let signal = 'HOLD';
    let reasons = [];
    
    // RSI Analysis
    if (rsi < RSI_OVERSOLD) {
        signal = 'BUY';
        reasons.push(`RSI (${rsi.toFixed(2)}) indicates oversold conditions`);
    } else if (rsi > RSI_OVERBOUGHT) {
        signal = 'SELL';
        reasons.push(`RSI (${rsi.toFixed(2)}) indicates overbought conditions`);
    }
    
    // MACD Analysis
    if (macd.histogram > 0 && macd.histogram > macd.signal) {
        if (signal !== 'SELL') signal = 'BUY';
        reasons.push('MACD shows bullish momentum');
    } else if (macd.histogram < 0 && macd.histogram < macd.signal) {
        if (signal !== 'BUY') signal = 'SELL';
        reasons.push('MACD shows bearish momentum');
    }
    
    // Moving Averages Analysis
    if (movingAverages.fast > movingAverages.slow) {
        if (signal !== 'SELL') signal = 'BUY';
        reasons.push('Fast MA crossed above Slow MA');
    } else if (movingAverages.fast < movingAverages.slow) {
        if (signal !== 'BUY') signal = 'SELL';
        reasons.push('Fast MA crossed below Slow MA');
    }
    
    // Update UI with signal
    signalIndicator.innerHTML = `
        <span class="badge ${signal === 'BUY' ? 'bg-success' : signal === 'SELL' ? 'bg-danger' : 'bg-warning'}">
            ${signal}
        </span>
    `;
    signalReason.innerHTML = reasons.join('<br>');
}

function calculateRSI(prices) {
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
        const difference = prices[i] - prices[i - 1];
        if (difference >= 0) {
            gains.push(difference);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(difference));
        }
    }
    
    const avgGain = gains.slice(-RSI_PERIOD).reduce((a, b) => a + b) / RSI_PERIOD;
    const avgLoss = losses.slice(-RSI_PERIOD).reduce((a, b) => a + b) / RSI_PERIOD;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    const emaFast = calculateEMA(prices, FAST_PERIOD);
    const emaSlow = calculateEMA(prices, SLOW_PERIOD);
    const macdLine = emaFast - emaSlow;
    const signalLine = calculateEMA([macdLine], SIGNAL_PERIOD);
    
    return {
        macd: macdLine,
        signal: signalLine,
        histogram: macdLine - signalLine
    };
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
}

function calculateMovingAverages(prices) {
    const fastMA = prices.slice(-MA_FAST).reduce((a, b) => a + b) / MA_FAST;
    const slowMA = prices.slice(-MA_SLOW).reduce((a, b) => a + b) / MA_SLOW;
    
    return {
        fast: fastMA,
        slow: slowMA
    };
}

function updatePortfolio() {
    const portfolioTableBody = document.getElementById('portfolioTableBody');
    portfolioTableBody.innerHTML = '';
    
    Object.entries(portfolio).forEach(async ([symbol, amount]) => {
        try {
            const response = await fetch(`${COINCAP_API_BASE}/assets/${symbol}`);
            const data = await response.json();
            
            if (data.data) {
                const value = amount * parseFloat(data.data.priceUsd);
                const change = parseFloat(data.data.changePercent24Hr);
                
                portfolioTableBody.innerHTML += `
                    <tr>
                        <td>${symbol.toUpperCase()}</td>
                        <td>${amount}</td>
                        <td>$${parseFloat(data.data.priceUsd).toFixed(2)}</td>
                        <td>$${value.toFixed(2)}</td>
                        <td class="${change >= 0 ? 'positive' : 'negative'}">${change.toFixed(2)}%</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="removeAsset('${symbol}')">Remove</button>
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
        }
    });
}

function addAsset() {
    const symbol = document.getElementById('assetSymbol').value.toLowerCase().trim();
    const amount = parseFloat(document.getElementById('assetAmount').value);
    
    if (symbol && amount > 0) {
        portfolio[symbol] = (portfolio[symbol] || 0) + amount;
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        updatePortfolio();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addAssetModal'));
        modal.hide();
        
        // Clear form
        document.getElementById('addAssetForm').reset();
    }
}

function removeAsset(symbol) {
    delete portfolio[symbol];
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    updatePortfolio();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cryptoSymbol').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            analyzeCrypto();
        }
    });

    document.getElementById('analyzeBtn').addEventListener('click', (event) => {
        event.preventDefault();
        analyzeCrypto();
    });
    
    document.getElementById('saveAssetBtn').addEventListener('click', (event) => {
        event.preventDefault();
        addAsset();
    });
    
    // Initialize portfolio
    updatePortfolio();
});

window.analyzeCrypto = analyzeCrypto;
window.removeAsset = removeAsset;
