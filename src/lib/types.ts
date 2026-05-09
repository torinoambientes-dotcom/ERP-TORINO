
'use client';

export interface TeamMember {
  id: string; // This is the Firebase Auth UID
  name: string;
  email: string;
  color: string;
  role: string;
  avatarUrl?: string;
  birthday?: string; // MM-DD format
}

export const STAGE_STATUSES = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  done: 'Concluído',
} as const;

export type StageStatus = keyof typeof STAGE_STATUSES;

export type Priority = 'low' | 'medium' | 'high';

export interface ProductionStage {
  status: StageStatus;
  responsibleIds?: string[];
  startedAt?: string; // ISO date string when the stage moved to in_progress
  completedAt?: string; // ISO date string when the stage was marked as 'done'
  scheduledFor?: string; // ISO date string
  priority?: Priority;
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

export interface Dispatch {
  quantity: number;
  dispatchedAt: string; // ISO date string
  memberId: string;
}


export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  stockItemId?: string; // Link to the stock item
  addedAt?: string; // ISO date string
  purchased?: boolean;
  cost?: number; // Cost per unit for quote materials
  markup?: number;
  dispatches?: Dispatch[];
  reservationCancelledAt?: string; // ISO date string
  reservationCancellationReason?: string;
}

export interface GlassItem {
  id: string;
  shape: 'rectangle' | 'circle';
  type: 'Vidro Incolor' | 'Espelho' | 'Vidro Reflecta Incolor' | 'Vidro Reflecta Bronze' | 'Vidro Reflecta Fume' | 'Espelho Fumê' | 'Espelho Bronze';
  height?: number;
  width?: number;
  diameter?: number;
  quantity: number;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomLeft?: number;
  cornerRadiusBottomRight?: number;
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

export interface DoorSetConfiguration {
  handlePosition: 'left' | 'right' | 'both' | 'none';
}

export interface ProfileDoorItem {
  id: string;
  doorType?: 'Giro' | 'Correr' | 'Escamoteavel' | 'Frente de gaveta';
  slidingSystem?: string;
  profileColor: string;
  glassType: string;
  handleType: string;
  height: number;
  width: number;
  quantity: number;
  hinges?: { position: number }[];
  hingeSide?: 'left' | 'right';
  isPair?: boolean;
  handlePosition?: 'top' | 'bottom' | 'left' | 'right';
  handleWidth?: number;
  handleOffset?: number;
  purchased?: boolean;
  addedAt?: string; // ISO date string
  doorSet?: {
    count: number;
    doors: DoorSetConfiguration[];
  };
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
  productionTime?: number;
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
  deliveryDeadline?: string;
}

export interface Appointment {
  id: string;
  title: string;
  description: string;
  location?: string;
  start: string; // ISO string
  end: string;   // ISO string
  memberIds: string[];
  category?: 'generic' | 'montagem' | 'corte' | 'producao';
  status?: 'todo' | 'done' | 'delayed';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO date string
  assigneeIds: string[];
  creatorId: string;
  projectId?: string;
  environmentId?: string;
  furnitureId?: string;
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

export type StockMovementReason = 'compra' | 'estorno' | 'uso_marceneiro' | 'despacho_producao' | 'quebra_perda' | 'outros';

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

export type PurchaseRequestStatus = 'pending' | 'approved' | 'purchased' | 'rejected';

export interface PurchaseRequest {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    reason: string;
    requesterId: string;
    requesterName: string;
    status: PurchaseRequestStatus;
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
    notes?: string;
    projectId?: string;
    projectName?: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteStage {
  status: StageStatus;
  responsibleIds?: string[];
}

// A Furniture object inside a Quote will not have production stages,
// but will have material lists.
export interface QuoteFurniture {
    id: string;
    name: string;
    description?: string;
    productionTime?: number; // Estimated production time in days
    materials?: MaterialItem[];
    glassItems?: GlassItem[];
    profileDoors?: ProfileDoorItem[];
}

export interface QuoteEnvironment {
    id: string;
    name: string;
    furniture: QuoteFurniture[];
}


export interface Quote {
  id: string;
  clientName: string;
  clientContact?: string;
  environments: QuoteEnvironment[];
  totalValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  projectOrigin: 'client_provided' | 'internal_development';
  // New stages
  internalProjectStage?: QuoteStage;
  materialSurveyStage: QuoteStage;
  descriptiveStage: QuoteStage;
  presentationStatus: 'pending_send' | 'sent';
  clientFeedback: 'analyzing' | 'approved' | 'rejected' | 'revision';
  deliveryDeadline?: string;
  relatedProjectId?: string;
  isArchived?: boolean;
}

export interface QuoteMaterialCategory {
  id: string;
  name: string;
}

export interface QuoteMaterial {
  id: string;
  name: string;
  unit: string;
  cost: number;
  category: string;
}

export interface ExtraProject {
    id: string;
    name: string;
    description: string;
    assignedTo: string[];
    isCompleted: boolean;
}

export interface CuttingOrderPendency {
  id: string;
  text: string;
  isResolved: boolean;
  createdAt: string;
}

export interface CuttingSheet {
  id: string;
  name: string;
  isCut: boolean;
  cutAt?: string; // ISO date string
}

export interface CuttingOrder {
  id: string;
  folderName: string;
  status: 'pending' | 'completed';
  index: number;
  createdAt: string;
  isUrgent?: boolean;
  notes?: string;
  pendencies?: CuttingOrderPendency[];
  sheets?: CuttingSheet[];
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  date: string; // ISO date string (used for creation/reference)
  dueDate?: string; // ISO date string (when the bill is due)
  paymentDate?: string; // ISO date string (when it was actually paid/received)
  barcode?: string; // For boletos or PIX copy/paste
  relatedProjectId?: string;
  relatedQuoteId?: string;
  paymentMethod?: string;
  status: 'pending' | 'completed' | 'cancelled';
  clientName?: string; // Name of the client, used for generating receipts on income
  isRecurring?: boolean; // Whether this is a monthly recurring bill
  recurringDay?: number; // Day of the month the bill is due (1-31)
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingReceivables: number;
  pendingPayables: number;
}

export interface Supplier {
  id: string;
  name: string;
  document?: string; // CNPJ or CPF
  email?: string;
  phone?: string;
  category?: string;
}

export interface Invoice {
  id: string;
  number?: string;
  supplierId: string;
  supplierName: string; // Denormalized for easier display
  amount: number;
  date: string; // ISO date string
  category?: string;
  notes?: string;
  status: 'pending' | 'paid' | 'cancelled';
  relatedTransactionId?: string;
  relatedProjectId?: string;
}

export interface StoreCredit {
  id: string;
  supplierName: string;       // Nome da loja/fornecedor
  supplierId?: string;        // Link opcional ao fornecedor cadastrado
  clientName: string;         // Nome do cliente que gerou o crédito
  relatedProjectId?: string;  // Projeto relacionado
  amount: number;             // Valor original do crédito
  usedAmount: number;         // Quanto já foi utilizado
  date: string;               // Data do crédito (ISO)
  description?: string;       // Observação
  status: 'active' | 'used' | 'expired'; // Status do crédito
}
