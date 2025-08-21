/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Dataverse Configuration
  readonly VITE_DATAVERSE_URL?: string

  // PCF Configuration - set by setup wizard
  readonly VITE_PCF_PAGE_TABLE?: string
  readonly VITE_PCF_PAGE_TABLE_NAME?: string
  readonly VITE_PCF_PAGE_RECORD_ID?: string
  readonly VITE_PCF_TARGET_TABLE?: string
  readonly VITE_PCF_TARGET_TABLE_NAME?: string
  readonly VITE_PCF_VIEW_ID?: string
  readonly VITE_PCF_VIEW_NAME?: string
  readonly VITE_PCF_RELATIONSHIP_SCHEMA_NAME?: string
  readonly VITE_PCF_RELATIONSHIP_ATTRIBUTE?: string
  readonly VITE_PCF_RELATIONSHIP_LOOKUP_FIELD?: string
  readonly VITE_PCF_RELATIONSHIP_TYPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
