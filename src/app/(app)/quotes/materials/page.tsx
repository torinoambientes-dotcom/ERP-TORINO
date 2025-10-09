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
import { Button } from '@/components/ui/button';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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
import type { QuoteMaterialCategory, QuoteMaterial } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisterQuoteCategoryModal } from '@/components/modals/register-quote-category-modal';
import { RegisterQuoteItemModal } from '@/components/modals/register-quote-item-modal';
import Link from 'next/link';
import { useUser } from '@/firebase';

export default function QuoteMaterialsPage() {
  const { 
    quoteMaterials, 
    quoteMaterialCategories, 
    deleteQuoteMaterial, 
    deleteQuoteMaterialCategory, 
    isLoading,
    teamMembers
  } = useContext(AppContext);
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  useEffect(() => {
    // Redirect if user is not admin and data has loaded
    if (!isLoading && loggedInMember && loggedInMember.role !== 'Administrativo') {
      router.push('/');
    }
  }, [isLoading, loggedInMember, router]);

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<QuoteMaterialCategory | null>(null);
  
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<QuoteMaterial | null>(null);
  const [itemToDelete, setItemToDelete] = useState<QuoteMaterial | null>(null);
  
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const sortedCategories = useMemo(() => {
    if (!quoteMaterialCategories) return [];
    const sorted = [...quoteMaterialCategories].sort((a, b) => a.name.localeCompare(b.name));
     if (!activeTab && sorted.length > 0) {
      setActiveTab(sorted[0].name);
    } else if (sorted.length === 0) {
      setActiveTab(undefined);
    }
    return sorted;
  }, [quoteMaterialCategories, activeTab]);

  const itemsInCategory = useMemo(() => {
    if (!categoryToDelete) return 0;
    return quoteMaterials.filter(item => item.category === categoryToDelete.name).length;
  }, [quoteMaterials, categoryToDelete]);

  const handleOpenItemModal = (item: QuoteMaterial | null = null) => {
    setItemToEdit(item);
    setItemModalOpen(true);
  };

  const handleCloseItemModal = () => {
    setItemToEdit(null);
    setItemModalOpen(false);
  };
  
  const handleOpenItemDeleteAlert = (item: QuoteMaterial) => {
    setItemToDelete(item);
  };

  const handleConfirmItemDelete = () => {
    if (itemToDelete) {
      deleteQuoteMaterial(itemToDelete.id);
      toast({
        title: 'Item removido',
        description: `${itemToDelete.name} foi removido da base de dados.`,
      });
      setItemToDelete(null);
    }
  };

  const handleOpenCategoryDeleteAlert = (category: QuoteMaterialCategory) => {
    setCategoryToDelete(category);
  };
  
  const handleConfirmCategoryDelete = () => {
    if (!categoryToDelete) return;

    if (itemsInCategory > 0) {
      toast({
        variant: 'destructive',
        title: 'Não é possível remover a categoria',
        description: `A categoria "${categoryToDelete.name}" contém itens. Remova-os ou mova-os antes de excluir.`,
      });
    } else {
      deleteQuoteMaterialCategory(categoryToDelete.id);
      toast({
        title: 'Categoria removida',
        description: `A categoria "${categoryToDelete.name}" foi removida.`,
      });
      const remainingCategories = sortedCategories.filter(c => c.id !== categoryToDelete.id);
      setActiveTab(remainingCategories.length > 0 ? remainingCategories[0].name : undefined);
    }
    setCategoryToDelete(null);
  };

  const renderMaterialsList = (categoryName: string) => {
    const items = quoteMaterials.filter(item => item.category === categoryName);

    if (items.length === 0) {
      return (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Nenhum material de custo nesta categoria.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-4 gap-2 flex-wrap">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  Custo: R$ {item.cost.toFixed(2)} / {item.unit}
                </p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => handleOpenItemModal(item)} className="h-9 w-9">
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive h-9 w-9" onClick={() => handleOpenItemDeleteAlert(item)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remover</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading || !loggedInMember || loggedInMember.role !== 'Administrativo') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>A carregar...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Materiais para Orçamento"
            description="Gerencie a base de dados de custos para os seus orçamentos."
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setCategoryModalOpen(true)} variant="outline" className="flex-1 sm:flex-initial">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
            <Button onClick={() => handleOpenItemModal()} className="flex-1 sm:flex-initial">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Material
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
                          Materiais na categoria {category.name.toLowerCase()}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive h-8 w-8" onClick={() => handleOpenCategoryDeleteAlert(category)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remover Categoria</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>{renderMaterialsList(category.name)}</CardContent>
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
                Cadastre uma nova categoria para começar a organizar seus materiais de custo.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <RegisterQuoteCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
      
      <RegisterQuoteItemModal
        isOpen={isItemModalOpen}
        onClose={handleCloseItemModal}
        itemToEdit={itemToEdit}
        categories={sortedCategories}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o material <span className="font-bold">{itemToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmItemDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              {itemsInCategory > 0 ? (
                <>
                  Não é possível remover a categoria <span className="font-bold">{categoryToDelete?.name}</span> porque ela contém {itemsInCategory} item(ns).
                </>
              ) : (
                <>
                  Você tem certeza que deseja remover a categoria <span className="font-bold">{categoryToDelete?.name}</span>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              {itemsInCategory > 0 ? 'Entendi' : 'Cancelar'}
            </AlertDialogCancel>
            {itemsInCategory === 0 && (
              <AlertDialogAction onClick={handleConfirmCategoryDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sim, remover
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
