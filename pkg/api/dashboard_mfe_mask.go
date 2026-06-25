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
// inside row panels). The dashboard structure, panel metadata and target
// metadata (refId, datasource ref, hide flag, ...) are left untouched so the
// frontend can still render the layout.
func maskDashboardQueriesForMFE(data *simplejson.Json) {
	if data == nil {
		return
	}
	panels, ok := data.CheckGet("panels")
	if !ok {
		return
	}
	maskPanelArray(panels)
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
		target := targets.GetIndex(i)
		for _, field := range crMaskedQueryFields {
			if cur, ok := target.CheckGet(field); ok {
				// Only mask string-valued fields. Booleans like influxdb's
				// `rawQuery` (a UI toggle) must keep their type.
				if _, err := cur.String(); err == nil {
					target.Set(field, crMaskedValue)
				}
			}
		}
	}
}
