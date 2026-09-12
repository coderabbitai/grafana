package api

import (
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/services/datasources"
)

// mfeHardcodedDatasource is the single datasource returned by the datasources
// API when the process runs as the CodeRabbit microfrontend (GF_MFE=true).
//
// The upstream CodeRabbit proxy (coderabbitHandler/src/grafana-proxy) is what
// actually talks to BigQuery. Grafana never opens a real connection when it is
// embedded as the MFE, but the shipped dashboard JSON (e.g. summary.json)
// references a datasource by the name "BigQuery Prod" with plugin
// "grafana-bigquery-datasource". The frontend still needs a resolvable
// datasource for that name (both during dashboard import and at panel render
// time) so we synthesise one deterministically here.
//
// The values below (name, type, uid) are treated as the source of truth by the
// proxy — it looks up the target datasource by name via
// `GET /api/datasources/name/<name>` and expects `{ type, uid }` in the
// response. Do NOT change the name / type without updating the proxy and the
// shipped dashboards under grafana-proxy/dashboards/.
const (
	mfeDatasourceID   int64  = 1
	mfeDatasourceUID         = "mfe-bigquery-prod"
	mfeDatasourceName        = "BigQuery Prod"
	mfeDatasourceType        = "grafana-bigquery-datasource"
)

// mfeHardcodedDataSource returns the domain-model datasource we hand out from
// the various single-datasource endpoints. Callers pass in the orgID from the
// signed-in user so the fixture appears to belong to the current org (the
// value is otherwise unused by the frontend).
func mfeHardcodedDataSource(orgID int64) *datasources.DataSource {
	return &datasources.DataSource{
		ID:        mfeDatasourceID,
		OrgID:     orgID,
		UID:       mfeDatasourceUID,
		Name:      mfeDatasourceName,
		Type:      mfeDatasourceType,
		Access:    datasources.DS_ACCESS_PROXY,
		IsDefault: true,
		ReadOnly:  true,
		JsonData:  simplejson.New(),
	}
}

// mfeHardcodedDataSourceListItem returns the list-endpoint DTO for the
// hardcoded MFE datasource. It intentionally mirrors the fields set by the
// real GetDataSources handler so the frontend sees a consistent shape.
func mfeHardcodedDataSourceListItem(orgID int64) dtos.DataSourceListItemDTO {
	return dtos.DataSourceListItemDTO{
		Id:        mfeDatasourceID,
		OrgId:     orgID,
		UID:       mfeDatasourceUID,
		Name:      mfeDatasourceName,
		Type:      mfeDatasourceType,
		TypeName:  mfeDatasourceType,
		Access:    datasources.DS_ACCESS_PROXY,
		IsDefault: true,
		ReadOnly:  true,
		JsonData:  simplejson.New(),
	}
}

// The HTTP response helpers below are defined in datasources_mfe_http.go so
// that this file stays free of HTTP / router imports and can be reused from
// tests without pulling in the whole HTTPServer surface.
