
'use client';
import { useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { PlusCircle, Edit, Trash2, ArrowRightLeft, History, AlertTriangle, ListOrdered, ShieldAlert, CheckCircle, PackageCheck, SendToBack, ChevronsUpDown, PackagePlus, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { StockCategory, StockItem, StockReservation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RegisterStockItemModal } from '@/components/modals/register-stock-item-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockMovementModal } from '@/components/modals/stock-movement-modal';
import { StockMovementHistoryModal } from '@/components/modals/stock-movement-history-modal';
import { cn, generateId } from '@/lib/utils';
import { RegisterCategoryModal } from '@/components/modals/register-category-modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DispatchConfirmationModal } from '@/components/modals/dispatch-confirmation-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type SortOrder = 'name_asc' | 'demand_desc' | 'quantity_asc';

export default function StockPage() {
  const router = useRouter();
  const { stockItems, stockCategories, deleteStockItem, deleteStockCategory, isLoading, cancelStockReservation, dispatchItemToProduction, confirmStockReceipt, teamMembers } = useContext(AppContext);
  const { toast } = useToast();
  const { user } = useUser();

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  useEffect(() => {
    if (!isLoading && loggedInMember && loggedInMember.role === 'Projetista') {
      router.push('/');
    }
  }, [isLoading, loggedInMember, router]);

  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  
  const [isMovementModalOpen, setMovementModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<StockItem | null>(null);
  
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [itemForHistory, setItemForHistory] = useState<StockItem | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<StockCategory | null>(null);
  const [isCategoryAlertOpen, setCategoryAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const [isReservationCancelAlertOpen, setReservationCancelAlertOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<{item: StockItem, reservation: StockReservation} | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [popoverOpenState, setPopoverOpenState] = useState<Record<string, boolean>>({});
  
  const [isAwaitingReceiptOpen, setAwaitingReceiptOpen] = useState(true);

  const [isDispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState<{ item: StockItem, reservation: StockReservation } | null>(null);
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('name_asc');


  const togglePopover = (itemId: string) => {
    setPopoverOpenState(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const sortedCategories = useMemo(() => {
    const sorted = [...stockCategories].sort((a, b) => a.name.localeCompare(b.name));
     if (!activeTab && sorted.length > 0) {
      setActiveTab(sorted[0].name);
    } else if (sorted.length === 0) {
      setActiveTab(undefined);
    }
    return sorted;
  }, [stockCategories, activeTab]);

  const itemsAwaitingReceipt = useMemo(() => {
    return stockItems.filter(item => !!item.awaitingReceipt);
  }, [stockItems]);


  const itemsInCategory = useMemo(() => {
    if (!categoryToDelete) return 0;
    return stockItems.filter(item => item.category === categoryToDelete.name).length;
  }, [stockItems, categoryToDelete]);

  const handleOpenRegisterModal = (item: StockItem | null = null) => {
    setItemToEdit(item);
    setRegisterModalOpen(true);
  };

  const handleCloseRegisterModal = () => {
    setItemToEdit(null);
    setRegisterModalOpen(false);
  };

  const handleOpenMovementModal = (item: StockItem) => {
    setItemToMove(item);
    setMovementModalOpen(true);
  };

  const handleCloseMovementModal = () => {
    setItemToMove(null);
    setMovementModalOpen(false);
  };
  
  const handleOpenHistoryModal = (item: StockItem) => {
    setItemForHistory(item);
    setHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setItemForHistory(null);
    setHistoryModalOpen(false);
  };

  const handleOpenAlert = (item: StockItem) => {
    setItemToDelete(item);
    setIsAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setItemToDelete(null);
    setIsAlertOpen(false);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteStockItem(itemToDelete.id);
      toast({
        title: 'Item removido',
        description: `${itemToDelete.name} foi removido do estoque.`,
      });
    }
    handleCloseAlert();
  };
  
  const handleOpenCategoryAlert = (category: StockCategory) => {
    setCategoryToDelete(category);
    setCategoryAlertOpen(true);
  };
  
  const handleCloseCategoryAlert = () => {
    setCategoryToDelete(null);
    setCategoryAlertOpen(false);
  };

  const handleConfirmCategoryDelete = () => {
    if (!categoryToDelete) return;

    if (itemsInCategory > 0) {
      toast({
        variant: 'destructive',
        title: 'Não é possível remover a categoria',
        description: `A categoria "${categoryToDelete.name}" contém itens. Remova ou mova os itens antes de excluir a categoria.`,
      });
    } else {
      deleteStockCategory(categoryToDelete.id);
      toast({
        title: 'Categoria removida',
        description: `A categoria "${categoryToDelete.name}" foi removida.`,
      });
      // Mude para a primeira aba disponível se a aba ativa foi deletada
      const remainingCategories = sortedCategories.filter(c => c.id !== categoryToDelete.id);
      if (remainingCategories.length > 0) {
        setActiveTab(remainingCategories[0].name);
      } else {
        setActiveTab(undefined);
      }
    }
    handleCloseCategoryAlert();
  };

  const handleOpenCancelReservationAlert = (item: StockItem, reservation: StockReservation) => {
    setReservationToCancel({item, reservation});
    setCancellationReason('');
    setReservationCancelAlertOpen(true);
  }

  const handleConfirmCancelReservation = () => {
    if(reservationToCancel){
      if(!cancellationReason.trim()) {
        toast({
          variant: 'destructive',
          title: 'Motivo obrigatório',
          description: 'Por favor, insira o motivo da anulação.',
        });
        return;
      }
      cancelStockReservation(reservationToCancel.item.id, reservationToCancel.reservation, cancellationReason);
      toast({
          title: 'Reserva Anulada!',
          description: `A reserva para o projeto ${reservationToCancel.reservation.projectName} foi removida. O material agora precisa ser comprado manualmente.`,
      });
      setReservationToCancel(null);
      setReservationCancelAlertOpen(false);
    }
  };


  const handleOpenDispatchModal = (item: StockItem, reservation: StockReservation) => {
    setDispatchInfo({ item, reservation });
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = (stockItemId: string, reservation: StockReservation, marceneiroId: string) => {
    if(!user?.uid) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
        return;
    }
    dispatchItemToProduction(stockItemId, reservation, user.uid, marceneiroId);
    toast({
        title: 'Item Despachado para Produção!',
        description: `Foi dada a baixa no estoque para a reserva do projeto ${reservation.projectName}.`
    });
  };
  
  const handleConfirmReceipt = (item: StockItem) => {
    confirmStockReceipt(item);
    toast({
      title: 'Entrada Confirmada!',
      description: `A quantidade de ${item.awaitingReceipt?.quantity} de ${item.name} foi adicionada ao estoque.`,
    });
  };


  const renderStockList = useCallback((categoryName: string) => {
    const items = [...stockItems]
      .filter((item) => item.category === categoryName)
      .sort((a, b) => {
          switch (sortOrder) {
              case 'demand_desc':
                  const demandA = (a.reservations || []).reduce((acc, r) => acc + Number(r.quantity), 0);
                  const demandB = (b.reservations || []).reduce((acc, r) => acc + Number(r.quantity), 0);
                  return demandB - demandA;
              case 'quantity_asc':
                  const availableA = a.quantity - (a.reservations || []).reduce((acc, r) => acc + Number(r.quantity), 0);
                  const availableB = b.quantity - (b.reservations || []).reduce((acc, r) => acc + Number(r.quantity), 0);
                  return availableA - availableB;
              case 'name_asc':
              default:
                  return a.name.localeCompare(b.name);
          }
      });

    if (items.length === 0) {
      return (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Nenhum item nesta categoria.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => {
          const totalReserved = (item.reservations || []).reduce((acc, res) => acc + Number(res.quantity), 0);
          const availableQuantity = item.quantity - totalReserved;
          const isLowStock = typeof item.minStock === 'number' && availableQuantity < item.minStock;
          const sortedReservations = [...(item.reservations || [])].sort((a, b) => a.projectName.localeCompare(b.projectName) || a.furnitureName.localeCompare(b.furnitureName));

          return (
          <div
            key={item.id}
            className={cn("flex items-center justify-between rounded-lg border p-4 gap-2 flex-wrap", isLowStock && "bg-destructive/10 border-destructive/20")}
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                 <div className="flex items-center gap-2 flex-wrap">
                  {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <p className={cn("text-sm", isLowStock ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    Disponível: {availableQuantity} {item.unit}
                  </p>
                   {totalReserved > 0 && (
                      <Popover open={popoverOpenState[item.id] || false} onOpenChange={() => togglePopover(item.id)}>
                        <PopoverTrigger asChild>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600">
                             ({totalReserved} {item.unit} reservados)
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Reservas para {item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Itens do estoque alocados para projetos.
                              </p>
                            </div>
                             <div className="grid gap-2 text-sm max-h-60 overflow-y-auto">
                              {sortedReservations.map(res => (
                                <div key={res.materialId} className={cn("flex items-center justify-between gap-2 p-2 rounded-md border", "bg-muted/30")}>
                                  <div className="truncate">
                                      <Link href={`/projects/${res.projectId}`} className="truncate hover:underline">
                                        <p className="font-medium truncate">{res.projectName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{res.environmentName}{' > '}{res.furnitureName}</p>
                                      </Link>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <p className="font-mono">{res.quantity} {item.unit}</p>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleOpenCancelReservationAlert(item, res)}>
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="default" onClick={() => handleOpenDispatchModal(item, res)}>
                                      <SendToBack className="mr-2 h-4 w-4" />
                                      Despachar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                </div>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
               <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenHistoryModal(item)}
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenMovementModal(item)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Movimentar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenRegisterModal(item)}
                className="h-9 w-9"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive/80 hover:text-destructive h-9 w-9"
                onClick={() => handleOpenAlert(item)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remover</span>
              </Button>
            </div>
          </div>
        )})}
      </div>
    );
  }, [stockItems, sortOrder, popoverOpenState, togglePopover, handleOpenCancelReservationAlert, handleOpenDispatchModal, handleOpenHistoryModal, handleOpenMovementModal, handleOpenRegisterModal, handleOpenAlert]);


  if (isLoading || !loggedInMember) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>A carregar...</p>
      </div>
    );
  }

  if (loggedInMember.role === 'Projetista') {
    return null;
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Controle de Estoque"
            description="Gerencie os materiais da sua marcenaria."
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setCategoryModalOpen(true)}
              variant="outline"
              className="flex-1 sm:flex-initial"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
             <Button
              onClick={() => handleOpenRegisterModal()}
              className="flex-1 sm:flex-initial"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
        </div>

        {itemsAwaitingReceipt.length > 0 && (
          <Collapsible open={isAwaitingReceiptOpen} onOpenChange={setAwaitingReceiptOpen} className="w-full">
            <Card className='border-blue-500'>
              <CardHeader>
                  <div className="flex items-center justify-between">
                  <div className='space-y-1.5'>
                      <CardTitle className="font-headline text-blue-700">Aguardando Recebimento ({itemsAwaitingReceipt.length})</CardTitle>
                      <CardDescription>Materiais que foram comprados e aguardam a chegada e conferência.</CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                      <ChevronsUpDown className="h-4 w-4" />
                      <span className="sr-only">Toggle</span>
                      </Button>
                  </CollapsibleTrigger>
                  </div>
              </CardHeader>
              <CollapsibleContent>
                  <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {itemsAwaitingReceipt.map((item) => (
                        <div key={item.id} className="p-3 rounded-md bg-blue-100/60 border-l-4 border-blue-500 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                            <div className="flex items-start gap-3">
                                <PackagePlus className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-blue-700/90 font-medium">
                                      Aguardando entrada de {item.awaitingReceipt?.quantity} {item.unit}(s).
                                    </p>
                                    <p className='text-xs text-muted-foreground'>Fornecedor: {item.awaitingReceipt?.supplier} | Pedido em: {format(new Date(item.awaitingReceipt!.registeredAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
                                </div>
                            </div>
                            <Button size="sm" variant="default" onClick={() => handleConfirmReceipt(item)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmar Entrada
                            </Button>
                        </div>
                      ))}
                  </div>
                  </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}


        {sortedCategories.length > 0 && activeTab ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
              {sortedCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.name} className='flex-1'>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {sortedCategories.map((category) => (
              <TabsContent key={category.id} value={category.name}>
                <Card>
                  <CardHeader>
                    <div className='flex justify-between items-start'>
                      <div>
                        <CardTitle>{category.name}</CardTitle>
                        <CardDescription>
                          Itens da categoria {category.name.toLowerCase()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Ordenar por..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                            <SelectItem value="demand_desc">Maior Demanda</SelectItem>
                            <SelectItem value="quantity_asc">Menor Estoque</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive h-8 w-8" onClick={() => handleOpenCategoryAlert(category)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover Categoria</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>{renderStockList(category.name)}</CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
            <div className="text-center p-4">
              <h3 className="font-headline text-xl font-semibold text-muted-foreground/80">
                Nenhuma categoria encontrada
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cadastre uma nova categoria para começar a organizar seu estoque.
              </p>
            </div>
          </div>
        )}
      </div>

      <RegisterStockItemModal
        isOpen={isRegisterModalOpen}
        onClose={handleCloseRegisterModal}
        itemToEdit={itemToEdit}
        categories={sortedCategories}
      />
      
      {itemToMove && (
        <StockMovementModal
          isOpen={isMovementModalOpen}
          onClose={handleCloseMovementModal}
          item={itemToMove}
        />
      )}

      {itemForHistory && (
        <StockMovementHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={handleCloseHistoryModal}
          item={itemForHistory}
        />
      )}

      {dispatchInfo && (
        <DispatchConfirmationModal
          isOpen={isDispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          item={dispatchInfo.item}
          reservation={dispatchInfo.reservation}
          onConfirm={handleConfirmDispatch}
        />
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente{' '}
              <span className="font-bold">{itemToDelete?.name}</span> do
              estoque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseAlert}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReservationCancelAlertOpen} onOpenChange={setReservationCancelAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anular Reserva?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza de que deseja anular a reserva de <span className="font-bold">{reservationToCancel?.reservation.quantity} {reservationToCancel?.item.unit}(s)</span> para o projeto <span className="font-bold">{reservationToCancel?.reservation.projectName}</span>? O material terá de ser comprado manualmente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Motivo da anulação (obrigatório)" 
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReservationCancelAlertOpen(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancelReservation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, anular reserva
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCategoryAlertOpen} onOpenChange={setCategoryAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              {itemsInCategory > 0 ? (
                <>
                  Não é possível remover a categoria <span className="font-bold">{categoryToDelete?.name}</span> porque ela contém {itemsInCategory} item(ns). Por favor, mova ou remova os itens antes de excluir a categoria.
                </>
              ) : (
                <>
                  Você tem certeza que deseja remover a categoria <span className="font-bold">{categoryToDelete?.name}</span>? Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseCategoryAlert}>
              {itemsInCategory > 0 ? 'Entendi' : 'Cancelar'}
            </AlertDialogCancel>
            {itemsInCategory === 0 && (
              <AlertDialogAction
                onClick={handleConfirmCategoryDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, remover
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <RegisterCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
    </>
  );
}
