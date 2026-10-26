package api

import (
	"context"
	"os"
	"time"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/your-org/dashboard-builder/backend/internal/api/handler"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
	"github.com/your-org/dashboard-builder/backend/internal/config"
	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/internal/scheduler"
	"github.com/your-org/dashboard-builder/backend/internal/service"
	ws "github.com/your-org/dashboard-builder/backend/internal/ws"
)

func SetupRoutes(app *fiber.App, jwtSecret, encryptionKey string) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     frontendURL,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: false,
	}))

	prometheus := fiberprometheus.New("dashboard-builder")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

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
	}))

	// Seed endpoint (one‑time use)
	seedRoute := api.Group("/seed")
	seedRoute.Get("/", handler.SeedHandler)

	userRepo := repository.NewUserRepo(db.DB)
	datasourceRepo := repository.NewDatasourceRepo(db.DB)
	queryRepo := repository.NewQueryRepo(db.DB)
	dashboardRepo := repository.NewDashboardRepo(db.DB)
	widgetRepo := repository.NewWidgetRepo(db.DB)
	shareLinkRepo := repository.NewShareLinkRepo(db.DB)

	poolManager := datasource.NewPoolManager(encryptionKey)

	// A short-lived, per-instance result cache removes duplicate work between
	// dashboard refreshes and scheduler pushes. Zero disables it.
	resultCache := service.NewResultCache(config.SecondsFromEnv("DASHBOARD_CACHE_TTL_SECONDS", 15*time.Second))
	queryConcurrency := config.IntFromEnv("DASHBOARD_QUERY_CONCURRENCY", 6)

	authService := service.NewAuthService(userRepo, jwtSecret)
	datasourceService := service.NewDatasourceService(datasourceRepo, poolManager, encryptionKey, resultCache)
	queryService := service.NewQueryService(queryRepo, datasourceRepo, poolManager, resultCache)
	dashboardService := service.NewDashboardService(dashboardRepo, widgetRepo)
	widgetService := service.NewWidgetService(widgetRepo, dashboardRepo, queryService, queryConcurrency)
	shareService := service.NewShareService(shareLinkRepo, dashboardRepo, widgetService)

	wsHub := ws.NewHub()
	go wsHub.Run()
	if db.RedisEnabled() {
		// Multi-instance mode: fan out scheduler updates through Redis.
		ws.StartRedisSubscriber(wsHub)
	}

	sched := scheduler.NewScheduler(queryService, widgetRepo, dashboardRepo, poolManager, wsHub)
	// The scheduler lives for the process lifetime. Do not create a cancellable
	// context with a deferred cancel here: SetupRoutes returns immediately and
	// would stop the scheduler before its first tick.
	sched.Start(context.Background())

	authHandler := handler.NewAuthHandler(authService)
	datasourceHandler := handler.NewDatasourceHandler(datasourceService)
	queryHandler := handler.NewQueryHandler(queryService)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)
	widgetHandler := handler.NewWidgetHandler(widgetService)
	dashboardFullHandler := handler.NewDashboardFullHandler(widgetService)
	shareHandler := handler.NewShareHandler(shareService)

	// Stricter limiter for credential endpoints to slow brute-force attempts.
	authLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "too many authentication attempts, try again later"})
		},
	})

	// Public auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authLimiter, authHandler.Register)
	auth.Post("/login", authLimiter, authHandler.Login)
	auth.Post("/refresh", authLimiter, authHandler.Refresh)

	// Public share routes
	public := api.Group("/share")
	public.Get("/:token", shareHandler.GetSharedDashboard)
	public.Post("/:token/verify", shareHandler.VerifyPassword)

	// ✅ Protected WebSocket for dashboard editor – FULL PATH, outside rate limiter
	app.Get("/api/v1/ws", middleware.AuthRequiredWS(jwtSecret), middleware.RequireAccessToken, middleware.AttachOrgID, ws.HandleWebSocket(wsHub, func(orgID, dashboardID string) bool {
		dash, err := dashboardRepo.GetByID(dashboardID, orgID)
		return err == nil && dash != nil
	}))

	// ✅ Public WebSocket for shared dashboards – also outside rate limiter
	app.Get("/api/v1/ws/share", ws.HandleShareWebSocket(wsHub, shareService))

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(jwtSecret), middleware.RequireAccessToken, middleware.AttachOrgID)

	// Viewers can read. Only admins and editors can change content.
	editorOnly := middleware.RequireRole("admin", "editor")

	datasources := protected.Group("/datasources")
	datasources.Post("/", editorOnly, datasourceHandler.Create)
	datasources.Get("/", datasourceHandler.List)
	datasources.Get("/:id", datasourceHandler.Get)
	datasources.Put("/:id", editorOnly, datasourceHandler.Update)
	datasources.Delete("/:id", editorOnly, datasourceHandler.Delete)
	datasources.Post("/:id/test", editorOnly, datasourceHandler.TestConnection)
	datasources.Get("/:id/schema", editorOnly, datasourceHandler.GetSchema)

	queries := protected.Group("/queries")
	queries.Post("/", editorOnly, queryHandler.Create)
	queries.Get("/", queryHandler.List)
	queries.Get("/:id", queryHandler.Get)
	queries.Put("/:id", editorOnly, queryHandler.Update)
	queries.Delete("/:id", editorOnly, queryHandler.Delete)
	queries.Post("/:id/execute", queryHandler.ExecuteSaved)
	queries.Post("/execute", editorOnly, queryHandler.ExecuteAdHoc)

	dashboards := protected.Group("/dashboards")
	dashboards.Post("/", editorOnly, dashboardHandler.Create)
	dashboards.Get("/", dashboardHandler.List)
	dashboards.Get("/:id", dashboardHandler.Get)
	dashboards.Put("/:id", editorOnly, dashboardHandler.Update)
	dashboards.Delete("/:id", editorOnly, dashboardHandler.Delete)
	dashboards.Get("/:id/full", dashboardFullHandler.GetFull)
	dashboards.Post("/:id/duplicate", editorOnly, dashboardHandler.Duplicate)
	dashboards.Post("/:id/share", editorOnly, shareHandler.CreateShareLink)

	widgets := dashboards.Group("/:dashboardId/widgets")
	widgets.Post("/", editorOnly, widgetHandler.Create)
	widgets.Put("/:id", editorOnly, widgetHandler.Update)
	widgets.Delete("/:id", editorOnly, widgetHandler.Delete)

	protected.Get("/me", func(c *fiber.Ctx) error {
		userID := middleware.GetUserID(c)
		user, err := userRepo.GetByID(userID)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return c.JSON(user)
	})
}
