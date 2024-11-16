const COINCAP_API_BASE = 'https://api.coincap.io/v2';
let priceChart = null;

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
        
        dataContainer.classList.add('active');
        updateUI(data.data);
    } catch (error) {
        dataContainer.classList.remove('active');
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
        const start = new Date(now - 24 * 60 * 60 * 1000); // 24 hours ago
        
        const response = await fetch(`${COINCAP_API_BASE}/assets/${id}/history?interval=h1&start=${start.getTime()}&end=${now.getTime()}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch history data. Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid history data received');
        }
        
        updateChart(data.data);
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
});

window.analyzeCrypto = analyzeCrypto;
