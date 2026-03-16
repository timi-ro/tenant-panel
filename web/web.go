package web

import (
	"embed"
	"io/fs"
	"net/http"
	"rag-admin-panel/web/controller"
	"rag-admin-panel/web/middleware"
	"rag-admin-panel/web/service"
	"rag-admin-panel/web/session"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

// serveEmbedded reads a file from the embedded FS and writes it directly to
// the response, bypassing http.FileServer (which would 301-redirect index.html → /).
func serveEmbedded(fsys fs.FS, name string, contentType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		data, err := fs.ReadFile(fsys, name)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.Header("Cache-Control", "no-store")
		c.Data(http.StatusOK, contentType, data)
	}
}

//go:embed html assets
var staticFiles embed.FS

// Setup builds and returns the Gin engine with all routes registered.
func Setup(
	ragClient *service.RAGClient,
	jobTracker *service.JobTracker,
	sessionStore sessions.Store,
) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Session middleware (must come before any handler that reads sessions).
	r.Use(sessions.Sessions(session.SessionName, sessionStore))

	// Inject shared services into every request context.
	r.Use(func(c *gin.Context) {
		c.Set("rag_client", ragClient)
		c.Set("job_tracker", jobTracker)
		c.Next()
	})

	// --- Static assets served from embedded FS ---
	assetsFS, err := fs.Sub(staticFiles, "assets")
	if err != nil {
		panic("failed to create assets sub-filesystem: " + err.Error())
	}
	r.StaticFS("/assets", http.FS(assetsFS))

	// --- HTML sub-filesystem ---
	htmlFS, err := fs.Sub(staticFiles, "html")
	if err != nil {
		panic("failed to create html sub-filesystem: " + err.Error())
	}

	// --- Public routes ---
	r.GET("/", controller.Root)
	r.GET("/login", serveEmbedded(htmlFS, "login.html", "text/html; charset=utf-8"))
	r.POST("/login", controller.Login)
	r.POST("/logout", controller.Logout)

	// --- Protected routes ---
	protected := r.Group("/")
	protected.Use(middleware.RequireAuth())

	// SPA shell
	protected.GET("/panel", serveEmbedded(htmlFS, "index.html", "text/html; charset=utf-8"))

	// Panel API
	api := protected.Group("/panel/api")
	{
		api.GET("/server/status", controller.GetServerStatus)

		api.GET("/sites", controller.ListSites)
		api.POST("/sites", controller.CreateSite)
		api.POST("/sites/:id/plan", controller.UpdatePlan)
		api.POST("/sites/:id/active", controller.SetActive)
		api.PATCH("/sites/:id/llm", controller.SetLLM)
		api.POST("/sites/:id/reset", controller.ResetSite)
		api.POST("/sites/:id/regenerate-key", controller.RegenerateKey)

		api.GET("/queue", controller.GetQueue)
		api.POST("/queue/:job_id/track", controller.TrackJob)
		api.POST("/queue/:job_id/retry", controller.RetryJob)
	}

	return r
}