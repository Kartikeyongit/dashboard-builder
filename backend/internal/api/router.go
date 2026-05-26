package api

import (
	"context"
	"os"
	"time"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/your-org/dashboard-builder/backend/internal/api/handler"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/internal/scheduler"
	"github.com/your-org/dashboard-builder/backend/internal/service"
	ws "github.com/your-org/dashboard-builder/backend/internal/ws"
)

func SetupRoutes(app *fiber.App, jwtSecret, encryptionKey string) {
	// Middleware
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: frontendURL,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Prometheus
	prometheus := fiberprometheus.New("dashboard-builder")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	// Rate limiter (global for API)
	api := app.Group("/api/v1")
	api.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Second,
		KeyGenerator: func(c *fiber.Ctx) string {
			if userID := c.Locals("userID"); userID != nil {
				return userID.(string)
			}
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "rate limit exceeded"})
		},
		// Storage defaults to in‑memory; no explicit line needed
	}))

	// Repos
	userRepo := repository.NewUserRepo(db.DB)
	datasourceRepo := repository.NewDatasourceRepo(db.DB)
	queryRepo := repository.NewQueryRepo(db.DB)
	dashboardRepo := repository.NewDashboardRepo(db.DB)
	widgetRepo := repository.NewWidgetRepo(db.DB)
	shareLinkRepo := repository.NewShareLinkRepo(db.DB)

	// Pool manager
	poolManager := datasource.NewPoolManager(encryptionKey)

	// Services
	authService := service.NewAuthService(userRepo, jwtSecret)
	datasourceService := service.NewDatasourceService(datasourceRepo, poolManager, encryptionKey)
	queryService := service.NewQueryService(queryRepo, datasourceRepo, poolManager)
	dashboardService := service.NewDashboardService(dashboardRepo, widgetRepo)
	widgetService := service.NewWidgetService(widgetRepo, dashboardRepo, queryService)
	shareService := service.NewShareService(shareLinkRepo, dashboardRepo, widgetService)

	// WebSocket hub
	wsHub := ws.NewHub()
	go wsHub.Run()
	ws.StartRedisSubscriber(wsHub)

	// Scheduler
	sched := scheduler.NewScheduler(queryService, widgetRepo, dashboardRepo, poolManager)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sched.Start(ctx)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	datasourceHandler := handler.NewDatasourceHandler(datasourceService)
	queryHandler := handler.NewQueryHandler(queryService)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)
	widgetHandler := handler.NewWidgetHandler(widgetService)
	dashboardFullHandler := handler.NewDashboardFullHandler(widgetService)
	shareHandler := handler.NewShareHandler(shareService)

	// Public auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)

	// Public share routes (no auth)
	public := api.Group("/share")
	public.Get("/:token", shareHandler.GetSharedDashboard)
	public.Post("/:token/verify", shareHandler.VerifyPassword)

	// Protected WebSocket for dashboard editor
	app.Get("/ws", middleware.AuthRequired(jwtSecret), middleware.AttachOrgID, ws.HandleWebSocket(wsHub))

	// Public WebSocket for shared dashboards
	api.Get("/ws/share", ws.HandleShareWebSocket(wsHub, shareService))

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(jwtSecret), middleware.AttachOrgID)

	// Datasources
	datasources := protected.Group("/datasources")
	datasources.Post("/", datasourceHandler.Create)
	datasources.Get("/", datasourceHandler.List)
	datasources.Get("/:id", datasourceHandler.Get)
	datasources.Put("/:id", datasourceHandler.Update)
	datasources.Delete("/:id", datasourceHandler.Delete)
	datasources.Post("/:id/test", datasourceHandler.TestConnection)
	datasources.Get("/:id/schema", datasourceHandler.GetSchema)

	// Queries
	queries := protected.Group("/queries")
	queries.Post("/", queryHandler.Create)
	queries.Get("/", queryHandler.List)
	queries.Get("/:id", queryHandler.Get)
	queries.Put("/:id", queryHandler.Update)
	queries.Delete("/:id", queryHandler.Delete)
	queries.Post("/:id/execute", queryHandler.ExecuteSaved)
	queries.Post("/execute", queryHandler.ExecuteAdHoc)

	// Dashboards
	dashboards := protected.Group("/dashboards")
	dashboards.Post("/", dashboardHandler.Create)
	dashboards.Get("/", dashboardHandler.List)
	dashboards.Get("/:id", dashboardHandler.Get)
	dashboards.Put("/:id", dashboardHandler.Update)
	dashboards.Delete("/:id", dashboardHandler.Delete)
	dashboards.Get("/:id/full", dashboardFullHandler.GetFull)
	dashboards.Post("/:id/share", shareHandler.CreateShareLink)

	// Widgets (nested)
	widgets := dashboards.Group("/:dashboardId/widgets")
	widgets.Post("/", widgetHandler.Create)
	widgets.Put("/:id", widgetHandler.Update)
	widgets.Delete("/:id", widgetHandler.Delete)

	// Protected WebSocket for dashboard editor
	app.Get("/ws", middleware.AuthRequired(jwtSecret), ws.HandleWebSocket(wsHub))

	// Example protected endpoint
	protected.Get("/me", func(c *fiber.Ctx) error {
		orgID := c.Locals("orgID").(string)
		return c.JSON(fiber.Map{"org_id": orgID})
	})
}