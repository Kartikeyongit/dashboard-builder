package ws

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

func HandleShareWebSocket(hub *Hub, shareService *service.ShareService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Query("token")
		if token == "" {
			return fiber.NewError(fiber.StatusBadRequest, "missing share token")
		}

		dashFull, err := shareService.GetDashboardByToken(token, nil)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid share token")
		}

		dashboardID := dashFull.Dashboard.ID

		return websocket.New(func(conn *websocket.Conn) {
			client := &Client{
				conn:   conn,
				send:   make(chan interface{}, 256),
				hub:    hub,
				userID: "share-" + token[:8],
				orgID:  dashFull.Dashboard.OrgID,
			}
			hub.register <- client
			hub.subscribe <- &Subscription{DashboardID: dashboardID, Client: client}
			go client.writePump()
			go client.readPump()
		})(c)
	}
}