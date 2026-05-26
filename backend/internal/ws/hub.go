package ws

import (
	"sync"
)

type Hub struct {
	mu          sync.RWMutex
	dashboards  map[string]map[*Client]bool
	register    chan *Client
	unregister  chan *Client
	subscribe   chan *Subscription
	unsubscribe chan *Subscription
}

type Subscription struct {
	DashboardID string
	Client      *Client
}

func NewHub() *Hub {
	return &Hub{
		dashboards:  make(map[string]map[*Client]bool),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		subscribe:   make(chan *Subscription),
		unsubscribe: make(chan *Subscription),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case <-h.register:
			// client registered (already stored in dashboards map on subscribe)
		case client := <-h.unregister:
			h.removeClient(client)
		case sub := <-h.subscribe:
			h.addClientToDashboard(sub.DashboardID, sub.Client)
		case sub := <-h.unsubscribe:
			h.removeClientFromDashboard(sub.DashboardID, sub.Client)
		}
	}
}

func (h *Hub) addClientToDashboard(dashboardID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.dashboards[dashboardID]; !ok {
		h.dashboards[dashboardID] = make(map[*Client]bool)
	}
	h.dashboards[dashboardID][client] = true
}

func (h *Hub) removeClientFromDashboard(dashboardID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.dashboards[dashboardID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.dashboards, dashboardID)
		}
	}
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for dashID, clients := range h.dashboards {
		if _, ok := clients[client]; ok {
			delete(clients, client)
			if len(clients) == 0 {
				delete(h.dashboards, dashID)
			}
		}
	}
}

func (h *Hub) BroadcastToDashboard(dashboardID string, message interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if clients, ok := h.dashboards[dashboardID]; ok {
		for client := range clients {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(clients, client)
			}
		}
	}
}