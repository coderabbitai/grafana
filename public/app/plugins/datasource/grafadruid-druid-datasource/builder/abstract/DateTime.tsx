import { css, cx, injectGlobal } from '@emotion/css';
import DatePicker from 'react-datepicker';

import { GrafanaTheme } from '@grafana/data';
import { InlineLabel, stylesFactory, useTheme } from '@grafana/ui';

import { QueryBuilderFieldProps } from './types';

import { onBuilderChange } from '.';

import 'react-datepicker/dist/react-datepicker.css';

injectGlobal(`
  .react-datepicker__triangle {
    display: none;
  }
  .react-datepicker-popper {
    z-index: 1000 !important;
  }
`);

interface Props extends QueryBuilderFieldProps {
  format: string;
  time: boolean;
}

const useDate = (value = ''): any => {
  let date: Date | undefined = undefined;
  let datePlaceholder: string | undefined = undefined;
  const d = new Date(value);
  if (d instanceof Date && !isNaN(d.getFullYear())) {
    date = d;
  } else {
    datePlaceholder = value;
  }
  return [date, datePlaceholder];
};

export const DateTime = (props: Props) => {
  const [date, datePlaceholder] = useDate(props.options.builder);
  const onDateChangeRaw = (event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    const value = event?.currentTarget?.textContent;
    if (value && value.indexOf('$') !== -1) {
      onBuilderChange(props, value);
    }
  };
  const onDateChange = (
    date: Date | null,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    if (date) {
      onBuilderChange(props, date.toISOString());
    }
  };
  const { label, description, format, time } = props;
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <>
      <InlineLabel tooltip={description} width="auto">
        {label}
      </InlineLabel>
      <DatePicker
        selected={date}
        placeholderText={datePlaceholder}
        onChangeRaw={onDateChangeRaw}
        onChange={onDateChange}
        showTimeSelect={time}
        dateFormat={format}
        wrapperClassName={cx(styles.picker)}
      />
    </>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    picker: css`
      & input {
        border: 1px solid ${theme.colors.border2};
        height: 32px;
        margin-right: 4px;
      }
    `,
  };
});
