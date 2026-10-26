import { createEstimatorMutations, createEstimatorQueries } from "./estimator";
import { createMarketQueries } from "./market";
import { browserTransport } from "./transport";

/** The clients components use, over the browser transport. */
export const estimator = { queries: createEstimatorQueries(browserTransport), mutations: createEstimatorMutations(browserTransport) };
export const market = { queries: createMarketQueries(browserTransport) };
