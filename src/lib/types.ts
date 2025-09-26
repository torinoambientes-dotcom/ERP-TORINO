export interface TeamMember {
  id: string; // This is the Firebase Auth UID
  name: string;
  email: string;
  color: string;
  role: string;
  avatarUrl?: string;
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

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  addedAt?: string; // ISO date string
}

export interface GlassItem {
  id: string;
  shape: 'rectangle' | 'circle';
  type: 'Vidro Incolor' | 'Espelho' | 'Vidro Reflecta Incolor' | 'Vidro Reflecta Bronze' | 'Vidro Reflecta Fume';
  height?: number;
  width?: number;
  diameter?: number;
  quantity: number;
  cornerRadius?: number;
  purchased?: boolean;
  hasFrostedStrips?: boolean;
  frostedStripTop?: number;
  frostedStripBottom?: number;
  frostedStripLeft?: number;
  frostedStripRight?: number;
  frostedStripWidth?: number;
  frostedStripCircularOffset?: number;
  addedAt?: string; // ISO date string
}

export interface ProfileDoorItem {
  id: string;
  doorType?: 'Giro' | 'Correr' | 'Escamoteavel';
  slidingSystem?: string;
  profileColor: string;
  glassType: string;
  handleType: string;
  height: number;
  width: number;
  quantity: number;
  hinges?: { position: number }[];
  isPair?: boolean;
  handlePosition?: 'top' | 'bottom' | 'left' | 'right';
  handleWidth?: number;
  handleOffset?: number;
  purchased?: boolean;
  addedAt?: string; // ISO date string
}

export interface Furniture {
  id: string;
  name: string;
  measurement: { status: StageStatus; responsibleId?: string };
  cutting: { status: StageStatus; responsibleId?: string };
  purchase: { status: StageStatus; responsibleId?: string; completedAt?: string };
  assembly: { status: StageStatus; responsibleId?: string };
  comments?: Comment[];
  pendencies?: Pendency[];
  materials?: MaterialItem[];
  glassItems?: GlassItem[];
  profileDoors?: ProfileDoorItem[];
}

export interface Environment {
  id:string;
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
