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
	MarketCap      float64   `json:"market_cap"`
	Volume         float64   `json:"total_volume"`
	PriceINR       float64   `json:"current_price"`
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
		log.Println("Error fetching price for", cryptoID, ":", err)
		return
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Println("Error reading response for", cryptoID, ":", err)
		return
	}

	var coinData CoinGeckoResponse
	err = json.Unmarshal(body, &coinData)
	if err != nil {
		log.Println("Error unmarshalling response for", cryptoID, ":", err)
		return
	}

	
	cryptoData := CryptoData{
		ID:        coinData.ID,
		Symbol:    coinData.Symbol,
		Name:      coinData.Name,
		PriceINR:  coinData.MarketData.CurrentPrice.INR,
		MarketCap: coinData.MarketData.MarketCap.INR,
		Volume:    coinData.MarketData.TotalVolume.INR,
	}

	log.Printf("Fetched data for %s: %+v\n", cryptoID, cryptoData)
	results <- cryptoData
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


func fetchHistoricalData(cryptoID string) ([][]float64, error) {
	url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/%s/market_chart?vs_currency=inr&days=30", cryptoID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var historical HistoricalData
	err = json.NewDecoder(resp.Body).Decode(&historical)
	if err != nil {
		return nil, err
	}

	log.Println("Historical Prices for", cryptoID, ":", historical.Prices)
	return historical.Prices, nil
}

func main() {
	r := gin.Default()
	r.Use(cors.Default())

	
	r.POST("/fetch", func(c *gin.Context) {
		cryptoIDsInput := c.PostForm("cryptoIDs")
		cryptoIDs := strings.Split(cryptoIDsInput, ",")
		for i := range cryptoIDs {
			cryptoIDs[i] = strings.TrimSpace(cryptoIDs[i])
		}

		cryptoData, err := fetchCryptoPrices(cryptoIDs)
		if err != nil {
			log.Println("Error fetching crypto prices:", err)
			c.String(http.StatusInternalServerError, "Error fetching crypto prices")
			return
		}

		
		for i := range cryptoData {
			historicalPrices, err := fetchHistoricalData(cryptoData[i].ID)
			if err != nil {
				log.Println("Error fetching historical data for", cryptoData[i].ID, ":", err)
				continue
			}
			cryptoData[i].HistoricalData = historicalPrices
		}

		c.JSON(http.StatusOK, gin.H{
			"cryptoData": cryptoData,
		})
	})

	
	r.Run(":8080")
}
