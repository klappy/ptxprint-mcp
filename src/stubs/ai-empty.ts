/**
 * Empty stub used as an `alias` target in wrangler.jsonc for the `ai` package.
 *
 * Why this exists: agents@0.2.x (which provides McpAgent) does
 * `await import("ai")` inside an AI-SDK helper code path we don't use. esbuild
 * (Wrangler's bundler) resolves all imports at bundle time — even dynamic ones
 * — so a missing `ai` package fails the build. Installing `ai` would work but
 * would (a) ship a multi-MB SDK we never execute, (b) collide with agents'
 * peerOptional `ai >=5.0.0` if we pinned the wrong major. Aliasing is cleaner.
 *
 * If McpAgent ever stops doing this dynamic import, this stub and the alias
 * entry in wrangler.jsonc can both be removed.
 */
export {};
