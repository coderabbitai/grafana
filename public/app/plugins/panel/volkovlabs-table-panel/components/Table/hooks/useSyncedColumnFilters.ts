import { EventBus } from '@grafana/data';
import { RefreshEvent } from '@grafana/runtime';
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { getVariableColumnFilters, mergeColumnFilters } from 'app/plugins/panel/volkovlabs-table-panel/utils';

/**
 * Use synced column filters with variables
 */
export const useSyncedColumnFilters = <TData>({
  columns,
  eventBus,
  userFilterPreference,
  defaultFilters,
}: {
  columns: Array<ColumnDef<TData>>;
  eventBus: EventBus;
  userFilterPreference: ColumnFiltersState;
  defaultFilters: ColumnFiltersState;
}) => {
  const initialFilters = () => {
    if (userFilterPreference && !!userFilterPreference.length) {
      return userFilterPreference;
    }

    if (defaultFilters && defaultFilters.length > 0) {
      return defaultFilters;
    }

    return [];
  };

  /**
   * Initial Default filters
   */
  const [initialDefaultFiltersState, setInitialDefaultFiltersState] = useState<ColumnFiltersState>(defaultFilters);

  /**
   * Filtering
   */
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialFilters);

  /**
   * Use user Preferences
   */
  useEffect(() => {
    if (userFilterPreference && !!userFilterPreference.length) {
      setColumnFilters(userFilterPreference);
    }
  }, [userFilterPreference]);

  /**
   * Use defaultFilters if the default filters are changed
   */
  useEffect(() => {
    if (JSON.stringify(initialDefaultFiltersState) !== JSON.stringify(defaultFilters)) {
      setInitialDefaultFiltersState(defaultFilters);
      setColumnFilters(defaultFilters);
    }
  }, [defaultFilters, initialDefaultFiltersState]);

  /**
   * Merge variable filters into the current state.
   *
   * `mergeColumnFilters` always returns a new array, so the previous state is returned unchanged when the
   * merge result is equivalent. Without this bail out React keeps re-rendering, because `columns` is a new
   * reference on every render and re-triggers the effect below, which exceeds the maximum update depth.
   */
  const syncVariableFilters = useCallback(() => {
    setColumnFilters((current) => {
      const merged = mergeColumnFilters(current, getVariableColumnFilters(columns));

      return isEqual(current, merged) ? current : merged;
    });
  }, [columns]);

  /**
   * Set initial filters from variables and update on variable change
   */
  useEffect(() => {
    syncVariableFilters();

    const subscription = eventBus.getStream(RefreshEvent).subscribe(() => {
      syncVariableFilters();
    });

    return () => {
      return subscription.unsubscribe();
    };
  }, [eventBus, syncVariableFilters]);

  return [columnFilters, setColumnFilters] as [typeof columnFilters, typeof setColumnFilters];
};
