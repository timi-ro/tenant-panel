package database

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"rag-admin-panel/logger"
	"rag-admin-panel/web/entity"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// DB is the global database handle.
var DB *gorm.DB

// Init opens the SQLite database at the given path, runs auto-migrations,
// and returns the *gorm.DB instance.
func Init(dbPath string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.AutoMigrate(&entity.Setting{}, &entity.TrackedJob{}); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	DB = db
	logger.Info.Printf("Database initialised at %s", dbPath)
	return db, nil
}

// GetOrCreateSessionKey retrieves the persistent session signing key from the
// Setting table. If none exists yet it generates a new random 32-byte key,
// stores it, and returns it.
func GetOrCreateSessionKey(db *gorm.DB) ([]byte, error) {
	var setting entity.Setting
	result := db.First(&setting, "key = ?", "session_key")
	if result.Error == nil {
		// Found existing key.
		keyBytes, err := hex.DecodeString(setting.Value)
		if err != nil {
			return nil, fmt.Errorf("invalid session key stored in db: %w", err)
		}
		return keyBytes, nil
	}

	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("db error looking up session key: %w", result.Error)
	}

	// Generate a new random 32-byte key.
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, fmt.Errorf("failed to generate session key: %w", err)
	}

	newSetting := entity.Setting{
		Key:   "session_key",
		Value: hex.EncodeToString(raw),
	}
	if err := db.Create(&newSetting).Error; err != nil {
		return nil, fmt.Errorf("failed to persist session key: %w", err)
	}

	logger.Info.Println("Generated new session signing key")
	return raw, nil
}