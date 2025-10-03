'use client';

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

export interface ProductionStage {
  status: StageStatus;
  responsibleId?: string;
  startedAt?: string; // ISO date string when the stage moved to in_progress
  completedAt?: string; // ISO date string when the stage was marked as 'done'
  scheduledFor?: string; // ISO date string
}


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
  stockItemId?: string; // Link to the stock item
  addedAt?: string; // ISO date string
  purchased?: boolean;
}

export interface GlassItem {
  id: string;
  shape: 'rectangle' | 'circle';
  type: 'Vidro Incolor' | 'Espelho' | 'Vidro Reflecta Incolor' | 'Vidro Reflecta Bronze' | 'Vidro Reflecta Fume' | 'Espelho Fumê' | 'Espelho Bronze';
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
  isBeveled?: boolean;
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
  measurement: ProductionStage;
  cutting: ProductionStage;
  purchase: ProductionStage;
  assembly: ProductionStage;
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

export interface Appointment {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  memberIds: string[];
}


export interface StockCategory {
  id: string;
  name: string;
}

export interface StockReservation {
  projectId: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
  furnitureId: string;
  furnitureName: string;
  materialId: string;
  quantity: number;
  status: 'reservado' | 'separado';
}

export type StockMovementReason = 'compra' | 'estorno' | 'uso_marceneiro' | 'despacho_producao' | 'outros';

export interface StockMovement {
  id: string;
  stockItemId: string; // Add stockItemId to link back to the item
  type: 'entry' | 'exit';
  quantity: number;
  reason: StockMovementReason;
  details?: string; // For 'outros' reason, or storing marceneiro ID
  timestamp: string; // ISO date string
  memberId: string;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  minStock?: number;
  alertHandledAt?: string; // ISO date string for when the low stock alert was handled
  reservations?: StockReservation[];
  awaitingReceipt?: {
    quantity: number;
    supplier: string;
    registeredAt: string;
  };
  movements?: StockMovement[];
}
