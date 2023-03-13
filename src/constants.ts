export enum Inputs {
    Key = "key", // Input for cache, restore, save action
    Path = "path", // Input for cache, restore, save action
    RestoreKeys = "restore-keys", // Input for cache, restore action
    UploadChunkSize = "upload-chunk-size" // Input for cache, save action
}

export enum MultiInputs {
    MultiKeys = "multi-keys", // Input for multiple suffixes
    Paths = "paths", // Input for cache, restore, save action
    RestoreKeys = "restore-keys", // Input for cache, restore action
    UploadChunkSize = "upload-chunk-size" // Input for cache, save action
}

export enum Outputs {
    CacheHit = "cache-hit", // Output from cache, restore action
    CachePrimaryKey = "cache-primary-key", // Output from restore action
    CacheMatchedKey = "cache-matched-key" // Output from restore action
}

export enum MultiOutputs {
    CacheHits = "cache-hits", // Output from cache, restore action
    CachePrimaryKeys = "cache-primary-keys", // Output from restore action
    CacheMatchedKeys = "cache-matched-keys" // Output from restore action
}

export enum State {
    CachePrimaryKey = "CACHE_KEY",
    CacheMatchedKey = "CACHE_RESULT"
}

export enum MultiState {
    CachePrimaryKeys = "CACHE_KEYS",
    CacheMatchedKeys = "CACHE_RESULTS"
}

export enum Events {
    Key = "GITHUB_EVENT_NAME",
    Push = "push",
    PullRequest = "pull_request"
}

export const RefKey = "GITHUB_REF";
