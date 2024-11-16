# Crypto Analyzer

A web application that provides real-time cryptocurrency price analysis and visualization using the CoinCap API.

## Features

- Real-time cryptocurrency price data
- 24-hour price history chart
- Key metrics including:
  - Current Price
  - 24h Price Change
  - Market Cap
  - 24h Volume

## Usage

1. Open `index.html` in a web browser
2. Enter a cryptocurrency symbol (e.g., "bitcoin", "ethereum")
3. Click "Analyze" or press Enter
4. View the price chart and metrics

## Technical Details

- Uses CoinCap API v2 for real-time data
- Chart.js for data visualization
- Pure JavaScript with no additional dependencies
- Responsive design for all screen sizes

## Error Handling

The application includes comprehensive error handling for:
- Invalid cryptocurrency symbols
- API connection issues
- Rate limiting
- Invalid data responses

## API Reference

This application uses the CoinCap API v2:
- Base URL: https://api.coincap.io/v2
- Endpoints used:
  - /assets/{id} - Get current metrics
  - /assets/{id}/history - Get price history
  
  ## Planned for future releases
  - Coingecko for more up to date and feature rich tools
  - Portfolio trackeer
  - An actual UI
  
