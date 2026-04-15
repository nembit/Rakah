export type RemoteLogResult = {
  success: boolean;
  error?: unknown;
};

export type RemoteLogEntry = {
  message: string;
  timestamp?: string;
  level?: string;
  source?: string;
};

export declare function sendLogsToRemote(logs: RemoteLogEntry[]): Promise<RemoteLogResult>;

export declare function reportErrorToRemote(args: {
  error: unknown;
}): Promise<RemoteLogResult>;
