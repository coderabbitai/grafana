package result

import (
	"sort"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type GroupByResult []GroupByRecord

// Frame returns data formatted as Grafana Frame.
func (t *GroupByResult) Frame() *data.Frame {
	columns := t.Columns()
	fields := make([]*data.Field, len(columns))
	for i, column := range columns {
		labels := data.Labels{}
		fields[i] = data.NewField(column, labels, t.Values(column))
	}
	return data.NewFrame("", fields...)
}

// Columns returns list of columns. It calls `Columns()` on first record. If
// no records are available it returns nil.
func (t *GroupByResult) Columns() []string {
	for _, r := range *t {
		return r.Columns()
	}
	return nil
}

// Values returns all values for given column.
func (t *GroupByResult) Values(column string) interface{} {
	if len(*t) == 0 {
		return nil
	}
	results := make([]interface{}, len(*t))
	for i, r := range *t {
		results[i] = r.Value(column)
	}
	return toTypedResults(results)
}

type GroupByRecord struct {
	Timestamp time.Time              `json:"timestamp"`
	Event     map[string]interface{} `json:"event"`
}

// Columns returns list of columns for given record.
// The first column will always be "timestamp" followed by other columns sorted
// alphabetically.
func (t *GroupByRecord) Columns() []string {
	columns := make([]string, len(t.Event)+1)
	columns[0] = timestampColumn
	i := 1
	for c := range t.Event {
		columns[i] = c
		i++
	}
	sort.Strings(columns[1:])
	return columns
}

// Value returns value for given column.
func (t *GroupByRecord) Value(column string) interface{} {
	if column == timestampColumn {
		return t.Timestamp
	}
	v, ok := t.Event[column]
	if !ok {
		return nil
	}
	return v
}
