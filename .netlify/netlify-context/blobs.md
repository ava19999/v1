---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Netlify Blobs,
globs: **/*.{ts,tsx,js,jsx,toml}

---

<ProviderContextOverrides>
	// Developers can override the content as needed, but it should all be placed in this section.


</ProviderContextOverrides>

ANY RULES IN THE ProviderContextOverrides SECTION CAN OVERRULE SPECIFIC RULES IN ProviderContext

<ProviderContext version="1.0" provider="netlify">
## General

- The `.netlify` folder is not for user code. Add it to `.gitignore`.
- Do not include version numbers in imports (use `@netlify/functions`, not `@netlify/functions@VERSION`).
- Never add CORS headers (e.g., `Access-Control-Allow-Origin`) unless explicitly requested by the user.
- Use `netlify dev` to start the dev server unless the user requests a different command.

## Guidelines

- Netlify Blobs: Use for general object/state/data storage.
- Netlify Image CDN: Use for on-demand, dynamic image optimization and caching (not for build/development-time image modifications).
- Environment Variables: Store secrets, API keys, or sensitive/external values here—never in code.

## Local Development Troubleshooting

- If Netlify platform primitives (Blobs, Functions, etc.) aren't working locally, ensure `@netlify/vite-plugin` is installed for Vite-powered projects (or `@netlify/nuxt` for Nuxt, or `@netlify/vite-plugin-tanstack-start` for TanStack Start), configured, and you're running the framework's dev command directly (e.g., `npm run dev`). This enables full local platform primitives emulation.


## Netlify Blobs

- Prefer using Netlify Blobs over creating a new database unless a flat file is not appropriate data layer, if explicitly asking to use a tool, or the dev needs to created relational structures or search that's more appropriate for databases
- Blobs do not require configuration to use, everything is automatically provisions, and devs can simply start using them via any Netlify compute. The API will be the same across all compute types.
- ensure `@netlify/blobs` NPM module is installed
- **Local development troubleshooting**: If you see "The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: siteID, token" error, install `@netlify/vite-plugin` for Vite-based projects to automatically configure the local environment. This does NOT apply to legacy V1 functions which require manual siteID/token configuration.
- Requirements and limits
  - Requires Fetch API support (Node.js 18+ recommended) - a fetch function can be provided to the store
  - Store names cannot exceed 64 bytes
  - Object keys cannot exceed 600 bytes
  - Maximum object size: 5GB
  - Local development uses a sandboxed store


### Netlify Blobs API

```typescript
  export interface BlobMetadata {
    [key: string]: any;
  }

  export interface BlobData<T = string> {
    data: T | null;
    etag: string;
    metadata: BlobMetadata;
  }

  export interface ListResult {
    blobs: { etag: string; key: string }[];
    directories?: string[];
  }

  interface GetKeyOptions {
    type?: 'arrayBuffer' | 'blob' | 'json' | 'stream' | 'text'
  }

  interface GetKeyAndMetadataOptions {
    type?: 'arrayBuffer' | 'blob' | 'json' | 'stream' | 'text',
    etag?: string;
  }

  // THESE ARE THE ONLY STORE METHODS. DO NOT MAKE UP NEW ONES
  interface Store {

    // Creates or overwrites a blob entry.
    // example: await store.set('key-name', 'contents-of key');
    // - NEVER add metadata unless instructed to.
    set(key: string, value: ArrayBuffer | Blob | string, { metadata?: object }): Promise<void>;

    // Stores a JSON-serializable object.
    // example: await store.setJSON('key-name', {version: 'a', someBoolean: true});
    // - NEVER add metadata unless instructed to.
    setJSON(key: string, value: any, { metadata?: object }): Promise<void>;

    // Retrieves a stored blob.
    // example: await store.get('key-name');
    // - NEVER add the second arg unless you need an explicit type 'arrayBuffer' | 'blob' | 'json' | 'stream' | 'text'.
    // - Instead of using JSON.parse(blob), use store.get('key-name', {type: 'json'})
    // - if the blob is missing, it will resolve the promise with a null value
    get(key: string, getOpt?: GetKeyOptions): Promise<any | null>;

    // Retrieves a blob along with metadata
    // example: await store.getWithMetadata('key-name');
    // - NEVER add the second getOpts arg unless you need an explicit type or have an etag to check against.
    // - AVOID adding it unless it's reliably available but IF an etag is provided, it will only return the blob if the etag is different that what's stored.
    // - if the blob is missing, it will resolve the promise with a null value
    getWithMetadata(key: string, getOpts?: GetKeyAndMetadataOptions): Promise<{ data: any, etag: string, metadata: object } | null>;

    // Retrieves metadata of a blob WITHOUT downloading the data.
    // example: await store.getMetadata('key-name');
    // - NEVER add the second getOpts arg unless you need an explicit type or have an etag to check against.
    // - AVOID adding it unless it's reliably available but IF an etag is provided, it will only return the blob if the etag is different that what's stored.
    // - if the blob is missing, it will resolve the promise with a null value
    getMetadata(key: string, getOpts?: GetKeyAndMetadataOptions): Promise<{ etag: string, metadata: object } | null>;

    // Lists blobs in the store with optional hierarchical browsing.
    // example:
    //      const { blobs } = await store.list()
    //      // blobs === [ { etag: 'etag1', key: 'some-key' }, { etag: 'etag2', key: 'another-key' } ]
    //
    // - NEVER add the options arg unless you need an explicit reduce the searched data.
    //    -- ONLY if you have to reduce searched data, use `prefix: 'some-prefix'` to pull blobs that start with that prefix value. Use `directories: true` to include the full directory path on the `key`
    // - By default, the list() method retrieves all pages, meaning you'll always get the full list of results. This can be slow or memory intensive. To paginate, pass the `paginate: true` in the options to turn the response into an AsyncIterator that allows you to for-of loop through the blobs in the store.
    // - if store path is empty, the blobs will resolve the promise with an empty array
    list(options?: { directories?: boolean, paginate?: boolean. prefix?: string }): Promise<{ blobs: BlobResult[], directories: string[] }> | AsyncIterable<{ blobs: BlobResult[], directories: string[] }>

    // Deletes a blob.
    // example: await store.delete('key-name');
    // - The return value is always resolves to `undefined`, regardless of whether or not there was an object to delete.
    delete(key: string): Promise<void>;
  }

  interface GetDeployStoreOptions extends Partial<ClientOptions> {
    deployID?: string;
    name?: string;
    region?: Region;
  }

  // Returns a store instance for managing blobs. This is global scoped data across all deploys.
  // example: const store = getStore('my-store');
  // - ONLY add the options argument if the user needs strong consistency
  export function getStore(name: string, options?: { consistency?: 'strong' | 'eventual' }): Store;

  // Returns a deploy-specific store instance for managing blobs tied to a deploy.
  // example: const store = getDeployStore('my-store');
  // - ONLY add the options argument if the user needs strong consistency
  declare const getDeployStore: (input?: GetDeployStoreOptions | string) => Store;
  interface GetStoreOptions extends Partial<ClientOptions> {
      deployID?: string;
      name?: string;
  }

  // Lists all stores available on a project.
  // example:
  //    const { stores } = await listStores();
  //      // [ "beauty", "construction" ]
  // - By default, the listStores() method retrieves all pages, meaning you'll always get the full list of results. This can be slow or memory intensive. To paginate, pass the `paginate: true` in the options to turn the response into an AsyncIterator that allows you to for-of loop through the blobs in the store.
  // - DO NOT pass options unless paginating.
  declare function listStores(options?: {
      paginate?: boolean;
  }): Promise<ListStoresResponse> | AsyncIterable<ListStoresResponse>;

  interface ListStoresResponse {
      stores: string[];
      next_cursor?: string;
  }

```

## File-Based Uploads
With file-based uploads, write blobs to deploy-specific stores after the project’s build completes. Useful for frameworks and other tools integrating with Netlify as it does not require a build plugin.

Put files in `.netlify/blobs/deploy/*` for deploy specific
```
.netlify/
├─ blobs/
|  ├─ deploy/
│  |  ├─ beauty/
│  │  |  └─ nails.jpg
```
To attach metadata to a blob via file upload flows, include a JSON file that prefixes the corresponding blob filename with $ and has a .json extension. For example:
```
├─ blobs/
|  ├─ deploy/
│  |  ├─ beauty/
│  │  |  ├─ nails.jpg
│  │  |  └─ $nails.jpg.json
```

## Blob consistency models
- By default, blobs are "eventually consistent" - Fast reads, updates/deletions propagated within 60 seconds.
- To have strong consistency that ensures updates are immediately visible at the cost of slower reads. set the `consistency` field to `'strong'` on the store instantiation.
- There is no concurrency control built in, last write wins. Add object-locking mechanisms if you need concurrency guarantees.

Example:
```javascript
const store = getStore({ name: "animals", consistency: "strong" });
await store.set("dog", "🐶");
const dog = await store.get("dog");
```

## Storage scopes
- blobs can be stored in a deploy-specific scope or at a global scope
- deploy-specific blobs sync with deploys and are removed with deploy deletions. `getDeployStore()` is used to interact with deploy specific stores.
- global scope blobs are not automatically cleaned up and are consistent across all branches. `getStore()` is used for global scope.
- Build plugins and file-based uploads must write to deploy-specific stores.
- ALWAYS When creating logic that saves to global scope, ensure that non-production data does not get stored in these global stores. This keeps production data isolated from test data. To do that, check for the environment and choose which store to use depending on the environment.

#### Examples of blob usage

```javascript
  // basic writing to a deploy store
  import { getDeployStore } from "@netlify/blobs";
  const store = getDeployStore("construction");
```

```javascript
  // basic writing to a global store
  import { getStore } from "@netlify/blobs";
  const store = getStore("construction");
```

```javascript
  // using global store if in production, otherwise use deploy scope store
  import { getStore, getDeployStore } from "@netlify/blobs";

  function getBlobStore(...storeOptions){

    if((Netlify.context?.deploy.context === 'production'){
      return getStore(...storeOptions);
    }

    return getDeployStore(...storeOptions)
  }

  const store = getBlobStore("construction");
```

</ProviderContext>
