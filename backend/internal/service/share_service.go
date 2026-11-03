package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/pkg/crypto"
	"golang.org/x/crypto/bcrypt"
)

// ShareLinkInfo is the owner-facing view of a link. Token is empty for legacy
// links created before encrypted storage was added; those still work, but can
// no longer be copied and must be recreated to get a fresh copyable link.
type ShareLinkInfo struct {
	ID                string     `json:"id"`
	Token             string     `json:"-"`
	PasswordProtected bool       `json:"password_protected"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty"`
	LastUsedAt        *time.Time `json:"last_used_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	IsActive          bool       `json:"is_active"`
}

type ShareService struct {
	shareLinkRepo *repository.ShareLinkRepo
	dashboardRepo *repository.DashboardRepo
	widgetService *WidgetService
	encryptionKey string
}

func NewShareService(shareLinkRepo *repository.ShareLinkRepo, dashboardRepo *repository.DashboardRepo, widgetService *WidgetService, encryptionKey string) *ShareService {
	return &ShareService{
		shareLinkRepo: shareLinkRepo,
		dashboardRepo: dashboardRepo,
		widgetService: widgetService,
		encryptionKey: encryptionKey,
	}
}

func (s *ShareService) CreateShareLink(orgID, dashboardID, createdBy string, password *string, expiresAt *time.Time) (string, error) {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil || dash == nil {
		return "", errors.New("dashboard not found")
	}

	rawToken := uuid.New().String() + uuid.New().String()
	tokenHash := hashToken(rawToken)

	encryptedToken, err := crypto.Encrypt(rawToken, s.encryptionKey)
	if err != nil {
		return "", err
	}

	var passwordHash *string
	if password != nil && *password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
		if err != nil {
			return "", err
		}
		hashStr := string(hash)
		passwordHash = &hashStr
	}

	sl := &model.ShareLink{
		DashboardID:    dashboardID,
		TokenHash:      tokenHash,
		TokenEncrypted: &encryptedToken,
		PasswordHash:   passwordHash,
		ExpiresAt:      expiresAt,
		CreatedBy:      createdBy,
	}
	_, err = s.shareLinkRepo.Create(sl)
	if err != nil {
		return "", err
	}
	return rawToken, nil
}

// ListShareLinks returns every link for a dashboard, newest active first. It
// verifies the dashboard belongs to the caller's organization before reading.
func (s *ShareService) ListShareLinks(orgID, dashboardID string) ([]ShareLinkInfo, error) {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil || dash == nil {
		return nil, errors.New("dashboard not found")
	}

	links, err := s.shareLinkRepo.ListByDashboard(dashboardID)
	if err != nil {
		return nil, err
	}

	out := make([]ShareLinkInfo, 0, len(links))
	for _, link := range links {
		info := ShareLinkInfo{
			ID:                link.ID,
			PasswordProtected: link.PasswordHash != nil,
			ExpiresAt:         link.ExpiresAt,
			LastUsedAt:        link.LastUsedAt,
			CreatedAt:         link.CreatedAt,
			IsActive:          link.IsActive,
		}
		if link.TokenEncrypted != nil && *link.TokenEncrypted != "" {
			if token, err := crypto.Decrypt(*link.TokenEncrypted, s.encryptionKey); err == nil {
				info.Token = token
			}
		}
		out = append(out, info)
	}
	return out, nil
}

// RevokeShareLink deactivates a link after confirming it belongs to the
// dashboard and organization. Revocation is idempotent.
func (s *ShareService) RevokeShareLink(orgID, dashboardID, shareID string) error {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil || dash == nil {
		return errors.New("dashboard not found")
	}
	link, err := s.shareLinkRepo.GetByID(shareID, dashboardID)
	if err != nil {
		return err
	}
	if link == nil {
		return errors.New("share link not found")
	}
	if !link.IsActive {
		return nil
	}
	return s.shareLinkRepo.Deactivate(shareID)
}

// GetDashboardByToken validates a public link and loads the dashboard with the
// supplied filter overrides so shared views can be filtered without an account.
func (s *ShareService) GetDashboardByToken(rawToken string, password *string, overrides map[string]string) (*DashboardFull, error) {
	tokenHash := hashToken(rawToken)
	shareLink, err := s.shareLinkRepo.GetByTokenHash(tokenHash)
	if err != nil || shareLink == nil {
		return nil, errors.New("invalid or inactive share link")
	}

	if shareLink.ExpiresAt != nil && time.Now().After(*shareLink.ExpiresAt) {
		return nil, errors.New("share link has expired")
	}

	if shareLink.PasswordHash != nil {
		if password == nil {
			return nil, ErrPasswordRequired
		}
		if err := bcrypt.CompareHashAndPassword([]byte(*shareLink.PasswordHash), []byte(*password)); err != nil {
			return nil, errors.New("incorrect password")
		}
	}

	// Best-effort metadata. A failure here must never block a valid view.
	_ = s.shareLinkRepo.TouchLastUsed(shareLink.ID)

	return s.loadSharedDashboard(shareLink.DashboardID, overrides)
}

func (s *ShareService) loadSharedDashboard(dashboardID string, overrides map[string]string) (*DashboardFull, error) {
	dash, err := s.dashboardRepo.GetByIDUnscoped(dashboardID)
	if err != nil || dash == nil {
		return nil, errors.New("dashboard not found")
	}
	return s.widgetService.LoadDashboardWithData(context.Background(), dash.OrgID, dashboardID, overrides)
}

var ErrPasswordRequired = errors.New("password required")

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
