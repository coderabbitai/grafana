package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/datasources"
)

// mfeGetDataSourcesResponse serves `GET /api/datasources` when GF_MFE is
// enabled. It returns the single hardcoded fixture as a one-element list,
// wrapped in the same DTO shape as the real handler.
func (hs *HTTPServer) mfeGetDataSourcesResponse(c *contextmodel.ReqContext) response.Response {
	item := mfeHardcodedDataSourceListItem(c.SignedInUser.GetOrgID())
	// Populate the plugin logo consistently with the non-MFE path so the
	// datasource picker renders correctly. If the plugin is not installed
	// in this Grafana build, fall back to the generic datasource icon.
	if hs.pluginStore != nil {
		if plugin, exists := hs.pluginStore.Plugin(c.Req.Context(), item.Type); exists {
			item.TypeLogoUrl = plugin.Info.Logos.Small
			item.TypeName = plugin.Name
			item.Type = plugin.ID
		} else {
			item.TypeLogoUrl = "public/img/icn-datasource.svg"
		}
	}
	result := dtos.DataSourceList{item}
	return response.JSON(http.StatusOK, &result)
}

// mfeGetSingleDataSourceResponse serves any of the single-datasource GET
// endpoints (`/api/datasources/:id`, `/uid/:uid`, `/name/:name`) in MFE mode.
// It matches the incoming route parameter against the hardcoded fixture and
// returns the full `dtos.DataSource` DTO on hit, `404 Data source not found`
// otherwise. The `kind` argument is only used for logging / error context.
func (hs *HTTPServer) mfeGetSingleDataSourceResponse(
	c *contextmodel.ReqContext,
	match func(*datasources.DataSource) bool,
	kind string,
) response.Response {
	_ = kind
	fixture := mfeHardcodedDataSource(c.SignedInUser.GetOrgID())
	if !match(fixture) {
		return response.Error(http.StatusNotFound, "Data source not found", nil)
	}
	dto := hs.convertModelToDtos(c.Req.Context(), fixture)
	// Attach access-control metadata identically to the real handlers so
	// the frontend's permission checks don't misbehave.
	dto.AccessControl = hs.getAccessControlMetadata(c, datasources.ScopePrefix, dto.UID)
	return response.JSON(http.StatusOK, &dto)
}
