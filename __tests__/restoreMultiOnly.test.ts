import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, RefKey } from "../src/constants";
import run from "../src/restoreMultiOnly";
import * as actionUtils from "../src/utils/actionUtils";
import * as testUtils from "../src/utils/testUtils";
import {arrayOfArrayToString, stringToArray} from "../src/utils/actionUtils";
import {NullMultiStateProvider} from "../src/stateProvider";

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

    jest.spyOn(actionUtils, "arrayOfArrayToString").mockImplementation(
        (arrayOfArray) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.arrayOfArrayToString(arrayOfArray);
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
    testUtils.clearInputs();
    delete process.env[Events.Key];
    delete process.env[RefKey];
});

test("restore with no cache found", async () => {
    const paths = [ ["node_modules"], ["node_modules_path2"]];
    const keys = [ "node-test", "node-test-2" ];
    testUtils.setMultiInputs({
        paths: paths,
        multiKeys: keys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const outputMock = jest.spyOn(core, "setOutput");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(undefined);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);

    expect(outputMock).toHaveBeenCalledWith("cache-primary-keys", JSON.stringify(keys));
    expect(outputMock).toHaveBeenCalledTimes(1);
    expect(failedMock).toHaveBeenCalledTimes(0);

    expect(infoMock).toHaveBeenCalledTimes(2);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[0]}`
    );
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[1]}`
    );
});

test("restore with restore keys and no cache found", async () => {
    const paths = [ ["node_modules"], ["node_modules_path2"]];
    const keys = [ "node-test", "node-test-2" ];
    const restoreKeys = [[ "node-" ], ["node-test-2-"]];
    testUtils.setMultiInputs({
        paths: paths,
        multiKeys: keys,
        restoreKeys: restoreKeys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const outputMock = jest.spyOn(core, "setOutput");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(undefined);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], restoreKeys[0]);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], restoreKeys[1]);

    expect(outputMock).toHaveBeenCalledWith("cache-primary-keys", JSON.stringify(keys));
    expect(failedMock).toHaveBeenCalledTimes(0);

    expect(infoMock).toHaveBeenCalledTimes(2);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[0]}, ${restoreKeys[0]}`);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${keys[1]}, ${restoreKeys[1]}`);

    restoreCacheMock.mockReset();
});

test("restore with cache found for key", async () => {
    const paths = [ ["node_modules"], ["node_modules_path2"]];
    const keys = [ "node-test", "node-test-2" ];
    testUtils.setMultiInputs({
        paths: paths,
        multiKeys: keys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const outputMock = jest.spyOn(core, "setOutput")
    let i = 0;
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(keys[i++]);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], []);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], []);

    expect(outputMock).toHaveBeenCalledTimes(3);
    expect(outputMock).toHaveBeenCalledWith("cache-primary-keys", JSON.stringify(keys));
    expect(outputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([true, true]));
    expect(outputMock).toHaveBeenCalledWith("cache-matched-keys", JSON.stringify(keys));


    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith(`Cache(s) restored from keys: \n${JSON.stringify(keys)}`);
    expect(failedMock).toHaveBeenCalledTimes(0);

    restoreCacheMock.mockReset();

});

test("restore with cache found for restore key", async () => {
    const paths = [["node_modules"], ["node_modules_path2"]];
    const keys = [ "node-test", "node-test-2" ];
    const restoreKeys = [[ "node-" ], ["node-test-2-"]];
    testUtils.setMultiInputs({
        paths: paths,
        multiKeys: keys,
        restoreKeys: restoreKeys
    });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const outputMock = jest.spyOn(core, "setOutput");
    let i = 0;
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementation(() => {
            return Promise.resolve(restoreKeys[i++][0]);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(2);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[0], keys[0], restoreKeys[0]);
    expect(restoreCacheMock).toHaveBeenCalledWith(paths[1], keys[1], restoreKeys[1]);

    expect(outputMock).toHaveBeenCalledTimes(3);
    expect(outputMock).toHaveBeenCalledWith("cache-primary-keys", JSON.stringify(keys));
    expect(outputMock).toHaveBeenCalledWith("cache-hits", JSON.stringify([false, false]));
    expect(outputMock).toHaveBeenCalledWith("cache-matched-keys", JSON.stringify([restoreKeys[0][0],restoreKeys[1][0]]));


    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith(
        `Cache(s) restored from keys: \n${JSON.stringify([restoreKeys[0][0], restoreKeys[1][0]])}`
    );
    expect(failedMock).toHaveBeenCalledTimes(0);

    restoreCacheMock.mockReset();

});
