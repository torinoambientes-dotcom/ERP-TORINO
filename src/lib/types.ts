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
}

export interface GlassItem {
  id: string;
  type: 'Vidro Incolor' | 'Espelho' | 'Vidro Reflecta Incolor' | 'Vidro Reflecta Bronze' | 'Vidro Reflecta Fume';
  height: number;
  width: number;
  quantity: number;
}

export interface ProfileDoorItem {
  id: string;
  profileColor: 'Preto' | 'Aluminio' | 'Inox';
  glassType: 'Incolor' | 'Fume' | 'Bronze' | 'Espelho Fume' | 'Espelho Bronze' | 'Espelho Prata' | 'Reflecta Incolor' | 'Reflecta Fume' | 'Reflecta Prata';
  handleType: 'Linear inteiro' | 'Aba Usinada' | 'Sem Puxador';
  height: number;
  width: number;
  quantity: number;
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
