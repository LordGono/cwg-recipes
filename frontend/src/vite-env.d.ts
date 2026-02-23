/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Shim for @svg-maps/world (peer dep svg-maps__common not published separately)
declare module 'svg-maps__common' {
  export interface Location {
    id: string;
    name: string;
    path: string;
  }
  export interface Map {
    label: string;
    viewBox: string;
    locations: Location[];
  }
}
