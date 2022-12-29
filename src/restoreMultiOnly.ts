import { NullMultiStateProvider } from "./stateProvider";
import restoreMultiImpl from "./restoreMultiImpl";

async function run(): Promise<void> {
    await restoreMultiImpl(new NullMultiStateProvider());
}

run();

export default run;
