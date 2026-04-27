export const SUPPORTED_INSTALL_TARGETS = ["opencode", "claude", "codex"] as const;
export type InstallTarget = (typeof SUPPORTED_INSTALL_TARGETS)[number];

export interface InstallOptions {
  project?: string;
  packageRoot?: string;
  agentHooks?: boolean;
  dryRun?: boolean;
}

export interface SourcePaths {
  plugin: string;
  marketplace: string;
  hooks: string;
}
