package datasource

import (
	"strings"
	"testing"
)

func TestValidateSQLAcceptsReadOnly(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "select", in: "SELECT * FROM users", want: "SELECT * FROM users"},
		{name: "lowercase", in: "select 1", want: "select 1"},
		{name: "trailing semicolon", in: "SELECT 1;", want: "SELECT 1"},
		{name: "trailing whitespace", in: "  SELECT 1  \n", want: "SELECT 1"},
		{name: "cte", in: "WITH t AS (SELECT 1) SELECT * FROM t", want: "WITH t AS (SELECT 1) SELECT * FROM t"},
		{name: "explain", in: "EXPLAIN SELECT 1", want: "EXPLAIN SELECT 1"},
		{name: "show", in: "SHOW TABLES", want: "SHOW TABLES"},
		{name: "leading comment", in: "-- a comment\nSELECT 1", want: "-- a comment\nSELECT 1"},
		{name: "block comment", in: "/* hi */ SELECT 1", want: "/* hi */ SELECT 1"},
		{name: "semicolon inside string", in: "SELECT ';' AS s", want: "SELECT ';' AS s"},
		{name: "semicolon inside identifier", in: "SELECT \"a;b\" FROM t", want: "SELECT \"a;b\" FROM t"},
		{name: "semicolon inside dollar quote", in: "SELECT $$a;b$$", want: "SELECT $$a;b$$"},
		{name: "semicolon inside line comment", in: "SELECT 1 -- ;\n", want: "SELECT 1 --"},
		{name: "values", in: "VALUES (1), (2)", want: "VALUES (1), (2)"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ValidateSQL(tt.in)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestValidateSQLRejectsUnsafe(t *testing.T) {
	tests := []struct {
		name     string
		in       string
		errMatch string
	}{
		{name: "empty", in: "", errMatch: "required"},
		{name: "whitespace only", in: "   \n\t", errMatch: "required"},
		{name: "only semicolon", in: ";", errMatch: "required"},
		{name: "multiple statements", in: "SELECT 1; SELECT 2", errMatch: "single SQL statement"},
		{name: "multiple statements no space", in: "SELECT 1;DROP TABLE users", errMatch: "single SQL statement"},
		{name: "insert", in: "INSERT INTO users VALUES (1)", errMatch: "read-only"},
		{name: "update", in: "UPDATE users SET name='x'", errMatch: "read-only"},
		{name: "delete", in: "DELETE FROM users", errMatch: "read-only"},
		{name: "drop", in: "DROP TABLE users", errMatch: "read-only"},
		{name: "create", in: "CREATE TABLE t (id int)", errMatch: "read-only"},
		{name: "grant", in: "GRANT ALL ON t TO u", errMatch: "read-only"},
		{name: "set", in: "SET ROLE postgres", errMatch: "read-only"},
		{name: "copy", in: "COPY t TO '/tmp/x'", errMatch: "read-only"},
		{name: "pg_sleep", in: "SELECT pg_sleep(10)", errMatch: "disallowed"},
		{name: "mysql sleep", in: "SELECT sleep(10)", errMatch: "disallowed"},
		{name: "into outfile", in: "SELECT * FROM t INTO OUTFILE '/tmp/x'", errMatch: "disallowed"},
		{name: "load data", in: "SELECT 1 FROM load data", errMatch: "disallowed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ValidateSQL(tt.in)
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tt.errMatch) {
				t.Fatalf("error %q does not contain %q", err.Error(), tt.errMatch)
			}
		})
	}
}

func TestValidateSQLTrimsOnlyTrailingSemicolons(t *testing.T) {
	got, err := ValidateSQL("SELECT 1;  \n ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "SELECT 1" {
		t.Fatalf("got %q", got)
	}
}
