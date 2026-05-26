package model

import "time"

type Datasource struct {
	ID                string    `json:"id"`
	OrgID             string    `json:"org_id"`
	Name              string    `json:"name"`
	Type              string    `json:"type"`    // "postgres" or "mysql"
	Host              string    `json:"host"`
	Port              int       `json:"port"`
	DBName            string    `json:"db_name"`
	Username          string    `json:"username"`
	EncryptedPassword string    `json:"-"`        // never expose to client
	SSLMode           string    `json:"ssl_mode"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}