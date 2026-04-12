package main

import (
	"fmt"
	"rag-admin-panel/config"
	"rag-admin-panel/database"
	"rag-admin-panel/logger"
	"rag-admin-panel/web"
	"rag-admin-panel/web/service"
	"rag-admin-panel/web/session"
)

func main() {
	cfg := config.Load()

	// --- Database ---
	db, err := database.Init(cfg.DBPath)
	if err != nil {
		logger.Error.Fatalf("Database init failed: %v", err)
	}

	// --- Session key (persisted across restarts) ---
	sessionKey, err := database.GetOrCreateSessionKey(db)
	if err != nil {
		logger.Error.Fatalf("Session key init failed: %v", err)
	}

	// --- Services ---
	ragClient := service.NewRAGClient(cfg.RAGAPIURL, cfg.AdminSecret)
	jobTracker := service.NewJobTracker(db, ragClient)
	sessionStore := session.NewStore(sessionKey)

	// --- HTTP server ---
	router := web.Setup(ragClient, jobTracker, sessionStore, cfg.PanelSecret)

	addr := fmt.Sprintf(":%s", cfg.Port)
	logger.Info.Printf("RAG Admin Panel starting on %s", addr)
	if err := router.Run(addr); err != nil {
		logger.Error.Fatalf("Server error: %v", err)
	}
}