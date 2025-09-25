export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  color: string;
  role: string;
}

export const STAGE_STATUSES = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  done: 'Concluído',
} as const;

export type StageStatus = keyof typeof STAGE_STATUSES;

export interface Comment {
  id: string;
  memberId: string;
  text: string;
  timestamp: string;
}

export interface Pendency {
  id: string;
  text: string;
  isResolved: boolean;
  authorId: string;
}

export interface Furniture {
  id: string;
  name: string;
  measurement: { status: StageStatus; responsibleId?: string };
  cutting: { status: StageStatus; responsibleId?: string };
  purchase: { status: StageStatus; responsibleId?: string };
  assembly: { status: StageStatus; responsibleId?: string };
  comments?: Comment[];
  pendencies?: Pendency[];
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
  completedAt?: string; // ISO date string
}

export interface StockCategory {
  id: string;
  name: string;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  minStock?: number;
  alertHandledAt?: string; // ISO date string for when the low stock alert was handled
}

export interface StockMovement {
  id: string;
  type: 'entry' | 'exit';
  quantity: number;
  reason: string;
  timestamp: string; // ISO date string
  memberId: string;
}
