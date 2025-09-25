export interface TeamMember {
  id: string;
  name: string;
  color: string;
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

export const STOCK_CATEGORIES = [
  'Corrediças',
  'Dobradiças',
  'Articuladores',
  'Cola HotMelt',
  'Sapata Niveladora',
  'Outros',
] as const;

export type StockCategory = (typeof STOCK_CATEGORIES)[number];

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: StockCategory;
}

export interface StockMovement {
  id: string;
  type: 'entry' | 'exit';
  quantity: number;
  reason: string;
  timestamp: string; // ISO date string
  memberId: string;
}
