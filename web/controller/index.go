package controller

import (
	"net/http"
	"rag-admin-panel/web/session"

	"github.com/gin-gonic/gin"
)

// Root redirects to /panel if authenticated, otherwise to /login.
func Root(c *gin.Context) {
	if session.IsLoggedIn(c) {
		c.Redirect(http.StatusFound, "/panel")
		return
	}
	c.Redirect(http.StatusFound, "/login")
}

// LoginPage serves the login HTML page.
func LoginPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Status(http.StatusOK)
}

// Login handles POST /login. It validates PANEL_SECRET and creates a session.
func Login(c *gin.Context) {
	password := c.PostForm("password")
	panelSecret, _ := c.MustGet("panel_secret").(string)

	if password != panelSecret {
		c.Redirect(http.StatusFound, "/login?error=1")
		return
	}

	if err := session.SetLoggedIn(c); err != nil {
		c.String(http.StatusInternalServerError, "failed to create session")
		return
	}

	c.Redirect(http.StatusFound, "/panel")
}

// Logout clears the session and redirects to /login.
func Logout(c *gin.Context) {
	_ = session.ClearSession(c)
	c.Redirect(http.StatusFound, "/login")
}

// Panel serves the SPA shell (index.html).
func Panel(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Status(http.StatusOK)
}