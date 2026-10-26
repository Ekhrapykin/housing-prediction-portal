import { createEstimatorClient } from "./estimator";
import { createMarketClient } from "./market";
import { browserTransport } from "./transport";

/** The clients components use: queries, mutations and links over the browser transport. */
export const estimator = createEstimatorClient(browserTransport);
export const market = createMarketClient(browserTransport);
