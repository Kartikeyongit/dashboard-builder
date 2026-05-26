package datasource

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/go-sql-driver/mysql"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/pkg/crypto"
)

type PoolManager struct {
	mu            sync.RWMutex
	pgxPools      map[string]*pgxpool.Pool
	sqlDBs        map[string]*sql.DB
	encryptionKey string
	cleanupTicker *time.Ticker
	done          chan struct{}
}

func NewPoolManager(encryptionKey string) *PoolManager {
	pm := &PoolManager{
		pgxPools:      make(map[string]*pgxpool.Pool),
		sqlDBs:        make(map[string]*sql.DB),
		encryptionKey: encryptionKey,
		cleanupTicker: time.NewTicker(10 * time.Minute),
		done:          make(chan struct{}),
	}
	go pm.cleanupLoop()
	return pm
}

func (pm *PoolManager) GetPool(ctx context.Context, ds *model.Datasource) (interface{}, error) {
	pm.mu.RLock()
	if ds.Type == "postgres" {
		if pool, ok := pm.pgxPools[ds.ID]; ok {
			pm.mu.RUnlock()
			return pool, nil
		}
	} else if ds.Type == "mysql" {
		if db, ok := pm.sqlDBs[ds.ID]; ok {
			pm.mu.RUnlock()
			return db, nil
		}
	}
	pm.mu.RUnlock()
	return pm.createPool(ctx, ds)
}

func (pm *PoolManager) createPool(ctx context.Context, ds *model.Datasource) (interface{}, error) {
	password, err := crypto.Decrypt(ds.EncryptedPassword, pm.encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("decrypt password: %w", err)
	}

	pm.mu.Lock()
	defer pm.mu.Unlock()

	if ds.Type == "postgres" {
		if pool, ok := pm.pgxPools[ds.ID]; ok {
			return pool, nil
		}
		connStr := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
			ds.Username, password, ds.Host, ds.Port, ds.DBName, ds.SSLMode)
		config, err := pgxpool.ParseConfig(connStr)
		if err != nil {
			return nil, fmt.Errorf("parse pg config: %w", err)
		}
		config.MaxConns = 10
		pool, err := pgxpool.NewWithConfig(ctx, config)
		if err != nil {
			return nil, fmt.Errorf("create pg pool: %w", err)
		}
		pm.pgxPools[ds.ID] = pool
		return pool, nil
	}

	if ds.Type == "mysql" {
		if db, ok := pm.sqlDBs[ds.ID]; ok {
			return db, nil
		}
		connStr := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&timeout=5s",
			ds.Username, password, ds.Host, ds.Port, ds.DBName)
		db, err := sql.Open("mysql", connStr)
		if err != nil {
			return nil, fmt.Errorf("open mysql connection: %w", err)
		}
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		pm.sqlDBs[ds.ID] = db
		return db, nil
	}

	return nil, fmt.Errorf("unsupported datasource type: %s", ds.Type)
}

func (pm *PoolManager) TestConnection(ctx context.Context, ds *model.Datasource) error {
	pool, err := pm.GetPool(ctx, ds)
	if err != nil {
		return err
	}
	switch p := pool.(type) {
	case *pgxpool.Pool:
		return p.Ping(ctx)
	case *sql.DB:
		return p.PingContext(ctx)
	default:
		return fmt.Errorf("unknown pool type")
	}
}

func (pm *PoolManager) RemovePool(datasourceID, dsType string) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	if dsType == "postgres" {
		if pool, ok := pm.pgxPools[datasourceID]; ok {
			pool.Close()
			delete(pm.pgxPools, datasourceID)
		}
	} else if dsType == "mysql" {
		if db, ok := pm.sqlDBs[datasourceID]; ok {
			db.Close()
			delete(pm.sqlDBs, datasourceID)
		}
	}
}

func (pm *PoolManager) cleanupLoop() {
	for {
		select {
		case <-pm.cleanupTicker.C:
			pm.cleanupIdlePools()
		case <-pm.done:
			return
		}
	}
}

func (pm *PoolManager) cleanupIdlePools() {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	for id, db := range pm.sqlDBs {
		if err := db.Ping(); err != nil {
			log.Printf("Removing stale MySQL pool for %s", id)
			db.Close()
			delete(pm.sqlDBs, id)
		}
	}
}

func (pm *PoolManager) Shutdown() {
	close(pm.done)
	pm.cleanupTicker.Stop()
	pm.mu.Lock()
	defer pm.mu.Unlock()
	for _, pool := range pm.pgxPools {
		pool.Close()
	}
	for _, db := range pm.sqlDBs {
		db.Close()
	}
}