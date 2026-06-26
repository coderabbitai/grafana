package api

import (
	"os"
	"strings"

	"github.com/grafana/grafana/pkg/components/simplejson"
)

// crMFEEnvVar is the environment variable that, when truthy, indicates that
// Grafana is running as the CodeRabbit microfrontend (FNDashboard). When this
// flag is on, dashboard JSON responses must not expose raw datasource queries
// (e.g. SQL) to the browser — the backend resolves them at query time instead.
const crMFEEnvVar = "GF_CR_MFE"

// crMaskedValue is the placeholder substituted in place of any raw query text
// when running as the CodeRabbit microfrontend.
const crMaskedValue = "[REDACTED]"

// crMaskedQueryFields lists the JSON keys that carry raw, datasource-specific
// query text on a panel target. We mask these explicitly (rather than
// whitelisting metadata) so that unknown datasources keep their structure and
// the frontend can still render the panel layout.
var crMaskedQueryFields = []string{
	"rawSql",    // postgres, mysql, mssql
	"expr",      // prometheus, loki
	"query",     // elasticsearch, influxdb, cloudwatch, generic
	"rawQuery",  // azure monitor, influxdb (toggle key elsewhere — we mask string values only)
	"queryText", // bigquery, snowflake, athena
	"target",    // graphite
}

// isCodeRabbitMFE reports whether the Grafana process is configured as the
// CodeRabbit microfrontend. The env var is considered enabled when set to any
// of the common truthy strings ("1", "true", "yes", case-insensitive).
func isCodeRabbitMFE() bool {
	v, ok := os.LookupEnv(crMFEEnvVar)
	if !ok {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}

// maskDashboardQueriesForMFE walks the dashboard JSON and redacts any raw
// query strings on every panel target (including targets on panels nested
// inside row panels) AND on every templating variable of type `query`
// (where the SQL lives in `query` / `definition` on the variable itself).
// The dashboard structure, panel/variable metadata and target metadata
// (refId, datasource ref, hide flag, current selection, options, ...) are
// left untouched so the frontend can still render the layout and the
// variable picker.
func maskDashboardQueriesForMFE(data *simplejson.Json) {
	if data == nil {
		return
	}
	if panels, ok := data.CheckGet("panels"); ok {
		maskPanelArray(panels)
	}
	if templating, ok := data.CheckGet("templating"); ok {
		if list, ok := templating.CheckGet("list"); ok {
			maskTemplatingList(list)
		}
	}
}

func maskPanelArray(panels *simplejson.Json) {
	for i := range panels.MustArray() {
		panel := panels.GetIndex(i)
		maskPanelTargets(panel)

		// Row panels embed their child panels under a nested "panels" array.
		if nested, ok := panel.CheckGet("panels"); ok {
			maskPanelArray(nested)
		}
	}
}

func maskPanelTargets(panel *simplejson.Json) {
	targets, ok := panel.CheckGet("targets")
	if !ok {
		return
	}
	for i := range targets.MustArray() {
		maskRawQueryFields(targets.GetIndex(i))
	}
}

// maskTemplatingList walks the dashboard's templating variable list and
// redacts the SQL on every `query`-type variable. The Grafana JSON stores
// the SQL in two places:
//
//	- `definition`: always a plain string snapshot used by the variable picker.
//	- `query`: either a plain string (legacy / our shipped dashboards) OR an
//	  object of the same shape as a panel target (`rawSql`, `expr`, ...).
//
// We mask both forms so the redaction is robust to future dashboards saved
// from a newer Grafana UI that prefers the object form.
func maskTemplatingList(list *simplejson.Json) {
	for i := range list.MustArray() {
		var_ := list.GetIndex(i)

		// Only `query`-type variables carry real SQL. `custom`, `textbox`,
		// `interval` and `datasource` variables either have no `query` field
		// or carry a comma-separated literal list / placeholder string — none
		// of which constitute datasource-backed query text we need to hide.
		varType, _ := var_.Get("type").String()
		if varType != "query" {
			continue
		}

		// `definition` is always a string snapshot of the SQL.
		if def, ok := var_.CheckGet("definition"); ok {
			if s, err := def.String(); err == nil && s != "" {
				var_.Set("definition", crMaskedValue)
			}
		}

		// `query` is either a string (mask it directly) or an object that
		// follows the same shape as a panel target (mask its rawSql / expr /
		// ... fields). Empty strings are left alone so the shape stays
		// recognisably "no query" rather than "redacted query".
		if q, ok := var_.CheckGet("query"); ok {
			if s, err := q.String(); err == nil {
				if s != "" {
					var_.Set("query", crMaskedValue)
				}
			} else if _, err := q.Map(); err == nil {
				maskRawQueryFields(q)
			}
		}
	}
}

// maskRawQueryFields replaces every string-valued raw-query field on the
// given JSON object with the mask placeholder. Non-string values are left
// untouched (e.g. influxdb's `rawQuery` boolean toggle).
func maskRawQueryFields(obj *simplejson.Json) {
	for _, field := range crMaskedQueryFields {
		if cur, ok := obj.CheckGet(field); ok {
			if _, err := cur.String(); err == nil {
				obj.Set(field, crMaskedValue)
			}
		}
	}
}
