package controller

import (
	"rag-admin-panel/web/service"

	"github.com/gin-gonic/gin"
)

// success writes a standard JSON success envelope.
func success(c *gin.Context, data interface{}) {
	c.JSON(200, gin.H{"success": true, "obj": data})
}

// fail writes a standard JSON failure envelope.
func fail(c *gin.Context, msg string) {
	c.JSON(200, gin.H{"success": false, "msg": msg})
}

// ragClient extracts the *service.RAGClient injected into the Gin context.
func ragClient(c *gin.Context) *service.RAGClient {
	v, _ := c.Get("rag_client")
	client, _ := v.(*service.RAGClient)
	return client
}

// jobTracker extracts the *service.JobTracker injected into the Gin context.
func jobTracker(c *gin.Context) *service.JobTracker {
	v, _ := c.Get("job_tracker")
	tracker, _ := v.(*service.JobTracker)
	return tracker
}