import * as cache from "@actions/cache";
import * as core from "@actions/core";

import {Events, Inputs, MultiInputs, RefKey} from "../src/constants";
import run from "../src/restoreMultiImpl";
import {NullMultiStateProvider, StateProvider} from "../src/stateProvider";
import * as actionUtils from "../src/utils/actionUtils";
import * as testUtils from "../src/utils/testUtils";
import {arrayOfArrayToString} from "../src/utils/actionUtils";
import {clearMultiInputs} from "../src/utils/testUtils";

jest.mock("../src/utils/actionUtils");

beforeAll(() => {
    jest.spyOn(actionUtils, "isExactKeyMatch").mockImplementation(
        (key, cacheResult) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.isExactKeyMatch(key, cacheResult);
        }
    );

    jest.spyOn(actionUtils, "isValidEvent").mockImplementation(() => {
        const actualUtils = jest.requireActual("../src/utils/actionUtils");
        return actualUtils.isValidEvent();
    });

    jest.spyOn(actionUtils, "getInputAsArray").mockImplementation(
        (name, options) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.getInputAsArray(name, options);
        }
    );


    jest.spyOn(actionUtils, "getInputAsArrayOfArray").mockImplementation(
        (name, options) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.getInputAsArrayOfArray(name, options);
        }
    );

    jest.spyOn(actionUtils, "getInputAsArrayOfArray").mockImplementation(
        (name, options) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.getInputAsArrayOfArray(name, options);
        }
    );

    jest.spyOn(actionUtils, "stringToArray").mockImplementation(
        (array) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.stringToArray(array);
        }
    );

    jest.spyOn(actionUtils, "stringToArrayOfArray").mockImplementation(
        (arrayOfArray) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.stringToArray(arrayOfArray);
        }
    );
});

beforeEach(() => {
    process.env[Events.Key] = Events.Push;
    process.env[RefKey] = "refs/heads/feature-branch";

    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => false);
    jest.spyOn(actionUtils, "isCacheFeatureAvailable").mockImplementation(
        () => true
    );
});

afterEach(() => {
    testUtils.clearMultiInputs();
    delete process.env[Events.Key];
    delete process.env[RefKey];
});

test("restore with too many keys should fail", async () => {
    const paths = [["node_modules"], ["node_modules_test2"]];
    const keys = ["node-test", "node-test2"];
    const restoreKeys = [ [...Array(20).keys()].map(x => x.toString()), [...Array(20).keys()].map(x => x.toString())];
    testUtils.setMultiInputs({
        paths: paths,
        keys,
        restoreKeys
    });
    const failedMock = jest.spyOn(core, "setFailed");
    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    await run(new StateProvider());
    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], restoreKeys[0]);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], restoreKeys[1]);
    //expect(failedMock).toHaveBeenCalledTimes(1);
    expect(failedMock).toHaveBeenCalledWith(
        `Key Validation Error: Keys are limited to a maximum of 10.`
    );
});

test("restore with large key should fail", async () => {
    const paths = [ ["node_modules"], ["node_modules_test2"]];
    const keys = [ "foo".repeat(512), "bar".repeat(512)]; // Over the 512 character limit
    testUtils.setMultiInputs({
        paths: paths,
        keys
    });
    const failedMock = jest.spyOn(core, "setFailed");
    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    await run(new StateProvider());
    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);
    expect(failedMock).toHaveBeenCalledWith(
        `Key Validation Error: ${keys[0]} cannot be larger than 512 characters.`
    );
});

test("restore with invalid key should fail", async () => {
    const paths = [ ["node_modules"], ["node_modules_test2" ]];
    const keys = ["comma,comma", "comma,comma"];
    testUtils.setMultiInputs({
        paths: paths,
        keys
    });
    const failedMock = jest.spyOn(core, "setFailed");
    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    await run(new StateProvider());
    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);
    expect(failedMock).toHaveBeenCalledWith(
        `Key Validation Error: ${keys[0]} cannot contain commas.`
    );
});

test("restore with invalid event outputs warning", async () => {
    const logWarningMock = jest.spyOn(actionUtils, "logWarning");
    const failedMock = jest.spyOn(core, "setFailed");
    const invalidEvent = "commit_comment";
    process.env[Events.Key] = invalidEvent;
    delete process.env[RefKey];
    await run(new StateProvider());
    expect(logWarningMock).toHaveBeenCalledWith(
        `Event Validation Error: The event type ${invalidEvent} is not supported because it's not tied to a branch or tag ref.`
    );
    expect(failedMock).toHaveBeenCalledTimes(0);
});

test("restore without AC available should no-op", async () => {
    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => false);
    jest.spyOn(actionUtils, "isCacheFeatureAvailable").mockImplementation(
        () => false
    );

    const restoreCacheMock = jest.spyOn(cache, "restoreCache").mockImplementation(
        cache.restoreCache);
    const setCacheHitOutputMock = jest.spyOn(core, "setOutput");

    await run(new StateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(0);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([ false ]));
});

test("restore on GHES without AC available should no-op", async () => {
    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => true);
    jest.spyOn(actionUtils, "isCacheFeatureAvailable").mockImplementation(
        () => false
    );

    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    const setCacheHitOutputMock = jest.spyOn(core, "setOutput");

    await run(new NullMultiStateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(0);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([ false ]));
});

test("restore on GHES with AC available ", async () => {
    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => true);
    const paths = [ ["node_modules"], ["node_modules_test2"] ];
    const keys = [ "node-test", "node-test2"];
    testUtils.setMultiInputs({
        paths: paths,
        keys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const setCacheHitOutputMock = jest.spyOn(core, "setOutput");
    let i = 0;
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(keys[i++]);
        });

    await run(new StateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", JSON.stringify(keys));
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([true,true]));

    expect(infoMock).toHaveBeenCalledWith(`Cache(s) restored from keys: \n${JSON.stringify(keys)}`);
    expect(failedMock).toHaveBeenCalledTimes(0);

});

test("restore with no path should fail", async () => {
    const failedMock = jest.spyOn(core, "setFailed");
    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    await run(new StateProvider());
    expect(restoreCacheMock).toHaveBeenCalledTimes(0);
    // this input isn't necessary for restore b/c tarball contains entries relative to workspace

    expect(failedMock).toHaveBeenCalledTimes(1);
    expect(failedMock).not.toHaveBeenCalledWith(
        "Input required and not supplied: path"
    );
});

test("restore with no key", async () => {
    testUtils.setInput(MultiInputs.Paths, arrayOfArrayToString([["node_modules"], ["node_modules_test2"]]));
    const failedMock = jest.spyOn(core, "setFailed");
    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    await run(new StateProvider());
    expect(restoreCacheMock).toHaveBeenCalledTimes(0);

    expect(failedMock).toHaveBeenCalledTimes(1);
    expect(failedMock).toHaveBeenCalledWith(
        "Input required and not supplied: keys"
    );
});

test("restore with no cache found", async () => {
    const paths = [["node_modules"], ["node_modules_test2"]];
    const keys = ["node-test", "node-test2"];
    testUtils.setMultiInputs({
        paths: paths,
        keys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(undefined);
        });

    await run(new StateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", JSON.stringify(keys));
    expect(failedMock).toHaveBeenCalledTimes(0);

    expect(infoMock).toHaveBeenCalledTimes(2);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[0]}`
    );
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[1]}`
    );

    restoreCacheMock.mockReset();

});

test("restore with restore keys and no cache found", async () => {
    const paths = [ ["node_modules"], ["node_modules_test"] ];
    const keys = ["node-test", "node-test2"];
    const restoreKeys = [ ["node-"], ["node-test2"] ];
    testUtils.setMultiInputs({
        paths: paths,
        keys,
        restoreKeys: restoreKeys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(undefined);
        });

    await run(new StateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], restoreKeys[0]);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], restoreKeys[1]);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", JSON.stringify(keys));
    expect(failedMock).toHaveBeenCalledTimes(0);

    expect(infoMock).toHaveBeenCalledTimes(2);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[0]}, ${restoreKeys[0]}`
    );
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[1]}, ${restoreKeys[1]}`
    );

});

test("restore with cache found for key", async () => {
    const paths = [ ["node_modules"], ["node_modules_test"] ];
    const keys = ["node-test", "node-test2"];
    testUtils.setMultiInputs({
        paths: paths,
        keys,
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const setCacheHitOutputMock = jest.spyOn(core, "setOutput");
    let i = 0;
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(keys[i++]);
        });

    await run(new StateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", JSON.stringify(keys));
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([true, true]));

    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith(`Cache(s) restored from keys: \n${JSON.stringify(keys)}`);
    expect(failedMock).toHaveBeenCalledTimes(0);

});

test("restore with cache found for restore key", async () => {
    const paths = [ ["node_modules"], ["node_modules_test"] ];
    const keys = ["node-test", "node2-test"];
    const restoreKeys = [ ["node-"], ["node2-"]];
    testUtils.setMultiInputs({
        paths: paths,
        keys,
        restoreKeys: restoreKeys
    });


    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const setCacheHitOutputMock = jest.spyOn(core, "setOutput");
    let i = 0;
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(restoreKeys[i++][0]);
        });

    await run(new StateProvider());

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], restoreKeys[0]);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], restoreKeys[1]);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", JSON.stringify(keys));
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([false, false]));

    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache(s) restored from keys: \n${JSON.stringify([restoreKeys[0][0], restoreKeys[1][0]])}`
    );
    expect(failedMock).toHaveBeenCalledTimes(0);

});
