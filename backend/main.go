package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"io/ioutil"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

type CryptoData struct {
	ID             string    `json:"id"`
	Symbol         string    `json:"symbol"`
	Name           string    `json:"name"`
	MarketCap      float64   `json:"market_cap,omitempty"`
	Volume         float64   `json:"total_volume,omitempty"`
	PriceINR       float64   `json:"current_price,omitempty"`
	HistoricalData [][]float64 `json:"historical_data"`
}

type CoinGeckoResponse struct {
	ID     string `json:"id"`
	Symbol string `json:"symbol"`
	Name   string `json:"name"`
	MarketData struct {
		CurrentPrice struct {
			INR float64 `json:"inr"`
		} `json:"current_price"`
		MarketCap struct {
			INR float64 `json:"inr"`
		} `json:"market_cap"`
		TotalVolume struct {
			INR float64 `json:"inr"`
		} `json:"total_volume"`
	} `json:"market_data"`
}

type HistoricalData struct {
	Prices [][]float64 `json:"prices"`
}

func fetchCryptoPrice(cryptoID string, wg *sync.WaitGroup, results chan<- CryptoData) {
	defer wg.Done()

	url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/%s", cryptoID)
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Error fetching price for %s: %v\n", cryptoID, err)
		return
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response for %s: %v\n", cryptoID, err)
		return
	}

	var coinData CoinGeckoResponse
	err = json.Unmarshal(body, &coinData)
	if err != nil {
		log.Printf("Error unmarshalling response for %s: %v\n", cryptoID, err)
		return
	}

	cryptoDataResponse := CryptoData{
		ID:        coinData.ID,
		Symbol:    coinData.Symbol,
		Name:      coinData.Name,
		PriceINR:  coinData.MarketData.CurrentPrice.INR,
		MarketCap: coinData.MarketData.MarketCap.INR,
		Volume:    coinData.MarketData.TotalVolume.INR,
	}

	results <- cryptoDataResponse
}

func fetchCryptoPrices(cryptoIDs []string) ([]CryptoData, error) {
	var wg sync.WaitGroup
	results := make(chan CryptoData, len(cryptoIDs))

	for _, id := range cryptoIDs {
		wg.Add(1)
		go fetchCryptoPrice(id, &wg, results)
	}

	wg.Wait()
	close(results)

	var cryptoData []CryptoData
	for crypto := range results {
		cryptoData = append(cryptoData, crypto)
	}

	return cryptoData, nil
}

func fetchHistoricalData(cryptoID, timeRange string) ([][]float64, error) {
	var days string
	switch timeRange {
	case "24h":
		days = "1"
	case "7d":
		days = "7"
	case "30d":
		days = "30"
	case "1y":
		days = "365"
	default:
		days = "1" // Default to 24h if no valid time range is provided
	}

	url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/%s/market_chart?vs_currency=inr&days=%s", cryptoID, days)
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Error fetching historical data for %s: %v\n", cryptoID, err)
		return nil, err
	}
	defer resp.Body.Close()

	var historical HistoricalData
	err = json.NewDecoder(resp.Body).Decode(&historical)
	if err != nil {
		log.Printf("Error unmarshalling historical data for %s: %v\n", cryptoID, err)
		return nil, err
	}

	return historical.Prices, nil
}

// Gin route handler for /fetch
func main() {
	r := gin.Default()
	r.Use(cors.Default())

	r.POST("/fetch", func(c *gin.Context) {
		cryptoIDsInput := c.PostForm("cryptoIDs")
		timeRange := c.DefaultPostForm("timeRange", "24h") // Default to 24h instead of 30d
		cryptoIDs := strings.Split(cryptoIDsInput, ",")
		for i := range cryptoIDs {
			cryptoIDs[i] = strings.TrimSpace(cryptoIDs[i])
		}

		// Fetch live prices
		cryptoData, err := fetchCryptoPrices(cryptoIDs)
		if err != nil {
			log.Printf("Error fetching crypto prices: %v\n", err)
			c.String(http.StatusInternalServerError, "Error fetching crypto prices")
			return
		}

		// Fetch historical data for each coin based on the timeRange
		for i := range cryptoData {
			historicalPrices, err := fetchHistoricalData(cryptoData[i].ID, timeRange)
			if err != nil {
				log.Printf("Error fetching historical data for %s: %v\n", cryptoData[i].ID, err)
				continue
			}
			cryptoData[i].HistoricalData = historicalPrices
		}

		// Return the combined data as JSON
		c.JSON(http.StatusOK, gin.H{
			"cryptoData": cryptoData,
		})
	})

	r.Run(":8080")
}
