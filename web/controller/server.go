package controller

import "github.com/gin-gonic/gin"

// GetServerStatus proxies GET /panel/api/server/status → GET /status on RAG API.
func GetServerStatus(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	status, err := client.GetStatus()
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, status)
}