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
	"golang.org/x/crypto/bcrypt"
)

type ShareService struct {
	shareLinkRepo *repository.ShareLinkRepo
	dashboardRepo *repository.DashboardRepo
	widgetService *WidgetService
}

func NewShareService(shareLinkRepo *repository.ShareLinkRepo, dashboardRepo *repository.DashboardRepo, widgetService *WidgetService) *ShareService {
	return &ShareService{
		shareLinkRepo: shareLinkRepo,
		dashboardRepo: dashboardRepo,
		widgetService: widgetService,
	}
}

func (s *ShareService) CreateShareLink(orgID, dashboardID, createdBy string, password *string, expiresAt *time.Time) (string, error) {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil || dash == nil {
		return "", errors.New("dashboard not found")
	}

	rawToken := uuid.New().String() + uuid.New().String()
	tokenHash := hashToken(rawToken)

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
		DashboardID:  dashboardID,
		TokenHash:    tokenHash,
		PasswordHash: passwordHash,
		ExpiresAt:    expiresAt,
		CreatedBy:    createdBy,
	}
	_, err = s.shareLinkRepo.Create(sl)
	if err != nil {
		return "", err
	}
	return rawToken, nil
}

func (s *ShareService) GetDashboardByToken(rawToken string, password *string) (*DashboardFull, error) {
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

	return s.loadSharedDashboard(shareLink.DashboardID)
}

func (s *ShareService) loadSharedDashboard(dashboardID string) (*DashboardFull, error) {
	dash, err := s.dashboardRepo.GetByIDUnscoped(dashboardID)
	if err != nil || dash == nil {
		return nil, errors.New("dashboard not found")
	}
	return s.widgetService.LoadDashboardWithData(context.Background(), dash.OrgID, dashboardID)
}

var ErrPasswordRequired = errors.New("password required")

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}