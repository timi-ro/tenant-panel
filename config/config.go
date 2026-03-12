package config

import (
	"os"
)

// Config holds all application configuration derived from environment variables.
type Config struct {
	RAGAPIURL   string
	AdminSecret string
	PanelSecret string
	Port        string
	DBPath      string
}

// Load reads configuration from environment variables, applying defaults where needed.
func Load() *Config {
	return &Config{
		RAGAPIURL:   getEnv("RAG_API_URL", "http://localhost:8000"),
		AdminSecret: getEnv("ADMIN_SECRET", ""),
		PanelSecret: getEnv("PANEL_SECRET", "admin"),
		Port:        getEnv("PORT", "9000"),
		DBPath:      getEnv("DB_PATH", "./rag-panel.db"),
	}
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}