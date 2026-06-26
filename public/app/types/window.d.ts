export declare global {
  interface Window {
    __grafanaSceneContext: SceneObject;
    __grafana_app_bundle_loaded: boolean;
    __grafana_public_path__: string;
    __grafana_load_failed: () => void;
    public_cdn_path: string;
    nonce: string | undefined;
    __POWERED_BY_QIANKUN__: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__: string;
    /**
     * Set to `true` when Grafana is running as a CodeRabbit microfrontend (FNDashboard).
     * Used by `DataSourceWithBackend` to alter the `/api/ds/query` POST body so that
     * raw SQL/queries are not exposed from the frontend.
     */
    __FNDashboard__?: boolean;
    /**
     * The UID of the dashboard currently being rendered as the CodeRabbit
     * microfrontend. Mirrored from the MFE store so that non-React code in
     * `packages/grafana-runtime` can attach it to FN-shaped `/api/ds/query`
     * bodies (panel queries already carry `request.dashboardUID`, but
     * templating-variable queries are dispatched without it).
     */
    __FNDashboardRenderingUID__?: string;
    System: typeof System;
  }

  // Augment DOMParser to accept TrustedType sanitised content
  interface DOMParser {
    parseFromString(string: string | TrustedType, type: DOMParserSupportedType): Document;
  }
}
