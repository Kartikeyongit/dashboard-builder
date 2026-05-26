package service

import (
	"context"
	"fmt"
	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

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

// ExecuteSavedQuery runs a saved query by ID.
func (s *QueryService) ExecuteSavedQuery(ctx context.Context, id, orgID string) (*datasource.QueryResult, error) {
	q, err := s.queryRepo.GetByID(id, orgID)
	if err != nil || q == nil {
		return nil, fmt.Errorf("query not found")
	}
	ds, err := s.datasourceRepo.GetByID(q.DatasourceID, orgID)
	if err != nil || ds == nil {
		return nil, fmt.Errorf("datasource not found")
	}
	return s.poolManager.ExecuteQuery(ctx, ds, q.SQLText, q.MaxRows, q.TimeoutMs)
}

// ExecuteAdHoc runs an ad‑hoc query (not saved) for preview.
func (s *QueryService) ExecuteAdHoc(ctx context.Context, orgID, datasourceID, sqlText string, maxRows, timeoutMs int) (*datasource.QueryResult, error) {
	ds, err := s.datasourceRepo.GetByID(datasourceID, orgID)
	if err != nil || ds == nil {
		return nil, fmt.Errorf("datasource not found")
	}
	return s.poolManager.ExecuteQuery(ctx, ds, sqlText, maxRows, timeoutMs)
}