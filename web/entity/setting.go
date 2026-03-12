package entity

// Setting is a simple key-value store persisted in SQLite.
// It is used for things like the session signing key.
type Setting struct {
	Key   string `gorm:"primaryKey"`
	Value string
}