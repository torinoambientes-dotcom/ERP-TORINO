
'use client';

import { useContext, useState, useMemo } from 'react';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { PlusCircle, GripVertical, CheckCircle2, Trash2, Scissors, History, Clock, ArrowLeft, Pencil, Zap, Check, X, MonitorPlay, MessageSquareText, AlertTriangle, CheckCheck, ClipboardList, Square, CheckSquare, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CuttingOrder, CuttingOrderPendency, CuttingSheet } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { generateId } from '@/lib/utils';

export default function CuttingOrderPage() {
  const { cuttingOrders, addCuttingOrder, updateCuttingOrderStatus, updateCuttingOrder, reorderCuttingOrders, deleteCuttingOrder, isLoading } = useContext(AppContext);
  const { toast } = useToast();
  const [newFolderName, setNewFolderName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const pendingOrders = useMemo(() =>
    (cuttingOrders || []).filter(o => o.status === 'pending'),
    [cuttingOrders]
  );

  const completedOrders = useMemo(() =>
    (cuttingOrders || []).filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [cuttingOrders]
  );

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    addCuttingOrder(newFolderName.trim(), newNotes.trim());
    setNewFolderName('');
    setNewNotes('');
    toast({ title: "Nova ordem de corte adicionada!" });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pendingOrders.findIndex((o) => o.id === active.id);
      const newIndex = pendingOrders.findIndex((o) => o.id === over.id);
      const newOrderList = arrayMove(pendingOrders, oldIndex, newIndex);
      reorderCuttingOrders(newOrderList);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando ordens de corte...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Ordem de Corte (CNC)"
          description="Gerencie a fila de arquivos para o operador da CNC."
        />
        <div className='flex gap-2 w-full sm:w-auto'>
          <Button variant="outline" asChild>
            <Link href="/apresentacao-corte" target="_blank">
              <MonitorPlay className="mr-2 h-4 w-4" />
              Lançar Monitor CNC
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? <ArrowLeft className="mr-2 h-4 w-4" /> : <History className="mr-2 h-4 w-4" />}
            {showHistory ? "Voltar para Fila" : "Ver Histórico"}
          </Button>
        </div>
      </div>

      {!showHistory ? (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Adicionar Pasta à Fila</CardTitle>
              <CardDescription>Informe o nome exato da pasta e observações para o operador.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddOrder} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Nome da pasta (Ex: Projeto_Torino_V1)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-white"
                  />
                  <Input
                    placeholder="Observações (Ex: Usar Fresa 6mm, MDF 18mm)"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="bg-white"
                  />
                  <Button type="submit" disabled={!newFolderName.trim()} className="shrink-0">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold font-headline">Fila de Corte</h2>
              <Badge variant="secondary" className="ml-2">{pendingOrders.length}</Badge>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pendingOrders.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order) => (
                      <SortableOrderItem
                        key={order.id}
                        order={order}
                        onComplete={() => {
                          updateCuttingOrderStatus(order.id, 'completed');
                          toast({ title: "Corte Concluído!", description: `A pasta ${order.folderName} foi removida da fila.` });
                        }}
                        onDelete={() => deleteCuttingOrder(order.id)}
                        onUpdate={(updates) => updateCuttingOrder(order.id, updates)}
                      />
                    ))
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20">
                      <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground italic text-sm">Nenhum arquivo na fila de corte.</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold font-headline">Histórico de Concluídos</h2>
          </div>
          <div className="grid gap-3">
            {completedOrders.length > 0 ? completedOrders.map((order) => (
              <Card key={order.id} className="bg-muted/30 opacity-80">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold line-through text-muted-foreground">{order.folderName}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Incluído em: {format(parseISO(order.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => updateCuttingOrderStatus(order.id, 'pending')}>
                    Reabrir
                  </Button>
                </CardContent>
              </Card>
            )) : (
              <p className="text-center py-12 text-muted-foreground">Histórico vazio.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PendencyDialog({
  order,
  open,
  onOpenChange,
  onUpdate,
}: {
  order: CuttingOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (updates: Partial<CuttingOrder>) => void;
}) {
  const [newPendencyText, setNewPendencyText] = useState('');
  const { toast } = useToast();

  const pendencies = order.pendencies || [];
  const openPendencies = pendencies.filter(p => !p.isResolved);
  const resolvedPendencies = pendencies.filter(p => p.isResolved);

  const handleAdd = () => {
    if (!newPendencyText.trim()) return;
    const newPendency: CuttingOrderPendency = {
      id: generateId('pend'),
      text: newPendencyText.trim(),
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    onUpdate({ pendencies: [...pendencies, newPendency] });
    setNewPendencyText('');
    toast({ title: "Pendência registrada!" });
  };

  const handleResolve = (pendencyId: string) => {
    const updated = pendencies.map(p =>
      p.id === pendencyId ? { ...p, isResolved: true } : p
    );
    onUpdate({ pendencies: updated });
    toast({ title: "Pendência resolvida!" });
  };

  const handleDelete = (pendencyId: string) => {
    const updated = pendencies.filter(p => p.id !== pendencyId);
    onUpdate({ pendencies: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pendências — {order.folderName}
          </DialogTitle>
          <DialogDescription>
            Registre problemas ou pendências para esta ordem de corte, como falta de material ou ajustes necessários.
          </DialogDescription>
        </DialogHeader>

        {/* Add new pendency */}
        <div className="space-y-2">
          <Label htmlFor="pendency-text">Nova pendência</Label>
          <div className="flex gap-2">
            <Textarea
              id="pendency-text"
              placeholder="Ex: Faltou material — MDF 18mm, Ex: Fresa quebrada..."
              value={newPendencyText}
              onChange={(e) => setNewPendencyText(e.target.value)}
              className="resize-none min-h-[70px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAdd();
                }
              }}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newPendencyText.trim()}
            className="w-full"
            variant="destructive"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Registrar Pendência
          </Button>
        </div>

        <Separator />

        {/* Open pendencies */}
        {openPendencies.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-700">Pendências em aberto ({openPendencies.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {openPendencies.map(p => (
                <div key={p.id} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900">{p.text}</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {format(parseISO(p.createdAt), "dd/MM 'às' HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleResolve(p.id)}
                      title="Marcar como resolvido"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50"
                      onClick={() => handleDelete(p.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved pendencies */}
        {resolvedPendencies.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Resolvidas ({resolvedPendencies.length})</p>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {resolvedPendencies.map(p => (
                <div key={p.id} className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg opacity-70">
                  <CheckCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through text-green-800">{p.text}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(p.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendencies.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">Nenhuma pendência registrada.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SheetsDialog({
  order,
  open,
  onOpenChange,
  onUpdate,
}: {
  order: CuttingOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (updates: Partial<CuttingOrder>) => void;
}) {
  const [newSheetName, setNewSheetName] = useState('');
  const { toast } = useToast();

  const sheets = order.sheets || [];
  const cutSheets = sheets.filter(s => s.isCut);
  const uncutSheets = sheets.filter(s => !s.isCut);

  const handleAdd = () => {
    if (!newSheetName.trim()) return;
    const newSheet: CuttingSheet = {
      id: generateId('sheet'),
      name: newSheetName.trim(),
      isCut: false,
    };
    onUpdate({ sheets: [...sheets, newSheet] });
    setNewSheetName('');
    toast({ title: "Chapa adicionada!" });
  };

  const handleToggle = (sheetId: string) => {
    const updated = sheets.map(s =>
      s.id === sheetId ? { ...s, isCut: !s.isCut, cutAt: !s.isCut ? new Date().toISOString() : undefined } : s
    );
    onUpdate({ sheets: updated });
  };

  const handleDelete = (sheetId: string) => {
    const updated = sheets.filter(s => s.id !== sheetId);
    onUpdate({ sheets: updated });
  };

  const progress = sheets.length > 0 ? Math.round((cutSheets.length / sheets.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Chapas — {order.folderName}
          </DialogTitle>
          <DialogDescription>
            Cadastre as chapas deste corte. O operador marca cada chapa conforme for cortando.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        {sheets.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm font-bold">
              <span>{cutSheets.length} de {sheets.length} cortadas</span>
              <span className={cn(
                progress === 100 ? "text-green-600" : "text-primary"
              )}>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progress === 100 ? "bg-green-600" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Add new sheet */}
        <div className="space-y-2">
          <Label htmlFor="sheet-name">Nova chapa</Label>
          <div className="flex gap-2">
            <Input
              id="sheet-name"
              placeholder="Ex: MDF 18mm Branco, MDF 15mm Cru..."
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              onClick={handleAdd}
              disabled={!newSheetName.trim()}
              className="shrink-0"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <Separator />

        {/* Uncut sheets */}
        {uncutSheets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">Pendentes ({uncutSheets.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {uncutSheets.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg group">
                  <button
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                    onClick={() => handleToggle(s.id)}
                    title="Marcar como cortada"
                  >
                    <Square className="h-5 w-5" />
                  </button>
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(s.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cut sheets */}
        {cutSheets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-green-700">Cortadas ({cutSheets.length})</p>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {cutSheets.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg opacity-70 group">
                  <button
                    className="text-green-600 hover:text-muted-foreground transition-colors"
                    onClick={() => handleToggle(s.id)}
                    title="Desmarcar"
                  >
                    <CheckSquare className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-through text-green-800">{s.name}</span>
                    {s.cutAt && (
                      <p className="text-xs text-green-600">
                        Cortada em {format(parseISO(s.cutAt), "dd/MM 'às' HH:mm")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(s.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sheets.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">Nenhuma chapa cadastrada.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableOrderItem({ order, onComplete, onDelete, onUpdate }: { order: CuttingOrder, onComplete: () => void, onDelete: () => void, onUpdate: (updates: Partial<CuttingOrder>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(order.folderName);
  const [editNotes, setEditNotes] = useState(order.notes || '');
  const [pendencyDialogOpen, setPendencyDialogOpen] = useState(false);
  const [sheetsDialogOpen, setSheetsDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const handleSaveEdit = () => {
    onUpdate({
      folderName: editName.trim() || order.folderName,
      notes: editNotes.trim()
    });
    setIsEditing(false);
  };

  const openPendenciesCount = (order.pendencies || []).filter(p => !p.isResolved).length;
  const sheetsCount = (order.sheets || []).length;
  const cutSheetsCount = (order.sheets || []).filter(s => s.isCut).length;

  return (
    <>
      <PendencyDialog
        order={order}
        open={pendencyDialogOpen}
        onOpenChange={setPendencyDialogOpen}
        onUpdate={onUpdate}
      />
      <SheetsDialog
        order={order}
        open={sheetsDialogOpen}
        onOpenChange={setSheetsDialogOpen}
        onUpdate={onUpdate}
      />

      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-4 p-4 bg-white border-2 rounded-xl shadow-sm transition-all",
          order.isUrgent ? "border-red-500 bg-red-50/30 ring-4 ring-red-500/10 animate-pulse" : "border-border",
          isDragging && "shadow-xl border-primary ring-2 ring-primary/20"
        )}
      >
        <div {...attributes} {...listeners} className="cursor-grab hover:text-primary transition-colors">
          <GripVertical className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="flex-grow min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 py-0"
                  autoFocus
                  placeholder="Nome da pasta"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveEdit}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setEditName(order.folderName); setEditNotes(order.notes || ''); setIsEditing(false); }}><X className="h-4 w-4" /></Button>
              </div>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="h-8 py-0 text-xs"
                placeholder="Observações"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 group/title">
                <p className={cn(
                  "text-lg font-black tracking-tight truncate",
                  order.isUrgent ? "text-red-700" : "text-slate-900"
                )}>
                  {order.folderName}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover/title:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
                {order.isUrgent && <Badge className="bg-red-600 text-white animate-bounce">URGENTE</Badge>}
              </div>
              {order.notes && (
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase italic bg-blue-50 w-fit px-2 py-0.5 rounded">
                  <MessageSquareText className="h-3 w-3" />
                  {order.notes}
                </div>
              )}
              {openPendenciesCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs uppercase bg-amber-50 border border-amber-200 w-fit px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  {openPendenciesCount} pendência{openPendenciesCount > 1 ? 's' : ''} em aberto
                </div>
              )}
              {sheetsCount > 0 && (
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase bg-primary/10 border border-primary/20 w-fit px-2 py-0.5 rounded">
                  <ClipboardList className="h-3 w-3" />
                  {cutSheetsCount}/{sheetsCount} chapas cortadas
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Fila #{order.index + 1} • Incluído em {format(parseISO(order.createdAt), "dd/MM/yy 'às' HH:mm")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Sheets button */}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "font-bold",
              sheetsCount > 0 && cutSheetsCount === sheetsCount
                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                : sheetsCount > 0
                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                : "hover:bg-primary/10 hover:text-primary hover:border-primary/20"
            )}
            onClick={() => setSheetsDialogOpen(true)}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            {sheetsCount > 0 ? `CHAPAS ${cutSheetsCount}/${sheetsCount}` : 'CHAPAS'}
          </Button>

          {/* Pendency button */}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "font-bold",
              openPendenciesCount > 0
                ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                : "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
            )}
            onClick={() => setPendencyDialogOpen(true)}
          >
            <AlertTriangle className={cn("mr-2 h-4 w-4", openPendenciesCount > 0 && "fill-amber-400")} />
            {openPendenciesCount > 0 ? `${openPendenciesCount} PENDÊNCIA${openPendenciesCount > 1 ? 'S' : ''}` : 'PENDÊNCIA'}
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            variant={order.isUrgent ? "destructive" : "outline"}
            size="sm"
            className={cn(
              "font-bold",
              !order.isUrgent && "hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            )}
            onClick={() => onUpdate({ isUrgent: !order.isUrgent })}
          >
            <Zap className={cn("mr-2 h-4 w-4", order.isUrgent && "fill-white")} />
            {order.isUrgent ? "URGÊNCIA ATIVA" : "MARCAR URGENTE"}
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            variant="outline"
            size="sm"
            onClick={onComplete}
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-600 hover:text-white font-bold"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            CONCLUÍDO
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
