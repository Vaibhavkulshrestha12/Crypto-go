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
	ID        string  `json:"id"`
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	MarketCap float64 `json:"market_cap"`
	Volume    float64 `json:"total_volume"`
	PriceINR  float64 `json:"current_price"`
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

	var cryptoData CryptoData
	err = json.Unmarshal(body, &cryptoData)
	if err != nil {
		log.Println("Error unmarshalling response for", cryptoID, ":", err)
		return
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

	r.LoadHTMLGlob("*.html")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

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

		historicalData := make(map[string]interface{})

		for _, crypto := range cryptoData {
			historicalPrices, err := fetchHistoricalData(crypto.ID)
			if err != nil {
				log.Println("Error fetching historical data for", crypto.ID, ":", err)
				continue
			}
			historicalData[crypto.ID] = map[string]interface{}{
				"prices": historicalPrices,
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"cryptoData":     cryptoData,
			"historicalData": historicalData,
		})
	})

	r.Run(":8080")
}