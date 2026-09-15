import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoadingState, TimeRange } from '@grafana/data';

import { AngularNotice, PanelHeaderTitleItems } from './PanelHeaderTitleItems';

function renderComponent(
  angularNoticeOverride?: Partial<AngularNotice>,
  onEditPanel?: () => void,
  onDeletePanel?: () => void
) {
  render(
    <PanelHeaderTitleItems
      data={{
        series: [],
        state: LoadingState.Done,
        timeRange: {} as TimeRange,
      }}
      panelId={1}
      onEditPanel={onEditPanel}
      onDeletePanel={onDeletePanel}
      angularNotice={{
        ...{
          show: true,
          isAngularDatasource: false,
          isAngularPanel: false,
        },
        ...angularNoticeOverride,
      }}
    />
  );
}

describe('PanelHeaderTitleItems angular deprecation', () => {
  const iconSelector = 'angular-deprecation-icon';
  it('should render angular warning icon for angular plugins', () => {
    renderComponent();
    expect(screen.getByTestId(iconSelector)).toBeInTheDocument();
  });

  it('should not render angular warning icon for non-angular plugins', () => {
    renderComponent({ show: false });
    expect(screen.queryByTestId(iconSelector)).not.toBeInTheDocument();
  });

  describe('Tooltip text', () => {
    const tests = [
      {
        name: 'panel',
        isAngularPanel: true,
        isAngularDatasource: false,
        expect: /This panel requires Angular/i,
      },
      {
        name: 'datasource',
        isAngularPanel: false,
        isAngularDatasource: true,
        expect: /This data source requires Angular/i,
      },
      {
        name: 'unknown (generic)',
        isAngularPanel: false,
        isAngularDatasource: false,
        expect: /This panel or data source requires Angular/i,
      },
    ];
    tests.forEach((test) => {
      it(`should render the correct tooltip depending on plugin type for {test.name}`, async () => {
        renderComponent({
          isAngularDatasource: test.isAngularDatasource,
          isAngularPanel: test.isAngularPanel,
        });
        await userEvent.hover(screen.getByTestId(iconSelector));
        await waitFor(() => {
          expect(screen.getByText(test.expect)).toBeInTheDocument();
        });
      });
    });
  });
});

describe('PanelHeaderTitleItems panel edit affordance', () => {
  const editSelector = 'fn-edit-panel';

  it('does not render the edit item when the host has not opted in', () => {
    renderComponent();
    expect(screen.queryByTestId(editSelector)).not.toBeInTheDocument();
  });

  it('renders the edit item and reports clicks to the host', async () => {
    const onEditPanel = jest.fn();
    renderComponent(undefined, onEditPanel);

    const editItem = screen.getByTestId(editSelector);
    expect(editItem).toBeInTheDocument();

    await userEvent.click(editItem);
    expect(onEditPanel).toHaveBeenCalledTimes(1);
  });
});

describe('PanelHeaderTitleItems panel delete affordance', () => {
  const deleteSelector = 'fn-delete-panel';

  it('does not render the delete item when the host has not opted in', () => {
    renderComponent();
    expect(screen.queryByTestId(deleteSelector)).not.toBeInTheDocument();
  });

  it('renders the delete item and reports clicks to the host', async () => {
    const onDeletePanel = jest.fn();
    renderComponent(undefined, undefined, onDeletePanel);

    const deleteItem = screen.getByTestId(deleteSelector);
    expect(deleteItem).toBeInTheDocument();
    expect(deleteItem).toHaveAttribute('aria-label', 'Delete panel');

    await userEvent.click(deleteItem);
    expect(onDeletePanel).toHaveBeenCalledTimes(1);
  });

  it('renders edit and delete independently of each other', () => {
    const onEditPanel = jest.fn();
    renderComponent(undefined, onEditPanel);
    expect(screen.getByTestId('fn-edit-panel')).toBeInTheDocument();
    expect(screen.queryByTestId(deleteSelector)).not.toBeInTheDocument();
  });
});
