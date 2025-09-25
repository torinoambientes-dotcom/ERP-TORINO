'use client';
import { useContext, useState, useMemo } from 'react';
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
import { PlusCircle, Edit, Trash2, ArrowRightLeft, History, AlertTriangle } from 'lucide-react';
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
import type { StockItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RegisterStockItemModal } from '@/components/modals/register-stock-item-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockMovementModal } from '@/components/modals/stock-movement-modal';
import { StockMovementHistoryModal } from '@/components/modals/stock-movement-history-modal';
import { cn } from '@/lib/utils';
import { RegisterCategoryModal } from '@/components/modals/register-category-modal';

export default function StockPage() {
  const { stockItems, stockCategories, deleteStockItem, isLoading } = useContext(AppContext);
  const { toast } = useToast();

  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  
  const [isMovementModalOpen, setMovementModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<StockItem | null>(null);
  
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [itemForHistory, setItemForHistory] = useState<StockItem | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);

  const sortedCategories = useMemo(() => {
    return [...stockCategories].sort((a, b) => a.name.localeCompare(b.name));
  }, [stockCategories]);

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
          const isLowStock = typeof item.minStock === 'number' && item.quantity < item.minStock;
          return (
          <div
            key={item.id}
            className={cn("flex items-center justify-between rounded-lg border p-4 gap-2 flex-wrap", isLowStock && "bg-destructive/10 border-destructive/20")}
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                 <div className="flex items-center gap-2">
                  {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <p className={cn("text-sm", isLowStock ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {item.quantity} {item.unit}
                  </p>
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
              onClick={() => handleOpenRegisterModal()}
              className="flex-1 sm:flex-initial"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
            <Button
              onClick={() => setCategoryModalOpen(true)}
              variant="outline"
              className="flex-1 sm:flex-initial"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </div>
        </div>

        {sortedCategories.length > 0 ? (
          <Tabs defaultValue={sortedCategories[0].name} className="w-full">
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
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>
                      Itens da categoria {category.name.toLowerCase()}
                    </CardDescription>
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

      <RegisterCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
    </>
  );
}
