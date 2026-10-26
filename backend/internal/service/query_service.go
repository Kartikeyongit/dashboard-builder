package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

const (
	DefaultMaxRows      = 1000
	MaxAllowedRows      = 10000
	DefaultTimeoutMs    = 30000
	MaxAllowedTimeoutMs = 60000
	MinAllowedTimeoutMs = 1000
)

// NormalizeQueryLimits applies safe defaults and hard caps. Zero or negative
// values must never reach the database driver.
func NormalizeQueryLimits(maxRows, timeoutMs int) (int, int) {
	if maxRows <= 0 {
		maxRows = DefaultMaxRows
	}
	if maxRows > MaxAllowedRows {
		maxRows = MaxAllowedRows
	}
	if timeoutMs <= 0 {
		timeoutMs = DefaultTimeoutMs
	}
	if timeoutMs < MinAllowedTimeoutMs {
		timeoutMs = MinAllowedTimeoutMs
	}
	if timeoutMs > MaxAllowedTimeoutMs {
		timeoutMs = MaxAllowedTimeoutMs
	}
	return maxRows, timeoutMs
}

type QueryService struct {
	queryRepo      *repository.QueryRepo
	datasourceRepo *repository.DatasourceRepo
	poolManager    *datasource.PoolManager
}

func NewQueryService(queryRepo *repository.QueryRepo, datasourceRepo *repository.DatasourceRepo, poolManager *datasource.PoolManager) *QueryService {
	return &QueryService{
		queryRepo:      queryRepo,
		datasourceRepo: datasourceRepo,
		poolManager:    poolManager,
	}
}

func (s *QueryService) Create(orgID, datasourceID, name, sqlText string, maxRows, timeoutMs int, createdBy string) (*model.Query, error) {
	name = strings.TrimSpace(name)
	sqlText = strings.TrimSpace(sqlText)
	if name == "" {
		return nil, fmt.Errorf("query name is required")
	}
	if sqlText == "" {
		return nil, fmt.Errorf("SQL text is required")
	}
	if datasourceID == "" {
		return nil, fmt.Errorf("datasource is required")
	}
	// Reject a datasource from another organization.
	ds, err := s.datasourceRepo.GetByID(datasourceID, orgID)
	if err != nil {
		return nil, err
	}
	if ds == nil {
		return nil, fmt.Errorf("datasource not found")
	}
	maxRows, timeoutMs = NormalizeQueryLimits(maxRows, timeoutMs)

	q := &model.Query{
		OrgID:        orgID,
		DatasourceID: datasourceID,
		Name:         name,
		SQLText:      sqlText,
		MaxRows:      maxRows,
		TimeoutMs:    timeoutMs,
		CreatedBy:    createdBy,
	}
	return s.queryRepo.Create(q)
}

func (s *QueryService) GetByID(id, orgID string) (*model.Query, error) {
	return s.queryRepo.GetByID(id, orgID)
}

func (s *QueryService) ListByOrg(orgID string) ([]*model.Query, error) {
	return s.queryRepo.ListByOrg(orgID)
}

func (s *QueryService) Update(id, orgID, datasourceID, name, sqlText string, maxRows, timeoutMs int) error {
	q, err := s.queryRepo.GetByID(id, orgID)
	if err != nil || q == nil {
		return fmt.Errorf("query not found")
	}
	name = strings.TrimSpace(name)
	sqlText = strings.TrimSpace(sqlText)
	if name == "" {
		return fmt.Errorf("query name is required")
	}
	if sqlText == "" {
		return fmt.Errorf("SQL text is required")
	}
	if datasourceID == "" {
		datasourceID = q.DatasourceID
	}
	ds, err := s.datasourceRepo.GetByID(datasourceID, orgID)
	if err != nil {
		return err
	}
	if ds == nil {
		return fmt.Errorf("datasource not found")
	}
	// Keep existing limits when the client omits them (common for older clients).
	if maxRows <= 0 {
		maxRows = q.MaxRows
	}
	if timeoutMs <= 0 {
		timeoutMs = q.TimeoutMs
	}
	maxRows, timeoutMs = NormalizeQueryLimits(maxRows, timeoutMs)

	q.DatasourceID = datasourceID
	q.Name = name
	q.SQLText = sqlText
	q.MaxRows = maxRows
	q.TimeoutMs = timeoutMs
	return s.queryRepo.Update(q)
}

func (s *QueryService) Delete(id, orgID string) error {
	return s.queryRepo.Delete(id, orgID)
}

// ExecuteSavedQuery runs a saved query by ID using its default filter values
// (which are none unless the caller supplies them).
func (s *QueryService) ExecuteSavedQuery(ctx context.Context, id, orgID string) (*datasource.QueryResult, error) {
	return s.ExecuteSavedQueryWithParams(ctx, id, orgID, nil)
}

// ExecuteSavedQueryWithParams runs a saved query after substituting any
// {{filter}} placeholders with bound parameters.
func (s *QueryService) ExecuteSavedQueryWithParams(ctx context.Context, id, orgID string, values map[string]interface{}) (*datasource.QueryResult, error) {
	q, err := s.queryRepo.GetByID(id, orgID)
	if err != nil || q == nil {
		return nil, fmt.Errorf("query not found")
	}
	ds, err := s.datasourceRepo.GetByID(q.DatasourceID, orgID)
	if err != nil || ds == nil {
		return nil, fmt.Errorf("datasource not found")
	}
	maxRows, timeoutMs := NormalizeQueryLimits(q.MaxRows, q.TimeoutMs)

	sqlText, args, err := datasource.SubstituteFilterParams(q.SQLText, values, ds.Type)
	if err != nil {
		return nil, err
	}
	return s.poolManager.ExecuteQuery(ctx, ds, sqlText, maxRows, timeoutMs, args...)
}

// ExecuteAdHoc runs an ad‑hoc query (not saved) for preview.
func (s *QueryService) ExecuteAdHoc(ctx context.Context, orgID, datasourceID, sqlText string, maxRows, timeoutMs int) (*datasource.QueryResult, error) {
	ds, err := s.datasourceRepo.GetByID(datasourceID, orgID)
	if err != nil || ds == nil {
		return nil, fmt.Errorf("datasource not found")
	}
	maxRows, timeoutMs = NormalizeQueryLimits(maxRows, timeoutMs)
	return s.poolManager.ExecuteQuery(ctx, ds, sqlText, maxRows, timeoutMs)
}
