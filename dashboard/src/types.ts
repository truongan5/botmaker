export type BotStatus = 'created' | 'running' | 'stopped' | 'error';

export interface ContainerStatus {
  id: string;
  state: string;
  running: boolean;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
}

export interface Bot {
  id: string;
  name: string;
  ai_provider: string;
  model: string;
  channel_type: string;
  container_id: string | null;
  status: BotStatus;
  created_at: string;
  updated_at: string;
  container_status?: ContainerStatus | null;
}

export interface CreateBotInput {
  name: string;
  ai_provider: string;
  model: string;
  channel_type: 'telegram' | 'discord';
  channel_token: string;
  api_key: string;
  persona: {
    name: string;
    identity: string;
    description: string;
  };
}
