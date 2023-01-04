# Restore Multiple action

The restore multi action, as the name suggest, restores mutiple caches. It acts similar to the`cache` action except that
it doesn't have a post step to save the cache. This action can provide you a granular control to only restore a cache 
without having to necessarily save it.  It accepts an array of inputs and iterates through them sending a set of inputs to the `cache` action.

## Inputs

* `paths` - (JSON encoded) - A list of lists of files, directories, and wildcard patterns to cache and restore. See [`@actions/glob`](https://github.com/actions/toolkit/tree/main/packages/glob) for supported patterns.
* `keys` -(JSON encoded) - A list of Strings used while saving cache for restoring the cache
* `restore-keys` - (JSON encoded) - A list of ordered lists of prefix-matched keys to use for restoring stale cache if no cache hit occurred for key.

## Outputs

* `cache-hits` - (JSON encoded) - A list of boolean values to indicate an exact match was found for the key. 
* `cache-primary-keys` - (JSON encoded) - A list of Cache primary keyS passed in the input to use in subsequent steps of the workflow.
* `cache-matched-keys` - (JSON encoded) - A list of Keys of the cache that was restored, it could either be the primary key on cache-hit or a partial/complete match of one of the restore keys.

> **Note**
`cache-hits` will be set to `true` only when cache hit occurs for the exact `key` match. For a partial key match via `restore-keys` or a cache miss, it will be set to `false`.

### Environment Variables
* `SEGMENT_DOWNLOAD_TIMEOUT_MINS` - Segment download timeout (in minutes, default `60`) to abort download of the segment if not completed in the defined number of minutes. [Read more](https://github.com/actions/cache/blob/main/workarounds.md#cache-segment-restore-timeout)

## Use cases

As this is a newly introduced action to give users more control in their workflows, below are some use cases where one can use this action.

### Only restore cache

In case you are using another workflow to create and save your cache that can be reused by other jobs in your repository, this action will take care of your restore only needs.

```yaml
steps:
  - uses: actions/checkout@v3

  - uses: actions/cache-multi/restoremulti@v3.2.2
    id: cache
    with:
      paths: "[ [ \"path/to/dependencies\", \"path/to/dependencies2\"], [ \"path/to/dependencies\", \"path/to/dependencies2\"] ]"
      keys: "[ \"${{ runner.os }}-${{ hashFiles('**/lockfiles') }}\", \"${{ runner.os }}-${{ hashFiles('**/lockfiles-2') }}\" ] "

  - name: Install Dependencies
    if: $$ {{ fromJson(steps.cache.outputs.cache-hits)[0] != 'true' }}
    run: /install.sh

  - name: Build
    run: /build.sh

  - name: Publish package to public
    run: /publish.sh
```

Once the cache is restored, this action won't run any post step to do post-processing like `actions/cache` and the rest of the workflow will run as usual.

### Save intermediate private build artifacts

In case of multi-module projects, where the built artifact of one project needs to be reused in subsequent child modules, the need of rebuilding the parent module again and again with every build can be eliminated. The `actions/cache` or `actions/cache/save` action can be used to build and save the parent module artifact once, and restored multiple times while building the child modules.


#### Using restore action outputs to make save action behave just like the cache action

The outputs `cache-primary-keys` and `cache-matched-keys` can be used to check if the restored cache(s) are same as the given primary key. Alternatively, the `cache-hits` output(s) can also be used to check if the restored was a complete match or a partially restored cache.

#### Ensuring proper restores and save happen across the actions

It is very important to use the same `key` and `path` that were used by either `actions/cache` or `actions/cache/save` while saving the cache. Learn more about cache key [naming](https://github.com/actions/cache#creating-a-cache-key) and [versioning](https://github.com/actions/cache#cache-version) here.
