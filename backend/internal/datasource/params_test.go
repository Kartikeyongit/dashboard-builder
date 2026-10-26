package datasource

import (
	"reflect"
	"testing"
)

func TestSubstituteFilterParamsPostgres(t *testing.T) {
	sql := `SELECT * FROM orders
		WHERE created_at >= {{start_date}}
		  AND status = {{status}}
		  AND created_at < {{start_date}}`
	values := map[string]interface{}{
		"start_date": "2026-01-01",
		"status":     "paid",
	}

	gotSQL, args, err := SubstituteFilterParams(sql, values, "postgres")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wantSQL := `SELECT * FROM orders
		WHERE created_at >= $1
		  AND status = $2
		  AND created_at < $1`
	if gotSQL != wantSQL {
		t.Fatalf("SQL mismatch\ngot:  %s\nwant: %s", gotSQL, wantSQL)
	}
	wantArgs := []interface{}{"2026-01-01", "paid"}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", args, wantArgs)
	}
}

func TestSubstituteFilterParamsMySQL(t *testing.T) {
	sql := `SELECT * FROM orders WHERE status = {{status}} AND region = {{region}}`
	values := map[string]interface{}{"status": "paid", "region": "eu"}

	gotSQL, args, err := SubstituteFilterParams(sql, values, "mysql")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wantSQL := `SELECT * FROM orders WHERE status = ? AND region = ?`
	if gotSQL != wantSQL {
		t.Fatalf("SQL mismatch\ngot:  %s\nwant: %s", gotSQL, wantSQL)
	}
	if !reflect.DeepEqual(args, []interface{}{"paid", "eu"}) {
		t.Fatalf("args = %#v", args)
	}
}

func TestSubstituteFilterParamsIgnoresStringsAndComments(t *testing.T) {
	sql := `SELECT '{{literal}}' AS a -- {{comment}}
		/* {{block}} */ FROM t WHERE x = {{real}}`
	values := map[string]interface{}{"real": 42}

	gotSQL, args, err := SubstituteFilterParams(sql, values, "postgres")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wantSQL := `SELECT '{{literal}}' AS a -- {{comment}}
		/* {{block}} */ FROM t WHERE x = $1`
	if gotSQL != wantSQL {
		t.Fatalf("SQL mismatch\ngot:  %s\nwant: %s", gotSQL, wantSQL)
	}
	if !reflect.DeepEqual(args, []interface{}{42}) {
		t.Fatalf("args = %#v", args)
	}
}

func TestSubstituteFilterParamsMissingValue(t *testing.T) {
	_, _, err := SubstituteFilterParams(`SELECT * FROM t WHERE x = {{missing}}`, nil, "postgres")
	if err == nil {
		t.Fatal("expected an error for a missing filter value")
	}
}

func TestSubstituteFilterParamsRejectsInvalidName(t *testing.T) {
	for _, name := range []string{"1bad", "has space", "x; DROP TABLE t", ""} {
		sql := "SELECT * FROM t WHERE x = {{" + name + "}}"
		if _, _, err := SubstituteFilterParams(sql, map[string]interface{}{}, "postgres"); err == nil {
			t.Fatalf("expected an error for invalid filter name %q", name)
		}
	}
}

func TestSubstituteFilterParamsUnterminated(t *testing.T) {
	if _, _, err := SubstituteFilterParams(`SELECT {{oops`, nil, "postgres"); err == nil {
		t.Fatal("expected an error for an unterminated placeholder")
	}
}
