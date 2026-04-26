export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  file?: string;
}

export interface StatusFile {
  path: string;
  active: Record<string, string>;
}

export interface PhaseTask {
  id: string;
  checked: boolean;
  text: string;
  line: number;
}

export interface PhaseFile {
  path: string;
  title?: string;
  status: Record<string, string>;
  tasks: PhaseTask[];
  logText: string;
}

export interface CheckResult {
  ok: boolean;
  findings: Finding[];
  status?: StatusFile;
  phase?: PhaseFile;
}

export interface HookInstallOptions {
  force?: boolean;
  cwd?: string;
  cliPath?: string;
}
