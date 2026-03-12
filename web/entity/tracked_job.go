package entity

import "time"

// TrackedJob represents a background ingest job that the panel is monitoring.
type TrackedJob struct {
	JobID    string    `gorm:"primaryKey" json:"job_id"`
	SiteID   int       `json:"site_id"`
	SiteName string    `json:"site_name"`
	Filename string    `json:"filename"`
	AddedAt  time.Time `json:"added_at"`
}