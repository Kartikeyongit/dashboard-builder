package service

import (
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

// AuditService records team and sharing events and reads them back for the
// activity page. Writing is intentionally best-effort: an audit failure must
// never undo the action the user asked for.
type AuditService struct {
	repo *repository.TeamRepo
}

func NewAuditService(repo *repository.TeamRepo) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Record(orgID, actorID, action, targetType, targetID, targetName string, metadata map[string]any) error {
	event := &model.AuditEvent{
		OrgID:      orgID,
		Action:     action,
		TargetType: targetType,
		TargetName: targetName,
		Metadata:   metadata,
	}
	if actorID != "" {
		event.ActorID = &actorID
	}
	if targetID != "" {
		event.TargetID = &targetID
	}
	return s.repo.CreateAuditEvent(event)
}

func (s *AuditService) List(orgID string, limit int) ([]*model.AuditEvent, error) {
	return s.repo.ListAuditEvents(orgID, limit)
}
