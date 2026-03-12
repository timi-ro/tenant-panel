package middleware

import (
	"net/http"
	"rag-admin-panel/web/session"
	"strings"

	"github.com/gin-gonic/gin"
)

// RequireAuth is a Gin middleware that enforces authentication.
// For API routes (paths starting with /panel/api/) it returns a 401 JSON
// response when the session is not authenticated. For all other protected
// routes it redirects unauthenticated visitors to /login.
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		if session.IsLoggedIn(c) {
			c.Next()
			return
		}

		if strings.HasPrefix(c.Request.URL.Path, "/panel/api/") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"msg":     "unauthorized",
			})
			return
		}

		c.Redirect(http.StatusFound, "/login")
		c.Abort()
	}
}