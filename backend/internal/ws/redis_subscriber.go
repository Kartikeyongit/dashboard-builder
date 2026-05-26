package ws

import (
	"context"
	"encoding/json"
	"log"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/db"
)

type WidgetPayload struct {
	Type     string                 `json:"type"`
	WidgetID string                 `json:"widget_id"`
	Data     *datasource.QueryResult `json:"data,omitempty"`
	Error    string                 `json:"error,omitempty"`
}

func StartRedisSubscriber(hub *Hub) {
	go func() {
		ctx := context.Background()
		pubsub := db.RedisClient.PSubscribe(ctx, "dashboard:*")
		defer pubsub.Close()
		ch := pubsub.Channel()
		for msg := range ch {
			dashboardID := msg.Channel[len("dashboard:"):]
			var payload WidgetPayload
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
				log.Printf("Invalid pubsub message: %v", err)
				continue
			}
			hub.BroadcastToDashboard(dashboardID, payload)
		}
	}()
}