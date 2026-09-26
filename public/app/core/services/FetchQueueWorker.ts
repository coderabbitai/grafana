import { concatMap, filter } from 'rxjs/operators';

import { BackendSrvRequest, GrafanaBootConfig } from '@grafana/runtime';

import { isDataQuery } from '../utils/query';

import { FetchQueue, FetchStatus } from './FetchQueue';
import { ResponseQueue } from './ResponseQueue';

interface WorkerEntry {
  id: string;
  options: BackendSrvRequest;
}

export class FetchQueueWorker {
  constructor(
    fetchQueue: FetchQueue,
    responseQueue: ResponseQueue,
    config: GrafanaBootConfig,
    isHostProxied: () => boolean = () => false
  ) {
    // This will create an implicit live subscription for as long as this class lives.
    // But as FetchQueueWorker is used by the singleton backendSrv that also lives for as long as Grafana app lives
    // I think this ok. We could add some disposable pattern later if the need arises.
    fetchQueue
      .getUpdates()
      .pipe(
        filter(({ noOfPending }) => noOfPending > 0), // no reason to act if there is nothing to act upon
        // Using concatMap instead of mergeMap so that the order with apiRequests first is preserved
        // https://rxjs.dev/api/operators/concatMap
        concatMap(({ state, noOfInProgress }) => {
          // The embedded app sends queries through the host's authenticated proxy,
          // not Grafana's server transport. Its minimal boot config has no HTTP/2
          // flag. Do not serialize those queries behind the standalone HTTP/1 cap.
          // Read the mode here: the singleton is constructed before MFE startup.
          const maxParallelRequests = config?.http2Enabled || isHostProxied() ? 1000 : 5;
          const apiRequests = Object.keys(state)
            .filter((k) => state[k].state === FetchStatus.Pending && !isDataQuery(state[k].options.url))
            .reduce<WorkerEntry[]>((all, key) => {
              const entry = { id: key, options: state[key].options };
              all.push(entry);
              return all;
            }, []);

          const dataRequests = Object.keys(state)
            .filter((key) => state[key].state === FetchStatus.Pending && isDataQuery(state[key].options.url))
            .reduce<WorkerEntry[]>((all, key) => {
              const entry = { id: key, options: state[key].options };
              all.push(entry);
              return all;
            }, []);

          // apiRequests have precedence over data requests and should always be called directly
          // this means we can end up with a negative value.
          // Because the way Array.toSlice works with negative numbers we use Math.max below.
          const noOfAllowedDataRequests = Math.max(maxParallelRequests - noOfInProgress - apiRequests.length, 0);
          const dataRequestToFetch = dataRequests.slice(0, noOfAllowedDataRequests);

          return apiRequests.concat(dataRequestToFetch);
        })
      )
      .subscribe(({ id, options }) => {
        // This will add an entry to the responseQueue
        responseQueue.add(id, options);
      });
  }
}
