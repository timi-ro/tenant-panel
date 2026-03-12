package session

import (
	"rag-admin-panel/logger"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

const (
	// SessionName is the name of the HTTP session cookie.
	SessionName = "panel_session"
	// LoggedInKey is the session key used to track authentication state.
	LoggedInKey = "logged_in"
)

// NewStore creates a new cookie-based session store signed with the provided key.
func NewStore(sessionKey []byte) sessions.Store {
	store := cookie.NewStore(sessionKey)
	logger.Info.Println("Session store initialised")
	return store
}

// SetLoggedIn marks the current session as authenticated.
func SetLoggedIn(c *gin.Context) error {
	session := sessions.Default(c)
	session.Set(LoggedInKey, true)
	return session.Save()
}

// ClearSession destroys the current session.
func ClearSession(c *gin.Context) error {
	session := sessions.Default(c)
	session.Clear()
	return session.Save()
}

// IsLoggedIn reports whether the current request has an authenticated session.
func IsLoggedIn(c *gin.Context) bool {
	session := sessions.Default(c)
	val := session.Get(LoggedInKey)
	loggedIn, ok := val.(bool)
	return ok && loggedIn
}