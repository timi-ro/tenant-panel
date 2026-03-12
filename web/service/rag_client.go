package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// RAGClient is an HTTP client that wraps all calls to the upstream RAG API.
type RAGClient struct {
	BaseURL     string
	AdminSecret string
	HTTPClient  *http.Client
}

// NewRAGClient creates a RAGClient with a sensible default timeout.
func NewRAGClient(baseURL, adminSecret string) *RAGClient {
	return &RAGClient{
		BaseURL:     baseURL,
		AdminSecret: adminSecret,
		HTTPClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// --- Response types ---------------------------------------------------------

// StatusResp represents the response from GET /status.
type StatusResp struct {
	Status   string `json:"status"`
	Model    string `json:"model"`
	Provider string `json:"external_llm_provider"`
}

// Site represents a single site returned by GET /admin/sites.
type Site struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Plan          string `json:"plan"`
	IsActive      bool   `json:"is_active"`
	MessageLimit  int    `json:"message_limit"`
	TotalRequests int    `json:"total_requests"`
	CreatedAt     string `json:"created_at"`
	APIKey        string `json:"api_key,omitempty"`
}

// CreateSiteResp is the response body for POST /admin/sites.
type CreateSiteResp struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Plan   string `json:"plan"`
	APIKey string `json:"api_key"`
}

// JobStatus represents the status of an ingest job.
type JobStatus struct {
	JobID         string  `json:"job_id"`
	Filename      string  `json:"filename"`
	Status        string  `json:"status"`
	QueuePosition int     `json:"queue_position"`
	ETA           float64 `json:"eta_seconds"`
	StartedAt     *string `json:"started_at"`
	CompletedAt   *string `json:"completed_at"`
	ErrorMessage  *string `json:"error_message"`
}

// --- Helpers ----------------------------------------------------------------

func (c *RAGClient) newRequest(method, path string, body interface{}) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.AdminSecret != "" {
		req.Header.Set("X-Admin-Secret", c.AdminSecret)
	}
	return req, nil
}

func (c *RAGClient) do(req *http.Request, out interface{}) error {
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("upstream returned %d: %s", resp.StatusCode, string(data))
	}

	if out != nil {
		if err := json.Unmarshal(data, out); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}
	return nil
}

// --- API methods ------------------------------------------------------------

// GetStatus calls GET /status on the RAG API.
func (c *RAGClient) GetStatus() (StatusResp, error) {
	req, err := c.newRequest(http.MethodGet, "/status", nil)
	if err != nil {
		return StatusResp{}, err
	}
	var out StatusResp
	return out, c.do(req, &out)
}

// ListSites calls GET /admin/sites.
func (c *RAGClient) ListSites() ([]Site, error) {
	req, err := c.newRequest(http.MethodGet, "/admin/sites", nil)
	if err != nil {
		return nil, err
	}
	var envelope struct {
		Sites []Site `json:"sites"`
	}
	if err := c.do(req, &envelope); err != nil {
		return nil, err
	}
	return envelope.Sites, nil
}

// CreateSite calls POST /admin/sites.
func (c *RAGClient) CreateSite(name, plan string) (CreateSiteResp, error) {
	payload := map[string]string{"name": name, "plan": plan}
	req, err := c.newRequest(http.MethodPost, "/admin/sites", payload)
	if err != nil {
		return CreateSiteResp{}, err
	}
	var out CreateSiteResp
	return out, c.do(req, &out)
}

// GetSite calls GET /admin/sites/:id.
func (c *RAGClient) GetSite(id int) (Site, error) {
	req, err := c.newRequest(http.MethodGet, fmt.Sprintf("/admin/sites/%d", id), nil)
	if err != nil {
		return Site{}, err
	}
	var out Site
	return out, c.do(req, &out)
}

// UpdatePlan calls PATCH /admin/sites/:id/plan.
func (c *RAGClient) UpdatePlan(id int, plan string) error {
	payload := map[string]string{"plan": plan}
	req, err := c.newRequest(http.MethodPatch, fmt.Sprintf("/admin/sites/%d/plan", id), payload)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// DeactivateSite calls PATCH /admin/sites/:id/deactivate.
func (c *RAGClient) DeactivateSite(id int) error {
	req, err := c.newRequest(http.MethodPatch, fmt.Sprintf("/admin/sites/%d/deactivate", id), nil)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// ReactivateSite calls PATCH /admin/sites/:id/reactivate.
func (c *RAGClient) ReactivateSite(id int) error {
	req, err := c.newRequest(http.MethodPatch, fmt.Sprintf("/admin/sites/%d/reactivate", id), nil)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// GetJobStatus calls GET /ingest/status/:job_id.
func (c *RAGClient) GetJobStatus(jobID string) (JobStatus, error) {
	req, err := c.newRequest(http.MethodGet, fmt.Sprintf("/ingest/status/%s", jobID), nil)
	if err != nil {
		return JobStatus{}, err
	}
	var out JobStatus
	return out, c.do(req, &out)
}

// RetryJob calls POST /ingest/retry/:job_id, optionally passing an api_key in the body.
func (c *RAGClient) RetryJob(jobID, apiKey string) (JobStatus, error) {
	var payload interface{}
	if apiKey != "" {
		payload = map[string]string{"api_key": apiKey}
	}
	req, err := c.newRequest(http.MethodPost, fmt.Sprintf("/ingest/retry/%s", jobID), payload)
	if err != nil {
		return JobStatus{}, err
	}
	var out JobStatus
	return out, c.do(req, &out)
}