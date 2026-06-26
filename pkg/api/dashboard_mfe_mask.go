package api

import (
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/grafana/grafana/pkg/components/simplejson"
)

// crMFEEnvVar is the environment variable that, when truthy, indicates that
// Grafana is running as the CodeRabbit microfrontend (FNDashboard). When this
// flag is on, dashboard JSON responses must not expose raw datasource queries
// (e.g. SQL) to the browser — the backend resolves them at query time instead.
const crMFEEnvVar = "GF_CR_MFE"

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

// Redacted value prefix and tag format. The frontend forwards the masked
// rawSql verbatim to `/api/ds/query`; the CodeRabbit proxy recognises the
// `[CR_REDACTED:...]` shape, decodes the key, looks the original SQL up in
// its own indexed dashboard JSON copy, substitutes variables + macros and
// forwards a resolved query upstream. The structure carries everything
// needed for the lookup so we don't have to introduce an alternate body
// shape on the frontend.
//
// Encoding (URL-safe — colons are the only delimiter):
//
//	panel target:        [CR_REDACTED:p:<panelId>:<refId>]
//	templating variable: [CR_REDACTED:v:<variableName>]
//
// `<refId>` and `<variableName>` are pulled directly from the dashboard JSON.
// They are URL-query-encoded (`net/url.QueryEscape`) before concatenation so
// that names containing the structural delimiters `:` or `]` can still be
// unambiguously recovered by the proxy. The proxy decodes each segment via
// the inverse `decodeURIComponent`.
const (
	crMaskPrefix = "[CR_REDACTED:"
	crMaskSuffix = "]"
)

func panelMaskValue(panelID int64, refID string) string {
	return crMaskPrefix + "p:" + strconv.FormatInt(panelID, 10) + ":" + url.QueryEscape(refID) + crMaskSuffix
}

func variableMaskValue(name string) string {
	return crMaskPrefix + "v:" + url.QueryEscape(name) + crMaskSuffix
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
// Each redacted value carries a structural key (`[CR_REDACTED:p:<panelId>:<refId>]`
// / `[CR_REDACTED:v:<varName>]`) that the CodeRabbit proxy uses to look the
// original SQL up server-side. The dashboard structure, panel/variable
// metadata and target metadata (refId, datasource ref, hide flag, current
// selection, options, ...) are left untouched so the frontend can still
// render the layout and the variable picker.
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
	panelID, _ := panel.Get("id").Int64()
	for i := range targets.MustArray() {
		target := targets.GetIndex(i)
		refID, _ := target.Get("refId").String()
		mask := panelMaskValue(panelID, refID)
		maskRawQueryFields(target, mask)
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
		name, _ := var_.Get("name").String()
		mask := variableMaskValue(name)

		// `definition` is always a string snapshot of the SQL.
		if def, ok := var_.CheckGet("definition"); ok {
			if s, err := def.String(); err == nil && s != "" {
				var_.Set("definition", mask)
			}
		}

		// `query` is either a string (mask it directly) or an object that
		// follows the same shape as a panel target (mask its rawSql / expr /
		// ... fields). Empty strings are left alone so the shape stays
		// recognisably "no query" rather than "redacted query".
		if q, ok := var_.CheckGet("query"); ok {
			if s, err := q.String(); err == nil {
				if s != "" {
					var_.Set("query", mask)
				}
			} else if _, err := q.Map(); err == nil {
				maskRawQueryFields(q, mask)
			}
		}
	}
}

// maskRawQueryFields replaces every string-valued raw-query field on the
// given JSON object with the supplied mask string. Non-string values are
// left untouched (e.g. influxdb's `rawQuery` boolean toggle).
func maskRawQueryFields(obj *simplejson.Json, mask string) {
	for _, field := range crMaskedQueryFields {
		if cur, ok := obj.CheckGet(field); ok {
			if _, err := cur.String(); err == nil {
				obj.Set(field, mask)
			}
		}
	}
}
