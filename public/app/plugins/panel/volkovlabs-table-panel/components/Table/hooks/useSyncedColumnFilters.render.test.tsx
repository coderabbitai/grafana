import { ColumnDef } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';

import { EventBusSrv } from '@grafana/data';

import { useSyncedColumnFilters } from './useSyncedColumnFilters';

/**
 * Event Bus
 */
const eventBus = new EventBusSrv();

describe('useSyncedColumnFilters render stability', () => {
  it('Should not update state endlessly when columns identity changes on every render', () => {
    let renderCount = 0;

    const { rerender, result } = renderHook(() => {
      renderCount += 1;

      /**
       * New array identity on every render with unchanged content,
       * which previously re-triggered the variable sync effect in a loop.
       */
      const columns: Array<ColumnDef<unknown>> = [{ id: 'device' }];

      return useSyncedColumnFilters({
        columns,
        eventBus,
        userFilterPreference: [],
        defaultFilters: [],
      });
    });

    const rendersAfterMount = renderCount;
    rerender();

    expect(renderCount - rendersAfterMount).toBeLessThanOrEqual(2);
    expect(result.current[0]).toEqual([]);
  });
});
