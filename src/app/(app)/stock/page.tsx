'use client';
import { useContext, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { PlusCircle, Edit, Trash2, ArrowRightLeft, History, AlertTriangle, ListOrdered, ShieldAlert, CheckCircle, PackageCheck } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { RegisterCategoryModal } from '@/components/modals/register-category-modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { useUser } from '@/firebase';

export default function StockPage() {
  const { stockItems, stockCategories, deleteStockItem, deleteStockCategory, isLoading, clearAllReservations, dispatchReservedItem } = useContext(AppContext);
  const { toast } = useToast();
  const { user } = useUser();

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

  const [isResetAlertOpen, setResetAlertOpen] = useState(false);
  
  const [popoverOpenState, setPopoverOpenState] = useState<Record<string, boolean>>({});

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

  const handleConfirmResetReservations = () => {
    clearAllReservations();
    toast({
        title: 'Reservas Anuladas!',
        description: 'Todas as reservas de estoque foram limpas com sucesso.',
    });
    setResetAlertOpen(false);
  };

  const handleDispatch = (stockItemId: string, reservation: StockReservation) => {
    if(!user?.uid) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
        return;
    }
    dispatchReservedItem(stockItemId, reservation, user.uid);
    toast({
        title: 'Item separado com sucesso!',
        description: `A reserva para ${reservation.projectName} foi marcada como 'Separado'.`
    });
  };


  const renderStockList = (categoryName: string) => {
    const items = stockItems.filter(
      (item) => item.category === categoryName
    );

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
          const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
          const availableQuantity = item.quantity - totalReserved;
          const isLowStock = typeof item.minStock === 'number' && availableQuantity < item.minStock;

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
                              {(item.reservations || []).map(res => (
                                <div key={res.materialId} className={cn("flex items-center justify-between gap-2 p-2 rounded-md border", res.status === 'separado' ? 'bg-green-100/70 border-green-200' : 'bg-muted/30')}>
                                  <div className="truncate">
                                      <Link href={`/projects/${res.projectId}`} className="truncate hover:underline">
                                        <p className="font-medium truncate">{res.projectName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{res.furnitureName}</p>
                                      </Link>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <p className="font-mono">{res.quantity} {item.unit}</p>
                                    {res.status === 'separado' ? (
                                        <div className='flex items-center gap-1.5 text-green-700 font-medium text-xs border border-green-200 bg-white/50 px-2 py-1 rounded-md'>
                                            <PackageCheck className="h-4 w-4" />
                                            <span>Separado</span>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => handleDispatch(item.id, res)}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Marcar Separado
                                        </Button>
                                    )}
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
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando estoque...</p>
      </div>
    );
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
              onClick={() => setResetAlertOpen(true)}
              variant="destructive"
              className="flex-1 sm:flex-initial"
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Anular Reservas
            </Button>
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
                      <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive h-8 w-8" onClick={() => handleOpenCategoryAlert(category)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remover Categoria</span>
                      </Button>
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
      
      <AlertDialog open={isResetAlertOpen} onOpenChange={setResetAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular Todas as Reservas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e removerá todas as reservas de todos os itens do estoque. Use isto para corrigir dados inconsistentes. As reservas corretas serão recriadas quando os projetos forem salvos novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetAlertOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResetReservations}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, anular todas
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
