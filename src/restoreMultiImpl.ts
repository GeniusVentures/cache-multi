import * as cache from "@actions/cache";
import * as core from "@actions/core";

import {Events, Inputs, MultiInputs, MultiOutputs, MultiState, Outputs, State} from "./constants";
import { IStateProvider } from "./stateProvider";
import * as utils from "./utils/actionUtils";
import {stringToArray} from "./utils/actionUtils";

async function restoreMultiImpl(
    stateProvider: IStateProvider
): Promise<string | undefined> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            core.setOutput(Outputs.CacheHit, "false");
            return;
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const primaryKeys = core.getInput(MultiInputs.Keys, { required: true });
        stateProvider.setState(MultiState.CachePrimaryKeys, primaryKeys);

        const multiPrimaryKeys = stringToArray(primaryKeys);
        const multiRestoreKeys = utils.getInputAsArray(MultiInputs.RestoreKeys);
        const multiCachePaths = utils.getInputAsArray(MultiInputs.Paths, {
            required: true
        });

        const rcPromises: Array<Promise<string | undefined>> = new Array<Promise<string | undefined>>();
        multiPrimaryKeys.map( (primaryKey, index) => {
            const cachePaths: string[] = multiCachePaths.length > index ? stringToArray(multiCachePaths[index]) : [];
            const restoreKeys: string[] = (multiRestoreKeys.length > index) ? stringToArray(multiRestoreKeys[index]) : [];
            rcPromises.push(cache.restoreCache(
                cachePaths,
                primaryKey,
                restoreKeys
            ));
        });

        Promise.all<string | undefined>(rcPromises).then( cacheKeys => {
            const isExactKeyMatches: Array<boolean> = new Array<boolean>();
            cacheKeys.map( (cacheKey, index) => {
                if (!cacheKey) {
                    core.info(
                        `Cache not found for input keys: ${[
                            primaryKeys[index],
                            ...multiRestoreKeys[index]
                        ].join(", ")}`
                    );

                    return;
                }

                isExactKeyMatches.push(utils.isExactKeyMatch(
                    primaryKeys[index],
                    cacheKey
                ));
            })

            const cacheKeysString = cacheKeys.join('\n');
            // Store the matched cache key in states
            stateProvider.setState(MultiState.CacheMatchedKeys, cacheKeysString);

            core.setOutput(MultiOutputs.CacheHits, isExactKeyMatches.join('\n'));
            core.info(`Cache(s) restored from keys: \n${cacheKeysString}`);
            return cacheKeysString;
        });

    } catch (error: unknown) {
        core.setFailed((error as Error).message);
    }
}

export default restoreMultiImpl;
