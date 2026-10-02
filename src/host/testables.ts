/**
 * Bundle entry for node tests (no Cordis boot).
 * Built to lib/testables.mjs by build.mjs.
 */
export {
  CorruptVaultError,
  DisabledError,
  NotInitializedError,
  TaskStatusService,
  ValidationError,
} from './service.ts'
export { assertNext, capNotes, emptyRecord, requireNonEmpty } from './schema.ts'
export { renderInject, renderDisabledInject } from './injector.ts'
export { renderStatusMd } from './projectMd.ts'
export { normalizeCwd, taskIdFromCwd } from './taskId.ts'
export { defaultStorageRoot, loadVault, saveVault, vaultPath } from './storage.ts'
export { registerTools } from './tools.ts'
export {
  INJECT_PATH_REL,
  MAX_DONE_RECENT,
  MAX_NEXT,
  MAX_NOTES_CHARS,
  PACKAGE_NAME,
  STATUS_MD_REL,
} from '../shared/types.ts'
