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

// DeactivateSite proxies POST /panel/api/sites/:id/deactivate → PATCH /admin/sites/:id/deactivate.
func DeactivateSite(c *gin.Context) {
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

	if err := client.DeactivateSite(id); err != nil {
		fail(c, err.Error())
		return
	}

	success(c, gin.H{"deactivated": true})
}

// ReactivateSite proxies POST /panel/api/sites/:id/reactivate → PATCH /admin/sites/:id/reactivate.
func ReactivateSite(c *gin.Context) {
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

	if err := client.ReactivateSite(id); err != nil {
		fail(c, err.Error())
		return
	}

	success(c, gin.H{"reactivated": true})
}