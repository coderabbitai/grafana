package api

import (
	"net/url"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/components/simplejson"
)

func TestIsCodeRabbitMFE(t *testing.T) {
	cases := map[string]bool{
		"":      false,
		"0":     false,
		"false": false,
		"no":    false,
		"off":   false,
		"1":     true,
		"true":  true,
		"True":  true,
		"yes":   true,
		"on":    true,
		" 1 ":   true,
	}
	for value, want := range cases {
		t.Run(value, func(t *testing.T) {
			if value == "" {
				t.Setenv(mfeEnvVar, "")
			} else {
				t.Setenv(mfeEnvVar, value)
			}
			assert.Equal(t, want, isCodeRabbitMFE())
		})
	}

	t.Run("unset", func(t *testing.T) {
		// Exercise the LookupEnv-not-ok path explicitly: clear the env var,
		// remember whether the test environment had it set, and restore that
		// state via t.Cleanup so we don't leak the change to other subtests.
		old, existed := os.LookupEnv(mfeEnvVar)
		require.NoError(t, os.Unsetenv(mfeEnvVar))
		t.Cleanup(func() {
			if existed {
				require.NoError(t, os.Setenv(mfeEnvVar, old))
			} else {
				require.NoError(t, os.Unsetenv(mfeEnvVar))
			}
		})

		assert.False(t, isCodeRabbitMFE())
	})
}

func TestMaskDashboardQueriesForMFE(t *testing.T) {
	t.Run("masks raw query fields on flat panels", func(t *testing.T) {
		raw := []byte(`{
			"panels": [
				{
					"id": 1,
					"type": "timeseries",
					"targets": [
						{"refId": "A", "rawSql": "SELECT * FROM users", "format": "time_series"},
						{"refId": "B", "expr":  "sum(rate(http_requests_total[5m]))"},
						{"refId": "C", "query": "stats count() by host"}
					]
				}
			]
		}`)
		data, err := simplejson.NewJson(raw)
		require.NoError(t, err)

		maskDashboardQueriesForMFE(data)

		targets := data.Get("panels").GetIndex(0).Get("targets")
		assert.Equal(t, "[MFE_REDACTED:p:1:A]", targets.GetIndex(0).Get("rawSql").MustString())
		assert.Equal(t, "A", targets.GetIndex(0).Get("refId").MustString())
		assert.Equal(t, "time_series", targets.GetIndex(0).Get("format").MustString())
		assert.Equal(t, "[MFE_REDACTED:p:1:B]", targets.GetIndex(1).Get("expr").MustString())
		assert.Equal(t, "[MFE_REDACTED:p:1:C]", targets.GetIndex(2).Get("query").MustString())
	})

	t.Run("recurses into row panels", func(t *testing.T) {
		raw := []byte(`{
			"panels": [
				{
					"id": 1,
					"type": "row",
					"panels": [
						{"id": 2, "type": "timeseries", "targets": [{"refId": "A", "rawSql": "SELECT 1"}]}
					]
				}
			]
		}`)
		data, err := simplejson.NewJson(raw)
		require.NoError(t, err)

		maskDashboardQueriesForMFE(data)

		nested := data.Get("panels").GetIndex(0).Get("panels").GetIndex(0)
		assert.Equal(t, "[MFE_REDACTED:p:2:A]", nested.Get("targets").GetIndex(0).Get("rawSql").MustString())
	})

	t.Run("leaves non-string fields untouched", func(t *testing.T) {
		// influxdb uses `rawQuery` as a boolean toggle on its UI model; we must
		// not coerce booleans into strings.
		raw := []byte(`{
			"panels": [
				{
					"id": 1,
					"targets": [
						{"refId": "A", "rawQuery": true,  "query": "SELECT 1"}
					]
				}
			]
		}`)
		data, err := simplejson.NewJson(raw)
		require.NoError(t, err)

		maskDashboardQueriesForMFE(data)

		target := data.Get("panels").GetIndex(0).Get("targets").GetIndex(0)
		// boolean stays boolean
		raw_q, err := target.Get("rawQuery").Bool()
		assert.NoError(t, err)
		assert.True(t, raw_q)
		// string `query` is masked
		assert.Equal(t, "[MFE_REDACTED:p:1:A]", target.Get("query").MustString())
	})

	t.Run("no-op when there are no panels", func(t *testing.T) {
		data, err := simplejson.NewJson([]byte(`{"title": "empty"}`))
		require.NoError(t, err)
		// must not panic
		maskDashboardQueriesForMFE(data)
		assert.Equal(t, "empty", data.Get("title").MustString())
	})

	t.Run("masks templating variable queries (string form)", func(t *testing.T) {
		raw := []byte(`{
			"panels": [],
			"templating": {
				"list": [
					{
						"name": "org_name",
						"type": "query",
						"query": "SELECT name FROM orgs WHERE id = $id",
						"definition": "SELECT name FROM orgs WHERE id = $id",
						"current": {"text": "All", "value": "$__all"},
						"options": [{"text": "All", "value": "$__all"}]
					},
					{
						"name": "self_hosted_id",
						"type": "custom",
						"query": "",
						"current": {"text": "All", "value": "$__all"}
					}
				]
			}
		}`)
		data, err := simplejson.NewJson(raw)
		require.NoError(t, err)

		maskDashboardQueriesForMFE(data)

		vars := data.Get("templating").Get("list")
		orgName := vars.GetIndex(0)
		assert.Equal(t, "[MFE_REDACTED:v:org_name]", orgName.Get("query").MustString())
		assert.Equal(t, "[MFE_REDACTED:v:org_name]", orgName.Get("definition").MustString())
		// Variable metadata (name, current selection, options) must be preserved
		// so the frontend variable picker can still render.
		assert.Equal(t, "org_name", orgName.Get("name").MustString())
		assert.Equal(t, "All", orgName.Get("current").Get("text").MustString())
		// `custom`-type vars carry an empty `query` (not real SQL); masking it
		// with the placeholder is acceptable because the picker keys off
		// `options` / `current`, not `query`. But ensure the empty string isn't
		// overwritten with REDACTED — there is no SQL to hide.
		selfHosted := vars.GetIndex(1)
		assert.Equal(t, "", selfHosted.Get("query").MustString())
	})

	t.Run("masks templating variable queries (object form)", func(t *testing.T) {
		raw := []byte(`{
			"templating": {
				"list": [
					{
						"name": "repo_name",
						"type": "query",
						"query": {
							"refId": "repo_name",
							"rawSql": "SELECT repository_name FROM repositories WHERE org_id = $org_id"
						},
						"definition": "SELECT repository_name FROM repositories WHERE org_id = $org_id"
					}
				]
			}
		}`)
		data, err := simplejson.NewJson(raw)
		require.NoError(t, err)

		maskDashboardQueriesForMFE(data)

		v := data.Get("templating").Get("list").GetIndex(0)
		assert.Equal(t, "[MFE_REDACTED:v:repo_name]", v.Get("definition").MustString())
		assert.Equal(t, "[MFE_REDACTED:v:repo_name]", v.Get("query").Get("rawSql").MustString())
		// refId is metadata — keep it.
		assert.Equal(t, "repo_name", v.Get("query").Get("refId").MustString())
	})

	t.Run("nil dashboard is a no-op", func(t *testing.T) {
		assert.NotPanics(t, func() { maskDashboardQueriesForMFE(nil) })
	})

	t.Run("URL-encodes delimiter characters in refId and variable name", func(t *testing.T) {
		// Refs / variable names CAN technically include `:` or `]` — those are
		// our structural delimiters, so the mask helpers must URL-escape them
		// before concatenation. Otherwise the proxy parser can no longer
		// unambiguously recover the original key.
		raw := []byte(`{
			"panels": [
				{
					"id": 7,
					"type": "stat",
					"targets": [
						{"refId": "A:B]C", "rawSql": "SELECT 1"}
					]
				}
			],
			"templating": {
				"list": [
					{
						"name": "weird:name]thing",
						"type": "query",
						"query": "SELECT 1",
						"definition": "SELECT 1"
					}
				]
			}
		}`)
		data, err := simplejson.NewJson(raw)
		require.NoError(t, err)

		maskDashboardQueriesForMFE(data)

		panelMask := data.Get("panels").GetIndex(0).Get("targets").GetIndex(0).Get("rawSql").MustString()
		assert.Equal(t, "[MFE_REDACTED:p:7:A%3AB%5DC]", panelMask)

		v := data.Get("templating").Get("list").GetIndex(0)
		assert.Equal(t, "[MFE_REDACTED:v:weird%3Aname%5Dthing]", v.Get("query").MustString())
		assert.Equal(t, "[MFE_REDACTED:v:weird%3Aname%5Dthing]", v.Get("definition").MustString())
	})
}

// TestMfeEncodeMaskSegment ensures that mask segments are encoded with
// %20-style escapes (not the form-encoded `+` produced by url.QueryEscape).
// The proxy decodes each segment with `decodeURIComponent`, which preserves
// `+` literally — so emitting `+` for space here would break the round-trip
// for refIDs / variable names containing spaces.
func TestMfeEncodeMaskSegment(t *testing.T) {
	cases := map[string]string{
		"":             "",
		"A":            "A",
		"foo bar":      "foo%20bar",
		"hello world!": "hello%20world%21",
		"a+b":          "a%2Bb",
		"a:b]c":        "a%3Ab%5Dc",
	}
	for in, want := range cases {
		t.Run(in, func(t *testing.T) {
			assert.Equal(t, want, mfeEncodeMaskSegment(in))
			// Round-trip via the same decoder the proxy uses
			// (Go's url.QueryUnescape is `%`-aware and treats `+` as space —
			// equivalent enough for this property when no literal `+` remains).
			decoded, err := url.QueryUnescape(mfeEncodeMaskSegment(in))
			require.NoError(t, err)
			assert.Equal(t, in, decoded)
		})
	}
}

// TestPanelAndVariableMaskValueRoundTripsSpaces verifies that refIDs and
// variable names containing spaces survive the marker round-trip end-to-end:
// the produced marker must decode (per decodeURIComponent semantics, which
// only handles `%xx`) back to the original name.
func TestPanelAndVariableMaskValueRoundTripsSpaces(t *testing.T) {
	refID := "foo bar"
	varName := "org name"

	panel := panelMaskValue(42, refID)
	assert.Equal(t, "[MFE_REDACTED:p:42:foo%20bar]", panel)
	assert.NotContains(t, panel, "+", "spaces must be %20-encoded, not `+`")

	variable := variableMaskValue(varName)
	assert.Equal(t, "[MFE_REDACTED:v:org%20name]", variable)
	assert.NotContains(t, variable, "+", "spaces must be %20-encoded, not `+`")
}
