package repository

import (
	"database/sql"
	"fmt"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) CreateUser(orgID, email, passwordHash, role string) (*model.User, error) {
	user := &model.User{}
	err := r.db.QueryRow(
		`INSERT INTO users (org_id, email, password_hash, role) 
		 VALUES ($1, $2, $3, $4) 
		 RETURNING id, org_id, email, password_hash, role, created_at`,
		orgID, email, passwordHash, role,
	).Scan(&user.ID, &user.OrgID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (r *UserRepo) GetByEmail(email string) (*model.User, error) {
	user := &model.User{}
	err := r.db.QueryRow(
		`SELECT id, org_id, email, password_hash, role, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.OrgID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return user, nil
}

func (r *UserRepo) GetByID(id string) (*model.User, error) {
	user := &model.User{}
	err := r.db.QueryRow(
		`SELECT id, org_id, email, password_hash, role, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.OrgID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepo) CreateOrganization(name string) (string, error) {
	var orgID string
	err := r.db.QueryRow(
		`INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
		name,
	).Scan(&orgID)
	if err != nil {
		return "", fmt.Errorf("create org: %w", err)
	}
	return orgID, nil
}

// TouchLastLogin records a successful sign-in for the team directory. It is
// best-effort: a failure here must never block login.
func (r *UserRepo) TouchLastLogin(id string) error {
	_, err := r.db.Exec(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, id)
	return err
}
