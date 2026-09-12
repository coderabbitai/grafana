import { css, cx } from '@emotion/css';
import { useCallback, useMemo, useState } from 'react';
import * as React from 'react';

import { Field, GrafanaTheme2, SelectableValue } from '@grafana/data';

import { Button, ClickOutsideWrapper, IconButton, Label, Stack } from '..';
import { useStyles2 } from '../../themes';

import { FilterList } from './FilterList';
import { TableStyles } from './styles';
import { calculateUniqueFieldValues, getFilteredOptions, valuesToOptions } from './utils';

interface Props {
  column: any;
  tableStyles: TableStyles;
  onClose: () => void;
  field?: Field;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  operator: SelectableValue<string>;
  setOperator: (item: SelectableValue<string>) => void;
}

export const FilterPopup = ({
  column: { preFilteredRows, filterValue, setFilter },
  onClose,
  field,
  searchFilter,
  setSearchFilter,
  operator,
  setOperator,
}: Props) => {
  const uniqueValues = useMemo(() => calculateUniqueFieldValues(preFilteredRows, field), [preFilteredRows, field]);
  const options = useMemo(() => valuesToOptions(uniqueValues), [uniqueValues]);
  const filteredOptions = useMemo(() => getFilteredOptions(options, filterValue), [options, filterValue]);
  const [values, setValues] = useState<SelectableValue[]>(filteredOptions);
  const [matchCase, setMatchCase] = useState(false);

  const onCancel = useCallback((event?: React.MouseEvent) => onClose(), [onClose]);

  const onFilter = useCallback(
    (event: React.MouseEvent) => {
      const filtered = values.length ? values : undefined;

      setFilter(filtered);
      onClose();
    },
    [setFilter, values, onClose]
  );

  const onClearFilter = useCallback(
    (event: React.MouseEvent) => {
      setFilter(undefined);
      onClose();
    },
    [setFilter, onClose]
  );

  const clearFilterVisible = useMemo(() => filterValue !== undefined, [filterValue]);
  const styles = useStyles2(getStyles);

  return (
    <ClickOutsideWrapper onClick={onCancel} useCapture={true}>
      {/* This is just blocking click events from bubbeling and should not have a keyboard interaction. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className={cx(styles.filterContainer)} onClick={stopPropagation}>
        <div className={styles.header}>
          <Label className={styles.title}>Filter by values</Label>
          <IconButton
            name="text-fields"
            tooltip="Match case"
            className={cx(styles.matchCase, matchCase && styles.matchCaseActive)}
            onClick={() => {
              setMatchCase((s) => !s);
            }}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.body}>
          <FilterList
            onChange={setValues}
            values={values}
            options={options}
            caseSensitive={matchCase}
            showOperators={true}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            operator={operator}
            setOperator={setOperator}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.footer}>
          <Stack direction="row" gap={1} alignItems="center">
            <Button size="sm" onClick={onFilter}>
              Apply
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </Stack>
          {clearFilterVisible && (
            <Button fill="text" size="sm" onClick={onClearFilter}>
              Clear filter
            </Button>
          )}
        </div>
      </div>
    </ClickOutsideWrapper>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  filterContainer: css({
    label: 'filterContainer',
    width: 280,
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    boxShadow: theme.shadows.z3,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    flexDirection: 'column',
  }),
  header: css({
    label: 'filterHeader',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.5, 2),
  }),
  title: css({
    margin: 0,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.primary,
  }),
  matchCase: css({
    label: 'matchCaseToggle',
    color: theme.colors.text.disabled,
    margin: 0,
    '&:hover': {
      color: theme.colors.text.secondary,
    },
  }),
  matchCaseActive: css({
    color: theme.colors.text.link,
    '&:hover': {
      color: theme.colors.text.link,
    },
  }),
  divider: css({
    label: 'filterDivider',
    height: 1,
    backgroundColor: theme.colors.border.weak,
  }),
  body: css({
    label: 'filterBody',
    padding: theme.spacing(1.5, 2),
  }),
  footer: css({
    label: 'filterFooter',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5, 2),
  }),
});

const stopPropagation = (event: React.MouseEvent) => {
  event.stopPropagation();
};
