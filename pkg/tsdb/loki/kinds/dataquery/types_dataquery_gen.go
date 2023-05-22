// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     PluginGoTypesJenny
//
// Run 'make gen-cue' from repository root to regenerate.

package dataquery

// Defines values for EditorMode.
const (
	EditorModeBuilder EditorMode = "builder"
	EditorModeCode    EditorMode = "code"
)

// Defines values for LokiQueryDirection.
const (
	LokiQueryDirectionBackward LokiQueryDirection = "backward"
	LokiQueryDirectionForward  LokiQueryDirection = "forward"
)

// Defines values for LokiQueryType.
const (
	LokiQueryTypeInstant LokiQueryType = "instant"
	LokiQueryTypeRange   LokiQueryType = "range"
	LokiQueryTypeStream  LokiQueryType = "stream"
)

// Defines values for QueryEditorMode.
const (
	QueryEditorModeBuilder QueryEditorMode = "builder"
	QueryEditorModeCode    QueryEditorMode = "code"
)

// Defines values for SupportingQueryType.
const (
	SupportingQueryTypeDataSample SupportingQueryType = "dataSample"
	SupportingQueryTypeLogsSample SupportingQueryType = "logsSample"
	SupportingQueryTypeLogsVolume SupportingQueryType = "logsVolume"
)

// LokiDataQuery defines model for LokiDataQuery.
type LokiDataQuery struct {
	// For mixed data sources the selected datasource is on the query level.
	// For non mixed scenarios this is undefined.
	// TODO find a better way to do this ^ that's friendly to schema
	// TODO this shouldn't be unknown but DataSourceRef | null
	Datasource *interface{} `json:"datasource,omitempty"`
	EditorMode *EditorMode  `json:"editorMode,omitempty"`

	// The LogQL query.
	Expr string `json:"expr"`

	// Hide true if query is disabled (ie should not be returned to the dashboard)
	// Note this does not always imply that the query should not be executed since
	// the results from a hidden query may be used as the input to other queries (SSE etc)
	Hide *bool `json:"hide,omitempty"`

	// @deprecated, now use queryType.
	Instant *bool `json:"instant,omitempty"`

	// Used to override the name of the series.
	LegendFormat *string `json:"legendFormat,omitempty"`

	// Used to limit the number of log rows returned.
	MaxLines *int64 `json:"maxLines,omitempty"`

	// Specify the query flavor
	// TODO make this required and give it a default
	QueryType *string `json:"queryType,omitempty"`

	// @deprecated, now use queryType.
	Range *bool `json:"range,omitempty"`

	// A unique identifier for the query within the list of targets.
	// In server side expressions, the refId is used as a variable name to identify results.
	// By default, the UI will assign A->Z; however setting meaningful names may be useful.
	RefId string `json:"refId"`

	// Used to scale the interval value.
	Resolution *int64 `json:"resolution,omitempty"`
}

// EditorMode defines model for LokiDataQuery.EditorMode.
type EditorMode string

// LokiQueryDirection defines model for LokiQueryDirection.
type LokiQueryDirection string

// LokiQueryType defines model for LokiQueryType.
type LokiQueryType string

// QueryEditorMode defines model for QueryEditorMode.
type QueryEditorMode string

// SupportingQueryType defines model for SupportingQueryType.
type SupportingQueryType string
