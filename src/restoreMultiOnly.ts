import restoreImpl from "./restoreImpl";
import { NullStateProvider } from "./stateProvider";
import restoreMultiImpl from "./restoreMultiImpl";

async function run(): Promise<void> {
    await restoreMultiImpl(new NullStateProvider());
}

run();

export default run;
