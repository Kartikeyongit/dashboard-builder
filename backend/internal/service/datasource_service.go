package service

import (
	"context"
	"fmt"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/pkg/crypto"
)

type DatasourceService struct {
	repo        *repository.DatasourceRepo
	poolManager *datasource.PoolManager
	encKey      string
}

func (s *DatasourceService) PoolManager() *datasource.PoolManager {
	return s.poolManager
}

func NewDatasourceService(repo *repository.DatasourceRepo, poolManager *datasource.PoolManager, encKey string) *DatasourceService {
	return &DatasourceService{repo: repo, poolManager: poolManager, encKey: encKey}
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
	return s.repo.Update(ds)
}

func (s *DatasourceService) Delete(id, orgID string) error {
	ds, err := s.repo.GetByID(id, orgID)
	if err != nil || ds == nil {
		return fmt.Errorf("datasource not found")
	}
	s.poolManager.RemovePool(ds.ID, ds.Type)
	return s.repo.Delete(id, orgID)
}

func (s *DatasourceService) TestConnection(id, orgID string) error {
	ds, err := s.repo.GetByID(id, orgID)
	if err != nil || ds == nil {
		return fmt.Errorf("datasource not found")
	}
	return s.poolManager.TestConnection(context.Background(), ds)
}
