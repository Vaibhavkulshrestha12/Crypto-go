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
)

type CryptoData struct {
	ID       string  `json:"id"`
	Symbol   string  `json:"symbol"`
	Name     string  `json:"name"`
	PriceINR float64 `json:"current_price"` 
}

func fetchCryptoPrice(cryptoID string, wg *sync.WaitGroup, results chan<- CryptoData) {
	defer wg.Done()

	url := fmt.Sprintf("https://api.coingecko.com/api/v3/simple/price?ids=%s&vs_currencies=inr", cryptoID)
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

	log.Println("Response body for", cryptoID, ":", string(body)) // Log the response body

	var cryptoData map[string]map[string]float64
	err = json.Unmarshal(body, &cryptoData)
	if err != nil {
		log.Println("Error unmarshalling response for", cryptoID, ":", err)
		return
	}

	if price, ok := cryptoData[cryptoID]["inr"]; ok {
		results <- CryptoData{ID: cryptoID, PriceINR: price}
	} else {
		log.Println("No price found for", cryptoID) 
	}
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

func main() {
	r := gin.Default()
	r.LoadHTMLGlob("frontend/*")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	r.POST("/fetch", func(c *gin.Context) {
		cryptoIDsInput := c.PostForm("cryptoIDs")
		cryptoIDs := strings.Split(cryptoIDsInput, ",")
		cryptoData, err := fetchCryptoPrices(cryptoIDs)
		if err != nil {
			c.String(http.StatusInternalServerError, "Error fetching crypto prices: %s", err)
			return
		}

		c.HTML(http.StatusOK, "result.html", gin.H{"cryptoData": cryptoData})
	})

	r.Run(":8080")
}