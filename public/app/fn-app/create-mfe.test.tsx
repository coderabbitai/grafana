import { act } from '@testing-library/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { GrafanaThemeType } from '@grafana/data';
import config from 'app/core/config';
import { INITIAL_FN_STATE } from 'app/core/reducers/fn-slice';

import { createMfe } from './create-mfe';
import { FNDashboardProps } from './types';

jest.mock('app/fn_app', () => ({ __esModule: true, default: { init: jest.fn() } }));
jest.mock('app/core/services/backend_srv', () => ({ backendSrv: { cancelAllInFlightRequests: jest.fn() } }));
jest.mock('app/fn_logger', () => ({ FnLoggerService: { info: jest.fn(), error: jest.fn() } }));
jest.mock('app/store/configureMfeStore', () => ({
  mfeDispatch: jest.fn(),
  mfeGetStoreState: () => ({ fnGlobalReducer: { mode: 'light' } }),
  updatePartialMfeStates: jest.fn(),
}));

describe('MFE React root ownership', () => {
  it('unmounts external dashboard and controls portals before a replacement mount', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<div id="grafanaRoot"></div>';
    const dashboard = document.createElement('div');
    const controls = document.createElement('div');
    document.body.append(host, dashboard, controls);
    const cleanup = jest.fn();
    const Component = () => {
      useEffect(() => cleanup, []);
      return (
        <>
          {createPortal(<div data-testid="dashboard" />, dashboard)}
          {createPortal(<button>Refresh</button>, controls)}
        </>
      );
    };
    const props: FNDashboardProps = {
      ...INITIAL_FN_STATE,
      name: 'test',
      container: host,
      mode: GrafanaThemeType.Light,
      isLoading: jest.fn(),
      setErrors: jest.fn(),
    };
    config.bootData.themePaths = { light: '/light.css', dark: '/dark.css' };
    const mount = createMfe.mountFnApp(Component);
    const unmount = createMfe.unMountFnApp();
    try {
      await act(async () => {
        await mount(props, window);
      });
      expect(dashboard.children).toHaveLength(1);
      expect(controls.children).toHaveLength(1);
      await expect(mount(props, window)).rejects.toThrow('Grafana root is already mounted');
      expect(dashboard.children).toHaveLength(1);
      expect(controls.children).toHaveLength(1);
      await act(async () => {
        await unmount(props, window);
      });
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(dashboard.children).toHaveLength(0);
      expect(controls.children).toHaveLength(0);
      await act(async () => {
        await mount(props, window);
      });
      expect(dashboard.children).toHaveLength(1);
      expect(controls.children).toHaveLength(1);
      await act(async () => {
        await unmount(props, window);
      });
      expect(cleanup).toHaveBeenCalledTimes(2);
    } finally {
      host.remove();
      dashboard.remove();
      controls.remove();
    }
  });
});
