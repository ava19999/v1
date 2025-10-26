---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Edge functions,
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




### Edge Functions
- ALWAYS use the latest format of an edge function structure.
- **DO NOT** add CORS headers (such as Access-Control-Allow-Origin) unless explicitly asked for them.
- if using typescript, ensure types are installed from `npm install @netlify/edge-functions`
- DO NOT put global logic outside of the exported function unless it is wrapped in a function definition
- ONLY use vanilla javascript if there are other ".js" files in the functions directory.
- ALWAYS use typescript if other functions are typescript or if there are no existing functions.
- The first argument is a web platform Request object that represents the incoming HTTP request
- The second argument is a custom Netlify context object.
- Edge functions have a global `Netlify` object that is also accessible.
  - ONLY use `Netlify.env.*` for interacting with environment variables in code.
- Place function files in `YOUR_BASE_DIRECTORY/netlify/edge-functions` or a subdirectory.
  - The serverless functions director can be changed via`netlify.toml`:
    ```toml
    [build]
      edge_functions = "my-custom-directory"
    ```

- Edge functions use Deno as runtime and should attempt to use built-in methods where possible. See the list of available web APIs to know which built-ins to use.
  - **Module Support**:
    - Supports **Node.js built-in modules**, **Deno modules**, and **npm packages** (beta).
  - **Importing Modules**:
    - **Node.js built-in modules**: Use `node:` prefix (e.g., `import { randomBytes } from "node:crypto"`).
    - **Deno modules**: Use **URL imports** (e.g., `import React from "https://esm.sh/react"` or an **import map**).
    - **npm packages (beta)**: Install via `npm install` and import by package name (e.g., `import _ from "lodash"`).
    - Some npm packages with **native binaries** (e.g., Prisma) or **dynamic imports** (e.g., cowsay) may not work.
  - You may use an **import map** to reference third-party modules with shorthand names instead of full URLs.
  - **Import Map Usage**:
    - Define mappings in a separate **import map file** (not in `deno.json`).
    - The file can be placed anywhere in the project directory.
  - **Example Import Map (`import_map.json`)**:
    ```json
    {
      "imports": {
        "html-rewriter": "https://ghuc.cc/worker-tools/html-rewriter/index.ts"
      }
    }
    ```
  - **Enabling Import Maps**:
    - Declare the import map in `netlify.toml`:
      ```toml
      [functions]
        deno_import_map = "./path/to/your/import_map.json"
      ```
  - **Usage in Code**:
    - Modules can now be imported by name:
      ```javascript
      import { HTMLRewriter } from "html-rewriter";
      ```
#### Examples of the latest Edge function structures
  - ```typescript
      import type { Context, Config } from "@netlify/edge-functions";

      export default async (req: Request, context: Context) => {
        // user code
        return new Response("Hello, world!")
      }

      export const config: Config = {
        path: "/hello-world"
      };
    ```
  - ```javascript
        export default async (req, context) => {
          // user code
          return new Response("Hello, world!")
        }

        export const config = {
          path: "/hello-world"
        };
    ```

#### Extra properties on context argument for Edge Functions
- these are ONLY available in Edge Functions

```
{
  ...ALL OTHER Context fields/methods,

  next: (options?: { sendConditionalRequest?: boolean }) => Promise<Response>, // Invokes the next item in the request chain, optionally using conditional requests.

  nextRequest: (request: Request, options?: { sendConditionalRequest?: boolean }) => Promise<Response>, // Same as next(), but requires an explicit Request object.
}

```

#### Web APIs available in Edge Functions ONLY
- console.*
- atob
- btoa
- Fetch API
  - fetch
  - Request
  - Response
  - URL
  - File
  - Blob
- TextEncoder
- TextDecoder
- TextEncoderStream
- TextDecoderStream
- Performance
- Web Crypto API
  - randomUUID()
  - getRandomValues()
  - SubtleCrypto
- WebSocket API
- Timers
  - setTimeout
  - clearTimeout
  - setInterval
- Streams API
  - ReadableStream
  - WritableStream
  - TransformStream
- URLPattern API


#### In-code function config and routing for Edge functions
- prefer to use in-code configuration via exporting a `config` object. This is the structure the config can have:
- prefer to provide a friendly path using the config object.
- Edge functions are configured with a path pattern and only paths matching those patterns will run the edge function
- path and excludedPath supports substring patterns or the URLPattern syntax from the web platform.
- unless explicitly asked to modify other properties, only set path, pattern, excludedPath when creating functions.

```
{
  path?: string | string[], // URLPattern expression defining paths where the edge function should run. Must start with '/'.
  excludedPath?: string | string[], // Optional. Defines paths to exclude from execution. Must start with '/'.
  pattern?: RegExp | RegExp[], // Alternative to `path`. Uses regex for path matching.
  excludedPattern?: RegExp | RegExp[], // Optional. Defines regex patterns to exclude certain routes.
  method?: string | string[], // Optional. Specifies HTTP methods that should trigger the function (e.g., "GET", ["POST", "PUT"]).
  onError?: "continue" | "fail" | "fallback", // Optional. Controls how the function handles errors.
  cache?: 'manual', // Optional. Enables response caching if set to 'manual'.
} = {
  path: "", // Default value; should be set per function.
};
```

#### Configuring Edge Functions in netlify.toml
- ONLY Use `netlify.toml` for precise function order control instead of inline declarations.
- DO NOT use `netlify.toml` if there is not edge function ordering requirements.
- When controlling order, it's important to include all edge functions for order control.

- **Declare Edge Functions in `netlify.toml`**:
  - Allows multiple edge functions on the same path with explicit execution order.
  - Functions run **top-to-bottom**, except cached functions, which always run last.

- **Edge Function Properties**:
  - `function`: Name of the edge function.
  - `path`: URL pattern to trigger the function (must start with `/`).
  - `excludedPath`: Excludes specific routes from `path` (supports string or array).
  - `pattern`: Regex-based path matching.
  - `excludedPattern`: Excludes specific regex patterns (single or array).
  - `cache`: Enables response caching (cached functions run after non-cached ones) set to 'manual' to opt in.

- **Netlify.toml config examples**
  ```toml
  [[edge_functions]]
    path = "/admin"
    function = "auth"

  [[edge_functions]]
    path = "/admin"
    function = "injector"
    cache = "manual"

  [[edge_functions]]
    path = "/blog/*"
    function = "auth"

  [[edge_functions]]
    path = "/blog/*"
    function = "rewriter"

  [[edge_functions]]
    pattern = "/products/(.*)"
    excludedPattern = "/products/things/(.*)"
    function = "highlight"

  [[edge_functions]]
    path = "/*"
    excludedPath = "/img/*"
    function = "common"
```
- **Execution Order for Edge Functions**:
  1. **Configuration-based** edge functions (`netlify.toml`) run first.
  2. **Framework-generated** edge functions execute before user-defined functions.
  3. **Non-cached** edge functions execute before cached functions.
  4. **Inline-declared** edge functions override duplicate `netlify.toml` functions.
  5. **Multiple inline edge functions** run alphabetically by filename.

- **Caveats & Special Cases**:
  - If an edge function returns a response, redirects for that path DO NOT occur.
  - Edge functions DO NOT execute for rewritten static routing targets.
  - `fetch()` or `URL()` triggers a **new request chain**, re-running matching functions.
  - Use `context.next()` to continue processing instead of re-triggering functions.
  - Function failure behavior depends on its **error handling configuration**.

#### Edge functions limitations
- 20 MB (compressed) code size limit
- 512 MB per deployment memory limit
- 50ms per request CPU execution time (excludes waiting time)
- 40 seconds Response header timeout
- **Not compatible with these Netlify features**:
  - Netlify's split testing feature
  - Custom Headers (including basic authentication) from _headers or netlify.toml config
  - Netlify prerendering feature on paths served by edge functions
- Be aware that multiple framework adapters may generate conflicting edge functions
- **Restrictions**:
  - Can only rewrite requests to same-site URLs (use `fetch()` for external content)
  - Cached edge functions override existing static files
  - No local caching; HTTP cache headers are ignored in local testing
  - Not included in Netlify’s HIPAA-compliant hosting offering


</ProviderContext>
