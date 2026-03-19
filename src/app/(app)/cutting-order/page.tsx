
'use client';

import { useContext, useState, useMemo } from 'react';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, GripVertical, CheckCircle2, Trash2, Scissors, History, Clock, ArrowLeft } from 'lucide-react';
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
import type { CuttingOrder } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function CuttingOrderPage() {
  const { cuttingOrders, addCuttingOrder, updateCuttingOrderStatus, reorderCuttingOrders, deleteCuttingOrder, isLoading } = useContext(AppContext);
  const { toast } = useToast();
  const [newFolderName, setNewFolderName] = useState('');
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
    addCuttingOrder(newFolderName.trim());
    setNewFolderName('');
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
        <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? <ArrowLeft className="mr-2 h-4 w-4" /> : <History className="mr-2 h-4 w-4" />}
          {showHistory ? "Voltar para Fila" : "Ver Histórico"}
        </Button>
      </div>

      {!showHistory ? (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Adicionar Pasta à Fila</CardTitle>
              <CardDescription>Informe o nome exato da pasta que está no computador da CNC.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddOrder} className="flex gap-2">
                <Input 
                  placeholder="Nome da pasta (Ex: Projeto_Torino_V1)" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-white"
                />
                <Button type="submit" disabled={!newFolderName.trim()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
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
                    <p className="text-xs text-muted-foreground">Concluído em: {format(parseISO(order.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
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

function SortableOrderItem({ order, onComplete, onDelete }: { order: CuttingOrder, onComplete: () => void, onDelete: () => void }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 bg-white border-2 rounded-xl shadow-sm transition-shadow",
        isDragging && "shadow-xl border-primary ring-2 ring-primary/20"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary transition-colors">
        <GripVertical className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <div className="flex-grow min-w-0">
        <p className="text-lg font-black tracking-tight text-slate-900 truncate">
          {order.folderName}
        </p>
        <p className="text-xs text-muted-foreground">
          Fila #{order.index + 1} • Adicionado em {format(parseISO(order.createdAt), "dd/MM 'às' HH:mm")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onComplete}
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-600 hover:text-white font-bold"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          CORTE CONCLUÍDO
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
