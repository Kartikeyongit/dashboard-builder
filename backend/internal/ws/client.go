package ws

import (
	"encoding/json"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
)

type ClientMessage struct {
	Type        string `json:"type"`
	DashboardID string `json:"dashboard_id"`
}

type Client struct {
	conn   *websocket.Conn       // use contrib's type
	send   chan interface{}
	hub    *Hub
	userID string
	orgID  string
}

func HandleWebSocket(hub *Hub) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := middleware.GetUserID(c)
		orgID := c.Locals("orgID").(string)

		return websocket.New(func(conn *websocket.Conn) {
			client := &Client{
				conn:   conn,
				send:   make(chan interface{}, 256),
				hub:    hub,
				userID: userID,
				orgID:  orgID,
			}
			hub.register <- client
			go client.writePump()
			go client.readPump()
		})(c)
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var msg ClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}
		switch msg.Type {
		case "subscribe":
			c.hub.subscribe <- &Subscription{DashboardID: msg.DashboardID, Client: c}
		case "unsubscribe":
			c.hub.unsubscribe <- &Subscription{DashboardID: msg.DashboardID, Client: c}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			json.NewEncoder(w).Encode(message)
			w.Close()
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}