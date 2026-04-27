export type { InstallTarget, InstallOptions, SourcePaths } from "./types.js";
export { SUPPORTED_INSTALL_TARGETS } from "./types.js";
export {
  normalizeInstallTargets,
  installPackageTargets,
  installPackageTarget,
  __installSourcePathForTest
} from "./orchestrator.js";
