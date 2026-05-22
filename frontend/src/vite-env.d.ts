/// <reference types="vite/client" />

declare module "@fontsource/*" {
  // Side-effect import only — Vite resolves the CSS at build time
  const _: never;
  export default _;
}
