/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PB_URL: string;
  readonly VITE_OIDC_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
