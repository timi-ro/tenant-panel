package service

import (
	"fmt"
	"rag-admin-panel/web/entity"
	"sync"
	"time"

	"gorm.io/gorm"
)

// TrackedJobWithStatus combines the persisted TrackedJob with the live status
// fetched from the RAG API.
type TrackedJobWithStatus struct {
	entity.TrackedJob
	JobStatus *JobStatus `json:"status_info"`
	FetchErr  string     `json:"fetch_error,omitempty"`
}

// JobTracker manages persisted job tracking records in SQLite and can fetch
// live status for all tracked jobs in parallel.
type JobTracker struct {
	db        *gorm.DB
	ragClient *RAGClient
}

// NewJobTracker creates a JobTracker backed by the given DB and RAG client.
func NewJobTracker(db *gorm.DB, ragClient *RAGClient) *JobTracker {
	return &JobTracker{db: db, ragClient: ragClient}
}

// AddJob inserts a new TrackedJob record. Silently ignores duplicate job IDs.
func (t *JobTracker) AddJob(jobID string, siteID int, siteName, filename string) error {
	job := entity.TrackedJob{
		JobID:    jobID,
		SiteID:   siteID,
		SiteName: siteName,
		Filename: filename,
		AddedAt:  time.Now(),
	}
	result := t.db.Create(&job)
	if result.Error != nil {
		// Treat unique-constraint violations as a no-op.
		return fmt.Errorf("failed to add tracked job: %w", result.Error)
	}
	return nil
}

// ListWithStatus fetches all tracked jobs from SQLite, then concurrently
// retrieves their live status from the RAG API.
func (t *JobTracker) ListWithStatus() ([]TrackedJobWithStatus, error) {
	var jobs []entity.TrackedJob
	if err := t.db.Order("added_at desc").Find(&jobs).Error; err != nil {
		return nil, fmt.Errorf("failed to list tracked jobs: %w", err)
	}

	results := make([]TrackedJobWithStatus, len(jobs))
	var wg sync.WaitGroup

	for i, job := range jobs {
		wg.Add(1)
		go func(idx int, j entity.TrackedJob) {
			defer wg.Done()
			results[idx].TrackedJob = j
			status, err := t.ragClient.GetJobStatus(j.JobID)
			if err != nil {
				results[idx].FetchErr = err.Error()
			} else {
				results[idx].JobStatus = &status
			}
		}(i, job)
	}

	wg.Wait()
	return results, nil
}

// RemoveJob deletes a tracked job by its ID.
func (t *JobTracker) RemoveJob(jobID string) error {
	return t.db.Delete(&entity.TrackedJob{}, "job_id = ?", jobID).Error
}