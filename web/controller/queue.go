package controller

import (
	"github.com/gin-gonic/gin"
)

// GetQueue fetches all tracked jobs from SQLite and enriches each with live
// status from the RAG API (parallel fetch).
func GetQueue(c *gin.Context) {
	tracker := jobTracker(c)
	if tracker == nil {
		fail(c, "job tracker not available")
		return
	}

	jobs, err := tracker.ListWithStatus()
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, jobs)
}

// TrackJob adds a job_id to the tracked_jobs table.
func TrackJob(c *gin.Context) {
	tracker := jobTracker(c)
	if tracker == nil {
		fail(c, "job tracker not available")
		return
	}

	jobID := c.Param("job_id")
	if jobID == "" {
		fail(c, "job_id is required")
		return
	}

	var body struct {
		SiteID   int    `json:"site_id"`
		SiteName string `json:"site_name"`
		Filename string `json:"filename"`
	}
	// Body is optional — zero values are acceptable for MVP.
	_ = c.ShouldBindJSON(&body)

	if err := tracker.AddJob(jobID, body.SiteID, body.SiteName, body.Filename); err != nil {
		fail(c, err.Error())
		return
	}

	success(c, gin.H{"tracked": true, "job_id": jobID})
}

// RetryJob proxies POST /panel/api/queue/:job_id/retry → POST /ingest/retry/:job_id.
func RetryJob(c *gin.Context) {
	client := ragClient(c)
	if client == nil {
		fail(c, "rag client not available")
		return
	}

	jobID := c.Param("job_id")
	if jobID == "" {
		fail(c, "job_id is required")
		return
	}

	var body struct {
		APIKey string `json:"api_key"`
	}
	_ = c.ShouldBindJSON(&body)

	status, err := client.RetryJob(jobID, body.APIKey)
	if err != nil {
		fail(c, err.Error())
		return
	}

	success(c, status)
}