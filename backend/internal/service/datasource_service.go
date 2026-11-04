package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/pkg/crypto"
)

// ErrDatasourceInUse blocks a delete that would orphan saved queries (and the
// widgets built on them). The API returns the dependency list with a 409.
var ErrDatasourceInUse = errors.New("datasource is used by queries")

type DatasourceService struct {
	repo        *repository.DatasourceRepo
	queryRepo   *repository.QueryRepo
	poolManager *datasource.PoolManager
	encKey      string
	cache       *ResultCache
}

func (s *DatasourceService) PoolManager() *datasource.PoolManager {
	return s.poolManager
}

func NewDatasourceService(repo *repository.DatasourceRepo, queryRepo *repository.QueryRepo, poolManager *datasource.PoolManager, encKey string, cache *ResultCache) *DatasourceService {
	return &DatasourceService{repo: repo, queryRepo: queryRepo, poolManager: poolManager, encKey: encKey, cache: cache}
}

func (s *DatasourceService) Create(orgID, name, dsType, host string, port int, dbName, username, password, sslMode string) (*model.Datasource, error) {
	encPass, err := crypto.Encrypt(password, s.encKey)
	if err != nil {
		return nil, fmt.Errorf("encrypt password: %w", err)
	}
	ds := &model.Datasource{
		OrgID:             orgID,
		Name:              name,
		Type:              dsType,
		Host:              host,
		Port:              port,
		DBName:            dbName,
		Username:          username,
		EncryptedPassword: encPass,
		SSLMode:           sslMode,
	}
	return s.repo.Create(ds)
}

func (s *DatasourceService) GetByID(id, orgID string) (*model.Datasource, error) {
	return s.repo.GetByID(id, orgID)
}

func (s *DatasourceService) ListByOrg(orgID string) ([]*model.Datasource, error) {
	return s.repo.ListByOrg(orgID)
}

func (s *DatasourceService) Update(id, orgID, name, host string, port int, dbName, username, password, sslMode string) error {
	ds, err := s.repo.GetByID(id, orgID)
	if err != nil || ds == nil {
		return fmt.Errorf("datasource not found")
	}
	// Only re-encrypt if password changed
	if password != "" {
		encPass, err := crypto.Encrypt(password, s.encKey)
		if err != nil {
			return err
		}
		ds.EncryptedPassword = encPass
	}
	ds.Name = name
	ds.Host = host
	ds.Port = port
	ds.DBName = dbName
	ds.Username = username
	ds.SSLMode = sslMode
	// Reset existing pool so it gets recreated with new credentials
	s.poolManager.RemovePool(ds.ID, ds.Type)
	if err := s.repo.Update(ds); err != nil {
		return err
	}
	s.cache.InvalidateDatasource(id)
	return nil
}

// ListUsage returns the queries and dashboards that depend on a datasource.
func (s *DatasourceService) ListUsage(id, orgID string) (*model.DatasourceUsage, error) {
	ds, err := s.repo.GetByID(id, orgID)
	if err != nil || ds == nil {
		return nil, fmt.Errorf("datasource not found")
	}
	return s.queryRepo.ListDatasourceUsage(id, orgID)
}

func (s *DatasourceService) Delete(id, orgID string) error {
	ds, err := s.repo.GetByID(id, orgID)
	if err != nil || ds == nil {
		return fmt.Errorf("datasource not found")
	}
	usage, err := s.queryRepo.ListDatasourceUsage(id, orgID)
	if err != nil {
		return err
	}
	if len(usage.Queries) > 0 {
		return fmt.Errorf("%w: %d quer(ies) and %d widget(s)", ErrDatasourceInUse, len(usage.Queries), len(usage.Widgets))
	}
	s.poolManager.RemovePool(ds.ID, ds.Type)
	if err := s.repo.Delete(id, orgID); err != nil {
		return err
	}
	s.cache.InvalidateDatasource(id)
	return nil
}

// TestConnection pings a saved datasource and reports how long the round trip
// took. The latency is shown in the UI so a slow host is visible before save.
func (s *DatasourceService) TestConnection(id, orgID string) (time.Duration, error) {
	ds, err := s.repo.GetByID(id, orgID)
	if err != nil || ds == nil {
		return 0, fmt.Errorf("datasource not found")
	}
	start := time.Now()
	err = s.poolManager.TestConnection(context.Background(), ds)
	return time.Since(start), err
}

// TestConnectionConfig pings connection settings that have not been saved yet.
// It uses a throwaway datasource ID so the probe never reuses a real pool.
func (s *DatasourceService) TestConnectionConfig(dsType, host string, port int, dbName, username, password, sslMode string) (time.Duration, error) {
	encPass, err := crypto.Encrypt(password, s.encKey)
	if err != nil {
		return 0, fmt.Errorf("encrypt password: %w", err)
	}
	ds := &model.Datasource{
		ID:                "test-" + uuid.NewString(),
		Type:              dsType,
		Host:              host,
		Port:              port,
		DBName:            dbName,
		Username:          username,
		EncryptedPassword: encPass,
		SSLMode:           sslMode,
	}
	start := time.Now()
	err = s.poolManager.TestConnection(context.Background(), ds)
	s.poolManager.RemovePool(ds.ID, ds.Type)
	return time.Since(start), err
}
