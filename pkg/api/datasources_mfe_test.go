package api

import (
	"encoding/json"
	"net/http"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/db/dbtest"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/services/accesscontrol/actest"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/datasources/guardian"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginstore"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

// TestMfeHardcodedDataSource_MatchesShippedDashboards pins the fixture's
// identity fields. The shipped dashboards under
// coderabbitHandler/src/grafana-proxy/dashboards/ reference the datasource by
// name; the CodeRabbit proxy resolves the reference via
// `GET /api/datasources/name/BigQuery%20Prod` and expects the returned
// `{type, uid}` to be exactly what we hand out here. Any drift between this
// fixture and the proxy will break dashboard rendering silently, so we lock
// the contract in a test.
func TestMfeHardcodedDataSource_MatchesShippedDashboards(t *testing.T) {
	ds := mfeHardcodedDataSource(42)

	assert.Equal(t, "BigQuery Prod", ds.Name)
	assert.Equal(t, "grafana-bigquery-datasource", ds.Type)
	assert.Equal(t, "mfe-bigquery-prod", ds.UID)
	assert.Equal(t, int64(42), ds.OrgID, "OrgID should reflect the caller's org")
	assert.Equal(t, datasources.DsAccess(datasources.DS_ACCESS_PROXY), ds.Access)
	assert.True(t, ds.IsDefault, "the single MFE datasource must be default so panels without an explicit datasource fall back to it")
	assert.True(t, ds.ReadOnly, "MFE datasource is a fixture — it must not be editable via the API")
	assert.NotNil(t, ds.JsonData, "JsonData must be initialised so downstream code can safely read fields off it")
}

func TestMfeHardcodedDataSourceListItem_MatchesFixture(t *testing.T) {
	ds := mfeHardcodedDataSource(7)
	item := mfeHardcodedDataSourceListItem(7)

	assert.Equal(t, ds.ID, item.Id)
	assert.Equal(t, ds.UID, item.UID)
	assert.Equal(t, ds.OrgID, item.OrgId)
	assert.Equal(t, ds.Name, item.Name)
	assert.Equal(t, ds.Type, item.Type)
	assert.Equal(t, ds.Access, item.Access)
	assert.Equal(t, ds.IsDefault, item.IsDefault)
	assert.Equal(t, ds.ReadOnly, item.ReadOnly)
	// TypeName is populated by the handler when the plugin store is available;
	// on the raw fixture it should mirror Type so the list endpoint stays
	// usable even when no plugin store is wired in.
	assert.Equal(t, ds.Type, item.TypeName)
}

// Below tests hit the full HTTP handler path with GF_MFE set. They pin the
// contract the CodeRabbit proxy relies on:
//
//   * GET /api/datasources           -> 200 + single-element list with the fixture
//   * GET /api/datasources/name/:n   -> 200 fixture (name match) / 404 (miss)
//   * GET /api/datasources/uid/:uid  -> 200 fixture (uid match)  / 404 (miss)
//   * GET /api/datasources/:id       -> 200 fixture (id match)   / 404 (miss)
//   * GET /api/datasources/id/:n     -> 200 { id } (name match)  / 404 (miss)

func TestGetDataSources_MFE_ReturnsHardcodedFixture(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources under MFE", "/api/datasources/", "/api/datasources/", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			dsGuardian:         guardian.ProvideGuardian(),
		}
		sc.handlerFunc = hs.GetDataSources
		sc.fakeReq("GET", "/api/datasources").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)

		var got []map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))
		require.Len(t, got, 1, "MFE mode must expose exactly one datasource")

		assert.Equal(t, "BigQuery Prod", got[0]["name"])
		assert.Equal(t, "grafana-bigquery-datasource", got[0]["type"])
		assert.Equal(t, "mfe-bigquery-prod", got[0]["uid"])
		assert.Equal(t, true, got[0]["isDefault"])
		// FakePluginStore has no plugins registered → we fall through to
		// the generic datasource icon (mirrors the non-MFE GetDataSources
		// handler in datasources.go). The picker relies on this default so
		// no logo request 404s in the browser.
		assert.Equal(t, "public/img/icn-datasource.svg", got[0]["typeLogoUrl"])
	}, mockSQLStore)
}

// TestGetDataSources_MFE_UsesFallbackIconWhenPluginStoreNil pins the
// nil-pluginStore code path. Some minimal HTTPServer constructions (unit
// tests, embedded contexts) may leave `pluginStore` unset — the handler
// must still emit the generic fallback icon rather than an empty
// `typeLogoUrl`, which would render as a broken image in the frontend.
func TestGetDataSources_MFE_UsesFallbackIconWhenPluginStoreNil(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources under MFE with nil pluginStore", "/api/datasources/", "/api/datasources/", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        nil, // <- key: exercise the nil-store branch
			DataSourcesService: &dataSourcesServiceMock{},
			dsGuardian:         guardian.ProvideGuardian(),
		}
		sc.handlerFunc = hs.GetDataSources
		sc.fakeReq("GET", "/api/datasources").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)
		var got []map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))
		require.Len(t, got, 1)
		assert.Equal(t, "public/img/icn-datasource.svg", got[0]["typeLogoUrl"], "nil pluginStore must still yield the generic datasource icon")
		// Type / TypeName remain the raw fixture values in the nil-store
		// path — no plugin metadata to override them with.
		assert.Equal(t, "grafana-bigquery-datasource", got[0]["type"])
		assert.Equal(t, "grafana-bigquery-datasource", got[0]["typeName"])
	}, mockSQLStore)
}

func TestGetDataSourceByName_MFE_Hit(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources/name/BigQuery Prod under MFE", "/api/datasources/name/BigQuery%20Prod", "/api/datasources/name/:name", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			AccessControl:      actest.FakeAccessControl{},
		}
		sc.handlerFunc = hs.GetDataSourceByName
		sc.fakeReq("GET", "/api/datasources/name/BigQuery Prod").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)

		var got map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))

		// The `{type, uid}` pair below is exactly what the CodeRabbit proxy
		// caches. Keep it in sync with the fixture (and the shipped dashboards)
		// or dashboards will fail to render.
		assert.Equal(t, "BigQuery Prod", got["name"])
		assert.Equal(t, "grafana-bigquery-datasource", got["type"])
		assert.Equal(t, "mfe-bigquery-prod", got["uid"])
	}, mockSQLStore)
}

func TestGetDataSourceByName_MFE_Miss(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources/name/UnknownDS under MFE", "/api/datasources/name/UnknownDS", "/api/datasources/name/:name", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			AccessControl:      actest.FakeAccessControl{},
		}
		sc.handlerFunc = hs.GetDataSourceByName
		sc.fakeReq("GET", "/api/datasources/name/UnknownDS").exec()

		assert.Equal(t, http.StatusNotFound, sc.resp.Code)
	}, mockSQLStore)
}

func TestGetDataSourceByUID_MFE(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources/uid/mfe-bigquery-prod under MFE", "/api/datasources/uid/mfe-bigquery-prod", "/api/datasources/uid/:uid", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			AccessControl:      actest.FakeAccessControl{},
		}
		sc.handlerFunc = hs.GetDataSourceByUID
		sc.fakeReq("GET", "/api/datasources/uid/mfe-bigquery-prod").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)
		var got map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))
		assert.Equal(t, "mfe-bigquery-prod", got["uid"])
		assert.Equal(t, "BigQuery Prod", got["name"])
	}, mockSQLStore)

	loggedInUserScenario(t, "GET /api/datasources/uid/nope under MFE", "/api/datasources/uid/nope", "/api/datasources/uid/:uid", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			AccessControl:      actest.FakeAccessControl{},
		}
		sc.handlerFunc = hs.GetDataSourceByUID
		sc.fakeReq("GET", "/api/datasources/uid/nope").exec()

		assert.Equal(t, http.StatusNotFound, sc.resp.Code)
	}, mockSQLStore)
}

func TestGetDataSourceById_MFE(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources/1 under MFE", "/api/datasources/1", "/api/datasources/:id", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			AccessControl:      actest.FakeAccessControl{},
		}
		sc.handlerFunc = hs.GetDataSourceById
		sc.fakeReq("GET", "/api/datasources/1").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)
		var got map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))
		assert.Equal(t, float64(mfeDatasourceID), got["id"])
		assert.Equal(t, "BigQuery Prod", got["name"])
	}, mockSQLStore)

	loggedInUserScenario(t, "GET /api/datasources/999 under MFE", "/api/datasources/999", "/api/datasources/:id", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
			AccessControl:      actest.FakeAccessControl{},
		}
		sc.handlerFunc = hs.GetDataSourceById
		sc.fakeReq("GET", "/api/datasources/999").exec()

		assert.Equal(t, http.StatusNotFound, sc.resp.Code)
	}, mockSQLStore)
}

func TestGetDataSourceIdByName_MFE(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources/id/BigQuery Prod under MFE", "/api/datasources/id/BigQuery%20Prod", "/api/datasources/id/:name", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:                setting.NewCfg(),
			pluginStore:        &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{},
		}
		sc.handlerFunc = hs.GetDataSourceIdByName
		sc.fakeReq("GET", "/api/datasources/id/BigQuery Prod").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)
		var got map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))
		assert.Equal(t, float64(mfeDatasourceID), got["id"])
	}, mockSQLStore)
}

// Non-MFE mode must NOT hit the fixture path. This regression test guards
// against the short-circuit being accidentally moved above the isCodeRabbitMFE
// gate.
func TestGetDataSources_NonMFE_StillUsesRealService(t *testing.T) {
	// Explicitly clear the env var to force the non-MFE branch even if the
	// dev environment has it set globally.
	old, existed := os.LookupEnv(mfeEnvVar)
	require.NoError(t, os.Unsetenv(mfeEnvVar))
	t.Cleanup(func() {
		if existed {
			require.NoError(t, os.Setenv(mfeEnvVar, old))
		}
	})

	mockSQLStore := dbtest.NewFakeDB()
	loggedInUserScenario(t, "GET /api/datasources without MFE", "/api/datasources/", "/api/datasources/", func(sc *scenarioContext) {
		hs := &HTTPServer{
			Cfg:         setting.NewCfg(),
			pluginStore: &pluginstore.FakePluginStore{},
			DataSourcesService: &dataSourcesServiceMock{
				expectedDatasources: []*datasources.DataSource{{Name: "real-ds"}},
			},
			dsGuardian: guardian.ProvideGuardian(),
		}
		sc.handlerFunc = hs.GetDataSources
		sc.fakeReq("GET", "/api/datasources").exec()

		require.Equal(t, http.StatusOK, sc.resp.Code)
		var got []map[string]any
		require.NoError(t, json.NewDecoder(sc.resp.Body).Decode(&got))
		require.Len(t, got, 1)
		assert.Equal(t, "real-ds", got[0]["name"], "non-MFE mode must return the service's actual datasources, not the fixture")
	}, mockSQLStore)
}

// TestGetFSDataSources_MFE_UsesHardcodedFixture pins the /api/frontend/settings
// datasources map to the same hardcoded fixture served by /api/datasources/*.
// The Grafana web UI seeds Grafana Runtime's `config.datasources` from this
// map on page load — if the fixture is missing here, the frontend will render
// an empty datasource picker and dashboards will fail to import even though
// /api/datasources/name/BigQuery%20Prod resolves correctly.
func TestGetFSDataSources_MFE_UsesHardcodedFixture(t *testing.T) {
	t.Setenv(mfeEnvVar, "1")

	// Minimal AvailablePlugins map with the bigquery plugin so the
	// `availablePlugins.Get` call inside getFSDataSources succeeds and the
	// fixture ends up in the response (the function `continue`s past any
	// datasource whose plugin is not registered).
	bqPlugin := pluginstore.Plugin{
		JSONData: plugins.JSONData{
			ID:   mfeDatasourceType,
			Type: plugins.TypeDataSource,
			Name: "BigQuery",
		},
		Module:  "public/plugins/grafana-bigquery-datasource/module.js",
		BaseURL: "public/plugins/grafana-bigquery-datasource",
	}
	availablePlugins := AvailablePlugins{
		plugins.TypeDataSource: {
			mfeDatasourceType: &availablePluginDTO{Plugin: bqPlugin},
		},
	}

	hs := &HTTPServer{
		Cfg:                setting.NewCfg(),
		pluginStore:        pluginstore.NewFakePluginStore(bqPlugin),
		DataSourcesService: &dataSourcesServiceMock{},
		dsGuardian:         guardian.ProvideGuardian(),
		tracer:             tracing.InitializeTracerForTest(),
	}

	// Build a ReqContext with an org set so the non-MFE branch would also
	// try to hit the DataSourcesService — this way we verify the short
	// circuit fires ahead of the service call even when OrgID != 0.
	req, err := http.NewRequest("GET", "/api/frontend/settings", nil)
	require.NoError(t, err)
	c := &contextmodel.ReqContext{
		Context: &web.Context{Req: req},
		SignedInUser: &user.SignedInUser{
			OrgID:  testOrgID,
			UserID: testUserID,
		},
		Logger: log.New("test"),
	}

	got, err := hs.getFSDataSources(c, availablePlugins)
	require.NoError(t, err)

	// The map is keyed by datasource name.
	ds, ok := got["BigQuery Prod"]
	require.True(t, ok, "MFE mode must expose the BigQuery Prod fixture in the frontend settings datasources map")
	assert.Equal(t, mfeDatasourceType, ds.Type)
	assert.Equal(t, mfeDatasourceUID, ds.UID)
	assert.Equal(t, mfeDatasourceID, ds.ID)
	assert.True(t, ds.IsDefault, "the sole MFE datasource must remain the default so panels without an explicit datasource ref fall back to it")
	assert.Equal(t, "/api/datasources/proxy/uid/"+mfeDatasourceUID, ds.URL, "proxy-access datasources are rewritten to the proxy URL by getFSDataSources")
}
