import * as cache from "@actions/cache";
import * as core from "@actions/core";

import {Events, MultiInputs, MultiOutputs, MultiState, Outputs, State} from "./constants";
import { IStateProvider } from "./stateProvider";
import * as utils from "./utils/actionUtils";
import { stringToArray } from "./utils/actionUtils";

async function restoreMultiImpl(
    stateProvider: IStateProvider
): Promise<string[] | undefined> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            core.setOutput(MultiOutputs.CacheHits, JSON.stringify([false]));
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

        const primaryKeys = core.getInput(MultiInputs.MultiKeys, { required: true });
        stateProvider.setState(State.CachePrimaryKey, primaryKeys);

        const multiPrimaryKeys = JSON.parse(primaryKeys);
        const multiRestoreKeys = utils.getInputAsArrayOfArray(MultiInputs.RestoreKeys);
        const multiCachePaths = utils.getInputAsArrayOfArray(MultiInputs.Paths, {
            required: true
        });
        const enableCrossOsArchive = utils.getInputAsBool(
            MultiInputs.EnableCrossOsArchive
        );
        const failOnCacheMiss = utils.getInputAsBool(MultiInputs.FailOnCacheMiss);
        const lookupOnly = utils.getInputAsBool(MultiInputs.LookupOnly);

        const rcPromises: Array<Promise<string | undefined>> = new Array<Promise<string | undefined>>();

        multiPrimaryKeys.map( (primaryKey, index) => {
            const cachePaths: string[] = (multiCachePaths.length > index) ? multiCachePaths[index] : [];
            const restoreKeys: string[] = (multiRestoreKeys.length > index) ? multiRestoreKeys[index] : [];
            rcPromises.push(cache.restoreCache(
                cachePaths,
                primaryKey,
            restoreKeys,
            { lookupOnly: lookupOnly },
            enableCrossOsArchive
            ));
        });

        await Promise.all<string | undefined>(rcPromises).then( cacheKeys => {
            const isExactKeyMatches: Array<boolean> = new Array<boolean>();
            let allSucceeded = true;
            cacheKeys.map( (cacheKey, index) => {
                if (!cacheKey) {
                    if (failOnCacheMiss) {
                      throw new Error(
                      `Failed to restore cache entry. Exiting as fail-on-cache-miss is set. Input keys: ${[
                            multiPrimaryKeys[index],
                            ...mResKeys
                        ].join(", ")}`
                      );
                    }
                    const mResKeys = (multiRestoreKeys.length > index) ? multiRestoreKeys[index] : [];
                    core.info(
                        `Cache not found for input keys: ${[
                            multiPrimaryKeys[index],
                            ...mResKeys
                        ].join(", ")}`
                    );

                    allSucceeded = false;
                } else {
                    isExactKeyMatches.push(utils.isExactKeyMatch(
                        multiPrimaryKeys[index],
                        cacheKey
                    ));
                }
            });

            if (!allSucceeded) {
                return;
            }

            const cacheKeysString = JSON.stringify(cacheKeys);
            // Store the matched cache key in states
            stateProvider.setState(State.CacheMatchedKey, cacheKeysString);

            core.setOutput(MultiOutputs.CacheHits, JSON.stringify(isExactKeyMatches));
            core.info(`Cache(s) restored from keys: \n${cacheKeysString}`);
            return cacheKeys;
        });

    } catch (error: unknown) {
        core.setFailed((error as Error).message);
    }
}

export default restoreMultiImpl;
