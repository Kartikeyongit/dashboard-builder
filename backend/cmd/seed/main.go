// backend/cmd/seed/main.go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	// Replace with your actual module path
	"github.com/your-org/dashboard-builder/backend/pkg/crypto"
)

func main() {
	rand.Seed(time.Now().UnixNano())

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, using system env")
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL not set")
	}
	encKey := os.Getenv("ENCRYPTION_KEY")
	if encKey == "" {
		log.Fatal("ENCRYPTION_KEY not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("DB ping failed: %v", err)
	}

	// ---------- Helper functions ----------
	exec := func(query string, args ...interface{}) {
		_, err := db.Exec(query, args...)
		if err != nil {
			log.Fatalf("Exec failed: %v\nSQL: %s", err, query)
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt: %v", err)
	}
	pwHash := string(hash)

	encPass, err := crypto.Encrypt("devpass", encKey)
	if err != nil {
		log.Fatalf("encrypt devpass: %v", err)
	}
	_, _ = crypto.Encrypt("demo", encKey) // not used, but was in original; keep for consistency

	// 1. Insert base org / users / datasources
	exec(`INSERT INTO organizations (id, name) VALUES ($1, 'Acme Corp') ON CONFLICT (id) DO NOTHING`, "00000000-0000-0000-0000-000000000001")
	exec(fmt.Sprintf(`INSERT INTO users (id, org_id, email, password_hash, role) VALUES
		('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'admin@acme.com', '%s', 'admin'),
		('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'editor@acme.com', '%s', 'editor')
		ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`, pwHash, pwHash))
	exec(fmt.Sprintf(`INSERT INTO datasources (id, org_id, name, type, host, port, db_name, username, encrypted_password, ssl_mode) VALUES
		('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Internal PostgreSQL', 'postgres', 'localhost', 5432, 'dashboard_builder', 'dashboard', '%s', 'disable')
		ON CONFLICT (id) DO NOTHING`, encPass))

	// 2. Create sample tables (drop if exist to refresh)
	exec(`DROP TABLE IF EXISTS sample_customers CASCADE`)
	exec(`DROP TABLE IF EXISTS sample_products CASCADE`)
	exec(`DROP TABLE IF EXISTS sample_orders CASCADE`)
	exec(`DROP TABLE IF EXISTS sample_events CASCADE`)
	exec(`DROP TABLE IF EXISTS sample_metrics CASCADE`)

	exec(`CREATE TABLE sample_customers (
		id SERIAL PRIMARY KEY,
		name TEXT,
		email TEXT,
		signup_date DATE,
		country TEXT
	)`)
	exec(`CREATE TABLE sample_products (
		id SERIAL PRIMARY KEY,
		name TEXT,
		category TEXT,
		price NUMERIC(10,2),
		stock INT
	)`)
	exec(`CREATE TABLE sample_orders (
		id SERIAL PRIMARY KEY,
		customer_id INT REFERENCES sample_customers(id),
		product_id INT REFERENCES sample_products(id),
		quantity INT,
		order_date TIMESTAMP,
		amount NUMERIC(10,2)
	)`)
	exec(`CREATE TABLE sample_events (
		id SERIAL PRIMARY KEY,
		event_type TEXT,
		user_id INT,
		created_at TIMESTAMP,
		metadata JSONB
	)`)
	exec(`CREATE TABLE sample_metrics (
		id SERIAL PRIMARY KEY,
		metric_name TEXT,
		value DOUBLE PRECISION,
		recorded_at TIMESTAMP
	)`)

	// 3. Generate and insert data
	log.Println("Inserting customers...")
	countries := []string{"US", "UK", "DE", "FR", "JP", "IN", "BR", "CA", "AU", "NL"}
	firstNames := []string{"Alice","Bob","Charlie","Diana","Eve","Frank","Grace","Hank","Ivy","Jack","Kate","Leo","Mia","Noah","Olivia","Paul","Quinn","Rose","Sam","Tina"}
	lastNames := []string{"Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez"}

	for i := 0; i < 200; i++ {
		fn := firstNames[rand.Intn(len(firstNames))]
		ln := lastNames[rand.Intn(len(lastNames))]
		name := fn + " " + ln
		email := fmt.Sprintf("%s.%s%d@example.com", fn, ln, i)
		signup := time.Date(2023, time.January, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, rand.Intn(730))
		country := countries[rand.Intn(len(countries))]
		exec(`INSERT INTO sample_customers (name, email, signup_date, country) VALUES ($1,$2,$3,$4)`,
			name, email, signup.Format("2006-01-02"), country)
	}

	log.Println("Inserting products...")
	categories := []string{"Electronics", "Clothing", "Home", "Sports", "Books", "Toys", "Food", "Beauty"}
	for i := 1; i <= 50; i++ {
		prodName := fmt.Sprintf("Product-%d", i)
		cat := categories[rand.Intn(len(categories))]
		price := 5.0 + rand.Float64()*495.0
		stock := 10 + rand.Intn(200)
		exec(`INSERT INTO sample_products (name, category, price, stock) VALUES ($1,$2,$3,$4)`,
			prodName, cat, price, stock)
	}

	log.Println("Inserting orders (this may take a few seconds)...")
	for i := 0; i < 1000; i++ {
		custID := 1 + rand.Intn(200)
		prodID := 1 + rand.Intn(50)
		qty := 1 + rand.Intn(5)
		baseDate := time.Date(2024, time.June, 1, 0, 0, 0, 0, time.UTC)
		orderDate := baseDate.Add(time.Duration(rand.Intn(31536000)) * time.Second)
		amount := float64(qty) * (5.0 + rand.Float64()*495.0)
		exec(`INSERT INTO sample_orders (customer_id, product_id, quantity, order_date, amount)
			VALUES ($1,$2,$3,$4,$5)`, custID, prodID, qty, orderDate, amount)
	}

	log.Println("Inserting events...")
	eventTypes := []string{"page_view", "click", "login", "logout", "purchase", "error", "search"}
	for i := 0; i < 500; i++ {
		eType := eventTypes[rand.Intn(len(eventTypes))]
		userID := 1 + rand.Intn(200)
		t := time.Now().Add(-time.Duration(rand.Intn(86400*30)) * time.Second)
		meta := fmt.Sprintf(`{"browser":"Chrome","os":"%s"}`, map[int]string{0:"Windows",1:"Mac",2:"Linux"}[rand.Intn(3)])
		exec(`INSERT INTO sample_events (event_type, user_id, created_at, metadata) VALUES ($1,$2,$3,$4)`,
			eType, userID, t, meta)
	}

	log.Println("Inserting metrics (2880 rows)...")
	baseTime := time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < 1440; i++ {
		t := baseTime.Add(time.Duration(i) * time.Hour)
		cpu := 10.0 + rand.Float64()*90.0
		mem := 20.0 + rand.Float64()*60.0
		exec(`INSERT INTO sample_metrics (metric_name, value, recorded_at) VALUES ('cpu_usage', $1, $2)`, cpu, t)
		exec(`INSERT INTO sample_metrics (metric_name, value, recorded_at) VALUES ('memory_usage', $1, $2)`, mem, t)
	}

	// 4. Insert many saved queries
	log.Println("Creating queries...")
	queries := []struct{ id, name, sql string }{
		{"22222222-2222-2222-2222-000000000001", "Total Customers", "SELECT COUNT(*) AS total FROM sample_customers;"},
		{"22222222-2222-2222-2222-000000000002", "Customers by Country", "SELECT country, COUNT(*) AS cnt FROM sample_customers GROUP BY country ORDER BY cnt DESC;"},
		{"22222222-2222-2222-2222-000000000003", "Recent Signups", "SELECT name, email, signup_date FROM sample_customers ORDER BY signup_date DESC LIMIT 20;"},
		{"22222222-2222-2222-2222-000000000004", "Top Products by Stock", "SELECT name, category, stock FROM sample_products ORDER BY stock DESC LIMIT 15;"},
		{"22222222-2222-2222-2222-000000000005", "Total Sales Amount", "SELECT SUM(amount) AS total_revenue FROM sample_orders;"},
		{"22222222-2222-2222-2222-000000000006", "Monthly Revenue", "SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount) AS revenue FROM sample_orders GROUP BY month ORDER BY month;"},
		{"22222222-2222-2222-2222-000000000007", "Daily Orders Count", "SELECT DATE(order_date) AS day, COUNT(*) AS orders FROM sample_orders GROUP BY day ORDER BY day DESC LIMIT 90;"},
		{"22222222-2222-2222-2222-000000000008", "Top 10 Customers", "SELECT c.name, SUM(o.amount) AS total_spent FROM sample_orders o JOIN sample_customers c ON o.customer_id = c.id GROUP BY c.name ORDER BY total_spent DESC LIMIT 10;"},
		{"22222222-2222-2222-2222-000000000009", "Category Revenue", "SELECT p.category, SUM(o.amount) AS revenue FROM sample_orders o JOIN sample_products p ON o.product_id = p.id GROUP BY p.category ORDER BY revenue DESC;"},
		{"22222222-2222-2222-2222-000000000010", "Avg Order Value by Country", "SELECT c.country, AVG(o.amount) AS avg_order FROM sample_orders o JOIN sample_customers c ON o.customer_id = c.id GROUP BY c.country ORDER BY avg_order DESC;"},
		{"22222222-2222-2222-2222-000000000011", "Event Count per Type", "SELECT event_type, COUNT(*) AS count FROM sample_events GROUP BY event_type ORDER BY count DESC;"},
		{"22222222-2222-2222-2222-000000000012", "Events Last 24h", "SELECT event_type, COUNT(*) AS cnt FROM sample_events WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY event_type ORDER BY cnt DESC;"},
		{"22222222-2222-2222-2222-000000000013", "CPU Usage Last 7 Days (hourly)", "SELECT recorded_at, value FROM sample_metrics WHERE metric_name = 'cpu_usage' AND recorded_at > NOW() - INTERVAL '7 days' ORDER BY recorded_at;"},
		{"22222222-2222-2222-2222-000000000014", "Memory Usage Last 7 Days", "SELECT recorded_at, value FROM sample_metrics WHERE metric_name = 'memory_usage' AND recorded_at > NOW() - INTERVAL '7 days' ORDER BY recorded_at;"},
		{"22222222-2222-2222-2222-000000000015", "Avg CPU by Day", "SELECT DATE(recorded_at) AS day, AVG(value) AS avg_cpu FROM sample_metrics WHERE metric_name='cpu_usage' GROUP BY day ORDER BY day DESC LIMIT 60;"},
		{"22222222-2222-2222-2222-000000000016", "Order Trend (rolling 7‑day)", `SELECT DATE(order_date) AS day, SUM(amount) OVER (ORDER BY DATE(order_date) ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d_revenue FROM (SELECT DISTINCT order_date, amount FROM sample_orders) sub ORDER BY day;`},
		{"22222222-2222-2222-2222-000000000017", "Customer Signups per Month", "SELECT DATE_TRUNC('month', signup_date) AS month, COUNT(*) AS signups FROM sample_customers GROUP BY month ORDER BY month;"},
		{"22222222-2222-2222-2222-000000000018", "Product Sales Distribution", "SELECT p.name, SUM(o.quantity) AS total_sold FROM sample_orders o JOIN sample_products p ON o.product_id = p.id GROUP BY p.name ORDER BY total_sold DESC;"},
		{"22222222-2222-2222-2222-000000000019", "Low Stock Products", "SELECT name, stock FROM sample_products WHERE stock < 20 ORDER BY stock ASC;"},
		{"22222222-2222-2222-2222-000000000020", "Customer Order Frequency", "SELECT c.name, COUNT(o.id) AS order_count FROM sample_customers c LEFT JOIN sample_orders o ON c.id = o.customer_id GROUP BY c.name ORDER BY order_count DESC;"},
		{"22222222-2222-2222-2222-000000000021", "Peak Hour Events", "SELECT EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS events FROM sample_events GROUP BY hour ORDER BY hour;"},
		{"22222222-2222-2222-2222-000000000022", "Browser Distribution (from metadata)", `SELECT metadata->>'browser' AS browser, COUNT(*) FROM sample_events WHERE event_type='page_view' GROUP BY browser;`},
		{"22222222-2222-2222-2222-000000000023", "Total Products", "SELECT COUNT(*) AS total FROM sample_products;"},
		{"22222222-2222-2222-2222-000000000024", "Revenue Growth % (MoM)", `SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) prev_revenue, (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month) * 100 AS growth_pct FROM (SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount) AS revenue FROM sample_orders GROUP BY month) sub ORDER BY month;`},
		{"22222222-2222-2222-2222-000000000025", "Random Sample (10 customers)", "SELECT * FROM sample_customers ORDER BY RANDOM() LIMIT 10;"},
		{"22222222-2222-2222-2222-000000000026", "All Tables Row Counts", "SELECT 'customers' AS tbl, COUNT(*) FROM sample_customers UNION ALL SELECT 'products', COUNT(*) FROM sample_products UNION ALL SELECT 'orders', COUNT(*) FROM sample_orders UNION ALL SELECT 'events', COUNT(*) FROM sample_events UNION ALL SELECT 'metrics', COUNT(*) FROM sample_metrics;"},
		{"22222222-2222-2222-2222-000000000027", "Last 5 Orders", "SELECT o.id, c.name, p.name AS product, o.quantity, o.amount, o.order_date FROM sample_orders o JOIN sample_customers c ON o.customer_id = c.id JOIN sample_products p ON o.product_id = p.id ORDER BY o.order_date DESC LIMIT 5;"},
		{"22222222-2222-2222-2222-000000000028", "Average Price by Category", "SELECT category, AVG(price) AS avg_price FROM sample_products GROUP BY category;"},
		{"22222222-2222-2222-2222-000000000029", "Customers Without Orders", "SELECT c.name FROM sample_customers c LEFT JOIN sample_orders o ON c.id = o.customer_id WHERE o.id IS NULL;"},
		{"22222222-2222-2222-2222-000000000030", "Most Used Metric Value (max cpu)", "SELECT MAX(value) FROM sample_metrics WHERE metric_name='cpu_usage';"},
	}
	for _, q := range queries {
		exec(`INSERT INTO queries (id, org_id, datasource_id, name, sql_text, max_rows, timeout_ms, created_by)
			VALUES ($1, '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', $2, $3, 500, 15000, '00000000-0000-0000-0000-000000000010')
			ON CONFLICT (id) DO NOTHING`, q.id, q.name, q.sql)
	}

	// 5. Create dashboards and widgets (now with proper UUIDs for widgets)
	type widgetDef struct {
		id, queryID, wtype, config string
		x, y, w, h int
	}
		dashboards := []struct {
		id, name string
		widgets []widgetDef
	}{
		{
			"dddddddd-dddd-dddd-dddd-000000000001", "Sales Overview",
			[]widgetDef{
				{"44444444-4444-4444-4444-000000000001", "22222222-2222-2222-2222-000000000005", "metric", `{"label":"Total Revenue"}`, 0,0,3,2},
				{"44444444-4444-4444-4444-000000000002", "22222222-2222-2222-2222-000000000006", "chart", `{"chartType":"bar"}`, 3,0,5,4},
				{"44444444-4444-4444-4444-000000000003", "22222222-2222-2222-2222-000000000007", "chart", `{"chartType":"line"}`, 0,2,4,4},
				{"44444444-4444-4444-4444-000000000004", "22222222-2222-2222-2222-000000000008", "table", `{}`, 4,2,4,4},
				{"44444444-4444-4444-4444-000000000005", "22222222-2222-2222-2222-000000000009", "chart", `{"chartType":"bar"}`, 8,0,4,4},
				{"44444444-4444-4444-4444-000000000006", "22222222-2222-2222-2222-000000000010", "chart", `{"chartType":"bar"}`, 8,4,4,4},
				{"44444444-4444-4444-4444-000000000007", "22222222-2222-2222-2222-000000000024", "chart", `{"chartType":"line"}`, 0,6,6,4},
				{"44444444-4444-4444-4444-000000000008", "22222222-2222-2222-2222-000000000016", "chart", `{"chartType":"line"}`, 6,6,6,4},
			},
		},
		{
			"dddddddd-dddd-dddd-dddd-000000000002", "User Analytics",
			[]widgetDef{
				{"44444444-4444-4444-4444-000000000009", "22222222-2222-2222-2222-000000000001", "metric", `{"label":"Total Customers"}`, 0,0,3,2},
				{"44444444-4444-4444-4444-000000000010", "22222222-2222-2222-2222-000000000002", "chart", `{"chartType":"pie"}`, 3,0,4,4},
				{"44444444-4444-4444-4444-000000000011", "22222222-2222-2222-2222-000000000017", "chart", `{"chartType":"bar"}`, 0,2,4,4},
				{"44444444-4444-4444-4444-000000000012", "22222222-2222-2222-2222-000000000020", "table", `{}`, 4,2,4,4},
				{"44444444-4444-4444-4444-000000000013", "22222222-2222-2222-2222-000000000003", "table", `{}`, 8,0,4,4},
				{"44444444-4444-4444-4444-000000000014", "22222222-2222-2222-2222-000000000029", "table", `{}`, 0,6,6,4},
			},
		},
		{
			"dddddddd-dddd-dddd-dddd-000000000003", "Events Monitor",
			[]widgetDef{
				{"44444444-4444-4444-4444-000000000015", "22222222-2222-2222-2222-000000000011", "chart", `{"chartType":"bar"}`, 0,0,4,4},
				{"44444444-4444-4444-4444-000000000016", "22222222-2222-2222-2222-000000000012", "chart", `{"chartType":"bar"}`, 4,0,4,4},
				{"44444444-4444-4444-4444-000000000017", "22222222-2222-2222-2222-000000000021", "chart", `{"chartType":"line"}`, 0,4,4,4},
				{"44444444-4444-4444-4444-000000000018", "22222222-2222-2222-2222-000000000022", "table", `{}`, 4,4,4,4},
				{"44444444-4444-4444-4444-000000000019", "22222222-2222-2222-2222-000000000012", "metric", `{"label":"Events/24h"}`, 8,0,3,2},
			},
		},
		{
			"dddddddd-dddd-dddd-dddd-000000000004", "Product Performance",
			[]widgetDef{
				{"44444444-4444-4444-4444-000000000020", "22222222-2222-2222-2222-000000000023", "metric", `{"label":"Total Products"}`, 0,0,2,2},
				{"44444444-4444-4444-4444-000000000021", "22222222-2222-2222-2222-000000000004", "table", `{}`, 2,0,5,4},
				{"44444444-4444-4444-4444-000000000022", "22222222-2222-2222-2222-000000000018", "chart", `{"chartType":"bar"}`, 0,2,4,4},
				{"44444444-4444-4444-4444-000000000023", "22222222-2222-2222-2222-000000000019", "table", `{}`, 4,2,4,4},
				{"44444444-4444-4444-4444-000000000024", "22222222-2222-2222-2222-000000000028", "chart", `{"chartType":"bar"}`, 8,0,4,4},
			},
		},
		{
			"dddddddd-dddd-dddd-dddd-000000000005", "Real-time Metrics",
			[]widgetDef{
				{"44444444-4444-4444-4444-000000000025", "22222222-2222-2222-2222-000000000013", "chart", `{"chartType":"line"}`, 0,0,6,4},
				{"44444444-4444-4444-4444-000000000026", "22222222-2222-2222-2222-000000000014", "chart", `{"chartType":"line"}`, 6,0,6,4},
				{"44444444-4444-4444-4444-000000000027", "22222222-2222-2222-2222-000000000015", "chart", `{"chartType":"bar"}`, 0,4,6,4},
				{"44444444-4444-4444-4444-000000000028", "22222222-2222-2222-2222-000000000030", "metric", `{"label":"Max CPU"}`, 6,4,3,2},
			},
		},
		{
			"dddddddd-dddd-dddd-dddd-000000000006", "Quick Stats",
			[]widgetDef{
				{"44444444-4444-4444-4444-000000000029", "22222222-2222-2222-2222-000000000026", "table", `{}`, 0,0,4,3},
				{"44444444-4444-4444-4444-000000000030", "22222222-2222-2222-2222-000000000027", "table", `{}`, 4,0,4,3},
				{"44444444-4444-4444-4444-000000000031", "22222222-2222-2222-2222-000000000025", "table", `{}`, 8,0,4,3},
			},
		},
	}

	for _, dbd := range dashboards {
		exec(`INSERT INTO dashboards (id, org_id, name, refresh_interval_seconds, created_by) VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, 0, '00000000-0000-0000-0000-000000000010') ON CONFLICT (id) DO NOTHING`, dbd.id, dbd.name)
		for _, w := range dbd.widgets {
			exec(`INSERT INTO widgets (id, dashboard_id, query_id, widget_type, config_json, position_x, position_y, width, height)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
				w.id, dbd.id, w.queryID, w.wtype, w.config, w.x, w.y, w.w, w.h)
		}
	}

	log.Println("✅ Massive seed completed successfully!")
	log.Println("Login: admin@acme.com / password123")
}