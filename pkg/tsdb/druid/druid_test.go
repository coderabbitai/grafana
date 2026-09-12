package druid

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveGranularity(t *testing.T) {
	granularity := map[string]any{
		"type":     "duration",
		"duration": "10 * 10",
		"origin":   "2012-01-01T00:30:00Z",
	}
	gran := resolveGranularity(granularity)
	assert.Equal(t, gran, map[string]any{
		"type":     "duration",
		"duration": 100,
		"origin":   "2012-01-01T00:30:00Z",
	})
}
