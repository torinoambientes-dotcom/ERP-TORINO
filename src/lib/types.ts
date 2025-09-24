export interface TeamMember {
  id: string;
  name: string;
  color: string;
  avatarUrl: string;
}

export const STAGE_STATUSES = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  done: 'Concluído',
} as const;

export type StageStatus = keyof typeof STAGE_STATUSES;

export interface Furniture {
  id: string;
  name: string;
  measurement: { status: StageStatus; responsibleId?: string };
  cutting: { status: StageStatus; responsibleId?: string };
  purchase: { status: StageStatus; responsibleId?: string };
  assembly: { status: StageStatus; responsibleId?: string };
}

export interface Environment {
  id: string;
  name: string;
  furniture: Furniture[];
}

export interface Project {
  id: string;
  clientName: string;
  environments: Environment[];
}
