'use client';
import { useContext, useState } from 'react';
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
import { PlusCircle, Edit, Trash2, ArrowRightLeft } from 'lucide-react';
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

const categories = [
  'Corrediças',
  'Dobradiças',
  'Articuladores',
  'Cola HotMelt',
  'Sapata Niveladora',
  'Outros',
];

export default function StockPage() {
  const { stockItems, deleteStockItem, isLoading } = useContext(AppContext);
  const { toast } = useToast();

  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  
  const [isMovementModalOpen, setMovementModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<StockItem | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

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

  const renderStockList = (category: string) => {
    const items = stockItems.filter(
      (item) => (item.category || 'Outros') === category
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
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} {item.unit}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
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
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive/80 hover:text-destructive"
                onClick={() => handleOpenAlert(item)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remover</span>
              </Button>
            </div>
          </div>
        ))}
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
          <Button
            onClick={() => handleOpenRegisterModal()}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </div>

        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                  <CardDescription>
                    Itens da categoria {category.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>{renderStockList(category)}</CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <RegisterStockItemModal
        isOpen={isRegisterModalOpen}
        onClose={handleCloseRegisterModal}
        itemToEdit={itemToEdit}
      />
      
      {itemToMove && (
        <StockMovementModal
          isOpen={isMovementModalOpen}
          onClose={handleCloseMovementModal}
          item={itemToMove}
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
    </>
  );
}
