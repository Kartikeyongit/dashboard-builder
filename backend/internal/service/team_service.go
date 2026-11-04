package service

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/pkg/crypto"
	"golang.org/x/crypto/bcrypt"
)

// Team errors are mapped to specific HTTP statuses by the handler.
var (
	ErrInviteInvalid     = errors.New("this invite is invalid, expired, or has already been used")
	ErrInviteEmailExists = errors.New("a member with that email already exists")
	ErrMemberNotFound    = errors.New("member not found")
	ErrLastAdmin         = errors.New("the organization must keep at least one admin")
	ErrSelfRemoval       = errors.New("you cannot remove yourself from the organization")
	ErrInvalidRole       = errors.New("role must be admin, editor, or viewer")
	ErrInvalidEmail      = errors.New("enter a valid email address")
	ErrWeakPassword      = errors.New("password must be at least 8 characters")
	ErrCurrentPassword   = errors.New("current password is incorrect")
)

const (
	inviteLifetime = 7 * 24 * time.Hour
	minPasswordLen = 8
)

var allowedRoles = map[string]bool{"admin": true, "editor": true, "viewer": true}

type TeamService struct {
	teamRepo      *repository.TeamRepo
	userRepo      *repository.UserRepo
	auditService  *AuditService
	encryptionKey string
}

func NewTeamService(teamRepo *repository.TeamRepo, userRepo *repository.UserRepo, auditService *AuditService, encryptionKey string) *TeamService {
	return &TeamService{
		teamRepo:      teamRepo,
		userRepo:      userRepo,
		auditService:  auditService,
		encryptionKey: encryptionKey,
	}
}

func (s *TeamService) ListMembers(orgID string) ([]*model.Member, error) {
	return s.teamRepo.ListMembers(orgID)
}

// CreateInvite makes a one-time onboarding link and returns the raw token so
// the admin can copy it. No email is sent: the product stays free to run.
func (s *TeamService) CreateInvite(orgID, actorID, email, role string) (*model.Invite, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	parsed, err := mail.ParseAddress(email)
	if err != nil || !strings.EqualFold(parsed.Address, email) {
		return nil, "", ErrInvalidEmail
	}
	if !allowedRoles[role] {
		return nil, "", ErrInvalidRole
	}
	exists, err := s.teamRepo.EmailExists(email)
	if err != nil {
		return nil, "", err
	}
	if exists {
		return nil, "", ErrInviteEmailExists
	}

	rawToken, err := newInviteToken()
	if err != nil {
		return nil, "", err
	}
	encryptedToken, err := crypto.Encrypt(rawToken, s.encryptionKey)
	if err != nil {
		return nil, "", fmt.Errorf("encrypt invite: %w", err)
	}

	// Re-inviting the same address supersedes the old pending link.
	if err := s.teamRepo.RevokePendingInvites(orgID, email); err != nil {
		return nil, "", err
	}

	invite := &model.Invite{
		OrgID:          orgID,
		Email:          email,
		Role:           role,
		TokenHash:      hashToken(rawToken),
		TokenEncrypted: encryptedToken,
		InvitedBy:      &actorID,
		ExpiresAt:      time.Now().Add(inviteLifetime),
	}
	created, err := s.teamRepo.CreateInvite(invite)
	if err != nil {
		return nil, "", err
	}
	created.Token = rawToken
	_ = s.auditService.Record(orgID, actorID, "member.invited", "invite", created.ID, email, map[string]any{
		"email": email,
		"role":  role,
	})
	return created, rawToken, nil
}

// ListInvites includes decrypted tokens so pending links stay copyable.
func (s *TeamService) ListInvites(orgID string) ([]*model.Invite, error) {
	invites, err := s.teamRepo.ListPendingInvites(orgID)
	if err != nil {
		return nil, err
	}
	for _, invite := range invites {
		if invite.TokenEncrypted != "" {
			if token, err := crypto.Decrypt(invite.TokenEncrypted, s.encryptionKey); err == nil {
				invite.Token = token
			}
		}
	}
	return invites, nil
}

func (s *TeamService) RevokeInvite(orgID, actorID, inviteID string) error {
	invite, err := s.teamRepo.GetInviteByID(inviteID, orgID)
	if err != nil {
		return err
	}
	if invite == nil || invite.AcceptedAt != nil {
		return ErrInviteInvalid
	}
	revoked, err := s.teamRepo.RevokeInvite(inviteID, orgID)
	if err != nil {
		return err
	}
	if !revoked {
		return ErrInviteInvalid
	}
	_ = s.auditService.Record(orgID, actorID, "member.invite_revoked", "invite", inviteID, invite.Email, map[string]any{
		"email": invite.Email,
	})
	return nil
}

// PreviewInvite is public: it only exposes the organization name, invited
// email, role, and expiry so the signup form can confirm the link.
func (s *TeamService) PreviewInvite(rawToken string) (*model.InvitePreview, error) {
	if strings.TrimSpace(rawToken) == "" {
		return nil, ErrInviteInvalid
	}
	preview, err := s.teamRepo.GetInvitePreview(hashToken(rawToken))
	if err != nil {
		return nil, err
	}
	if preview == nil || time.Now().After(preview.ExpiresAt) {
		return nil, ErrInviteInvalid
	}
	return preview, nil
}

// AcceptInvite claims the invite, creates the account in the inviter's
// organization, and stores the profile name from the signup form.
func (s *TeamService) AcceptInvite(rawToken, displayName, password string) (*model.User, error) {
	if len(password) < minPasswordLen {
		return nil, ErrWeakPassword
	}
	invite, err := s.teamRepo.GetInviteByTokenHash(hashToken(rawToken))
	if err != nil {
		return nil, err
	}
	if invite == nil || time.Now().After(invite.ExpiresAt) {
		return nil, ErrInviteInvalid
	}
	exists, err := s.teamRepo.EmailExists(invite.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrInviteEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Claim first so two concurrent submissions cannot create two accounts.
	claimed, err := s.teamRepo.AcceptInvite(invite.ID)
	if err != nil {
		return nil, err
	}
	if !claimed {
		return nil, ErrInviteInvalid
	}

	user, err := s.userRepo.CreateUser(invite.OrgID, invite.Email, string(hash), invite.Role)
	if err != nil {
		_ = s.teamRepo.ReleaseInvite(invite.ID)
		return nil, ErrInviteEmailExists
	}
	_ = s.userRepo.TouchLastLogin(user.ID)

	displayName = strings.TrimSpace(displayName)
	if displayName != "" {
		_, _ = s.teamRepo.UpsertSettings(user.ID, displayName, "UTC")
	}
	_ = s.auditService.Record(invite.OrgID, user.ID, "member.joined", "user", user.ID, user.Email, map[string]any{
		"email": user.Email,
		"role":  user.Role,
	})
	return user, nil
}

func (s *TeamService) UpdateMemberRole(orgID, actorID, memberID, role string) (*model.Member, error) {
	if !allowedRoles[role] {
		return nil, ErrInvalidRole
	}
	member, err := s.teamRepo.GetMember(memberID, orgID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, ErrMemberNotFound
	}
	if member.Role == "admin" && role != "admin" {
		admins, err := s.teamRepo.CountAdmins(orgID)
		if err != nil {
			return nil, err
		}
		if admins <= 1 {
			return nil, ErrLastAdmin
		}
	}
	if member.Role == role {
		return member, nil
	}
	previousRole := member.Role
	if err := s.teamRepo.UpdateRole(memberID, orgID, role); err != nil {
		return nil, err
	}
	member.Role = role
	_ = s.auditService.Record(orgID, actorID, "member.role_changed", "user", member.ID, memberLabel(member), map[string]any{
		"email": member.Email,
		"from":  previousRole,
		"to":    role,
	})
	return member, nil
}

func (s *TeamService) RemoveMember(orgID, actorID, memberID string) error {
	if actorID == memberID {
		return ErrSelfRemoval
	}
	member, err := s.teamRepo.GetMember(memberID, orgID)
	if err != nil {
		return err
	}
	if member == nil {
		return ErrMemberNotFound
	}
	if member.Role == "admin" {
		admins, err := s.teamRepo.CountAdmins(orgID)
		if err != nil {
			return err
		}
		if admins <= 1 {
			return ErrLastAdmin
		}
	}
	if err := s.teamRepo.DeleteMember(memberID, orgID); err != nil {
		return err
	}
	_ = s.auditService.Record(orgID, actorID, "member.removed", "user", member.ID, memberLabel(member), map[string]any{
		"email": member.Email,
		"role":  member.Role,
	})
	return nil
}

func (s *TeamService) GetSettings(userID string) (*model.UserSettings, error) {
	return s.teamRepo.GetSettings(userID)
}

func (s *TeamService) UpdateSettings(orgID, userID, displayName, timezone string) (*model.UserSettings, error) {
	displayName = strings.TrimSpace(displayName)
	timezone = strings.TrimSpace(timezone)
	if len([]rune(displayName)) > 120 {
		return nil, errors.New("display name must be 120 characters or fewer")
	}
	if timezone == "" {
		timezone = "UTC"
	}
	if len(timezone) > 64 {
		return nil, errors.New("timezone is too long")
	}
	settings, err := s.teamRepo.UpsertSettings(userID, displayName, timezone)
	if err != nil {
		return nil, err
	}
	_ = s.auditService.Record(orgID, userID, "settings.updated", "user", userID, displayName, map[string]any{
		"timezone": timezone,
	})
	return settings, nil
}

func (s *TeamService) ChangePassword(orgID, userID, currentPassword, newPassword string) error {
	if len(newPassword) < minPasswordLen {
		return ErrWeakPassword
	}
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}
	if user == nil || user.OrgID != orgID {
		return ErrMemberNotFound
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrCurrentPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to hash password")
	}
	if err := s.teamRepo.UpdatePassword(userID, string(hash)); err != nil {
		return err
	}
	_ = s.auditService.Record(orgID, userID, "password.changed", "user", userID, user.Email, nil)
	return nil
}

func (s *TeamService) ListAudit(orgID string, limit int) ([]*model.AuditEvent, error) {
	return s.auditService.List(orgID, limit)
}

func newInviteToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate invite token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func memberLabel(member *model.Member) string {
	if member.DisplayName != "" {
		return member.DisplayName
	}
	return member.Email
}
