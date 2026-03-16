package controller

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// ListSites proxies GET /panel/api/sites → GET /admin/sites.
func ListSites(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	sites, err := client.ListSites()
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, sites)
}

// CreateSite proxies POST /panel/api/sites → POST /admin/sites.
func CreateSite(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	var body struct {
		Name string `json:"name" binding:"required"`
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, "name and plan are required")
		return
	}

	resp, err := client.CreateSite(body.Name, body.Plan)
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, resp)
}

// UpdatePlan proxies POST /panel/api/sites/:id/plan → PATCH /admin/sites/:id/plan.
func UpdatePlan(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		fail(c, "invalid site id")
		return
	}

	var body struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, "plan is required")
		return
	}

	if err := client.UpdatePlan(id, body.Plan); err != nil {
		fail(c, err.Error())
		return
	}

	success(c, gin.H{"updated": true})
}

// SetActive proxies POST /panel/api/sites/:id/active → PATCH /admin/sites/:id { "is_active": ... }.
// Body: { "is_active": true|false }
func SetActive(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		fail(c, "invalid site id")
		return
	}

	var body struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, "is_active is required")
		return
	}

	if err := client.SetActive(id, body.IsActive); err != nil {
		fail(c, err.Error())
		return
	}

	success(c, gin.H{"is_active": body.IsActive})
}

// SetLLM proxies PATCH /panel/api/sites/:id/llm → PATCH /admin/sites/:id/llm.
func SetLLM(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		fail(c, "invalid site id")
		return
	}

	var body struct {
		Provider string `json:"provider" binding:"required"`
		Model    string `json:"model"`
		APIKey   string `json:"api_key" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, "provider and api_key are required")
		return
	}

	if err := client.SetLLM(id, body.Provider, body.Model, body.APIKey); err != nil {
		fail(c, err.Error())
		return
	}

	success(c, gin.H{"updated": true})
}

// ResetSite proxies POST /panel/api/sites/:id/reset → POST /admin/sites/:id/reset.
func ResetSite(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		fail(c, "invalid site id")
		return
	}

	var body struct {
		Messages bool `json:"messages"`
		Files    bool `json:"files"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, "invalid request body")
		return
	}

	resp, err := client.ResetSite(id, body.Messages, body.Files)
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, resp)
}

// RegenerateKey proxies POST /panel/api/sites/:id/regenerate-key → POST /admin/sites/:id/regenerate-key.
func RegenerateKey(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		fail(c, "invalid site id")
		return
	}

	resp, err := client.RegenerateKey(id)
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, resp)
}