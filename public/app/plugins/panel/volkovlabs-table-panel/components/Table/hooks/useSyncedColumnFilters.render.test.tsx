import { EventBus } from '@grafana/data';
import { ColumnDef } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';

import { useSyncedColumnFilters } from './useSyncedColumnFilters';

/**
 * Event Bus
 */
const eventBus = { getStream: () => new Subject() } as unknown as EventBus;

describe('useSyncedColumnFilters render stability', () => {
  it('Should not update state endlessly when columns identity changes on every render', () => {
    let renderCount = 0;

    const { rerender, result } = renderHook(() => {
      renderCount += 1;

      /**
       * New array identity on every render with unchanged content,
       * which previously re-triggered the variable sync effect in a loop.
       */
      return useSyncedColumnFilters({
        columns: [{ id: 'device' }] as Array<ColumnDef<unknown>>,
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
