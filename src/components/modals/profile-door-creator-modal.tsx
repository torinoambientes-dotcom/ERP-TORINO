'use client';

import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import type { ProfileDoorItem } from '@/lib/types';
import {
  PROFILE_MODELS,
  PROFILE_COLORS,
  GLASS_TYPES,
  HANDLE_POSITIONS,
  HANDLE_TYPES,
  DOOR_TYPES,
  calculateRecommendedHinges,
  calculateProfileDoorCutList,
} from '@/lib/profile-door-constants';
import { generateProfileDoorPDF } from '@/lib/profile-door-pdf';
import { ProfileDoorVisualizer } from '@/components/profile-door/profile-door-visualizer';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  DoorOpen,
  FileDown,
  PlusCircle,
  Trash2,
  Sparkles,
  Scissors,
  Layers,
  Ruler,
  CheckCircle2,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  User,
  ShoppingCart,
} from 'lucide-react';
import { useEffect, useState, useContext } from 'react';

const hingeSchema = z.object({
  position: z.coerce.number().min(0, 'Posição não pode ser negativa.'),
});

const doorSetDoorSchema = z.object({
  handlePosition: z.enum(['left', 'right', 'both', 'none', 'top', 'bottom']).default('right'),
  hingeSide: z.enum(['left', 'right', 'none']).default('left'),
});

const doorSetSchema = z.object({
  count: z.coerce.number().min(1).max(8).default(1),
  doors: z.array(doorSetDoorSchema),
});

const doorCreatorSchema = z.object({
  clientName: z.string().optional(),
  environmentName: z.string().optional(),
  doorType: z.enum(DOOR_TYPES).default('Giro'),
  slidingSystem: z.string().optional(),
  profileModel: z.string().default(PROFILE_MODELS[0].name),
  profileWidthMM: z.coerce.number().min(10).default(45),
  glassDiscountMM: z.coerce.number().min(0).default(70),
  profileColor: z.string().min(1, 'Cor do perfil é obrigatória.').default('Preto Fosco'),
  glassType: z.string().min(1, 'Tipo de vidro é obrigatório.').default('Incolor 4mm'),
  handleType: z.string().min(1, 'Tipo de puxador é obrigatório.').default('Linear inteiro'),
  width: z.coerce.number().min(1, 'Largura deve ser positiva.').default(400),
  height: z.coerce.number().min(1, 'Altura deve ser positiva.').default(700),
  quantity: z.coerce.number().min(1, 'Quantidade mínima de 1.').default(1),
  hinges: z.array(hingeSchema).optional(),
  hingeSide: z.enum(['left', 'right']).default('left'),
  isPair: z.boolean().optional(),
  handlePosition: z.enum(['top', 'bottom', 'left', 'right']).default('right'),
  handleWidth: z.coerce.number().optional(),
  handleOffset: z.coerce.number().optional(),
  handleOffsetFrom: z.enum(['bottom', 'top']).default('bottom'),
  doorSet: doorSetSchema.optional(),
});

type DoorCreatorFormValues = z.infer<typeof doorCreatorSchema>;

interface ProfileDoorCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (door: Omit<ProfileDoorItem, 'id' | 'purchased' | 'addedAt'>) => void;
  clientName?: string;
  environmentName?: string;
  doorToEdit?: ProfileDoorItem | null;
  viewOnly?: boolean;
}

export function ProfileDoorCreatorModal({
  isOpen,
  onClose,
  onSave,
  clientName,
  environmentName,
  doorToEdit,
  viewOnly = false,
}: ProfileDoorCreatorModalProps) {
  const isEditMode = !!doorToEdit;
  const [activeTab, setActiveTab] = useState<'cad' | 'cutlist'>('cad');
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [isCustomGlass, setIsCustomGlass] = useState(false);

  const { addPurchaseRequest, teamMembers } = useContext(AppContext);
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<DoorCreatorFormValues>({
    resolver: zodResolver(doorCreatorSchema),
    defaultValues: {
      clientName: clientName || '',
      environmentName: environmentName || '',
      doorType: 'Giro',
      slidingSystem: '',
      profileModel: PROFILE_MODELS[0].name,
      profileWidthMM: 45,
      glassDiscountMM: 70,
      width: 400,
      height: 700,
      quantity: 1,
      profileColor: 'Preto Fosco',
      glassType: 'Incolor 4mm',
      handleType: 'Linear inteiro',
      hinges: [{ position: 100 }, { position: 600 }],
      hingeSide: 'left',
      isPair: false,
      handlePosition: 'right',
      handleWidth: 150,
      handleOffset: 100,
      handleOffsetFrom: 'bottom',
      doorSet: {
        count: 1,
        doors: [{ handlePosition: 'right', hingeSide: 'left' }],
      },
    },
  });

  const {
    fields: hingeFields,
    append: appendHinge,
    remove: removeHinge,
    replace: replaceHinges,
  } = useFieldArray({
    control: form.control,
    name: 'hinges',
  });

  const doorType = form.watch('doorType');
  const doorData = form.watch();
  const doorSetCount = form.watch('doorSet.count') || 1;
  const handleType = form.watch('handleType');
  const height = form.watch('height');
  const hingeSide = form.watch('hingeSide');

  // Inicialização / Reset do formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && doorToEdit) {
        const foundColor = PROFILE_COLORS.some((c) => c.name === doorToEdit.profileColor);
        setIsCustomColor(!foundColor);

        const foundGlass = GLASS_TYPES.some((g) => g.name === doorToEdit.glassType);
        setIsCustomGlass(!foundGlass);

        const initialCount = doorToEdit.doorSet?.count || (doorToEdit.isPair ? 2 : doorToEdit.quantity || 1);
        const existingDoors = doorToEdit.doorSet?.doors || [];
        const builtDoors = Array.from({ length: initialCount }, (_, i) => {
          if (existingDoors[i]) return existingDoors[i];
          return {
            handlePosition: (i % 2 === 0 ? 'right' : 'left') as any,
            hingeSide: (i % 2 === 0 ? 'left' : 'right') as any,
          };
        });

        form.reset({
          clientName: doorToEdit.clientName || clientName || '',
          environmentName: doorToEdit.environmentName || environmentName || '',
          doorType: doorToEdit.doorType || 'Giro',
          slidingSystem: doorToEdit.slidingSystem || '',
          profileModel: doorToEdit.profileModel || PROFILE_MODELS[0].name,
          profileWidthMM: doorToEdit.profileWidthMM || 45,
          glassDiscountMM: doorToEdit.glassDiscountMM || 70,
          width: doorToEdit.width || 400,
          height: doorToEdit.height || 700,
          quantity: initialCount,
          profileColor: doorToEdit.profileColor || 'Preto Fosco',
          glassType: doorToEdit.glassType || 'Incolor 4mm',
          handleType: doorToEdit.handleType || 'Sem Puxador',
          hinges: doorToEdit.hinges && doorToEdit.hinges.length > 0
            ? doorToEdit.hinges.map((h) => ({ position: Number(h.position) || 0 }))
            : [{ position: 100 }, { position: Math.max(150, (doorToEdit.height || 700) - 100) }],
          hingeSide: doorToEdit.hingeSide || 'left',
          isPair: initialCount === 2,
          handlePosition: doorToEdit.handlePosition || 'right',
          handleWidth: doorToEdit.handleWidth || 150,
          handleOffset: doorToEdit.handleOffset ?? 100,
          handleOffsetFrom: doorToEdit.handleOffsetFrom || 'bottom',
          doorSet: {
            count: initialCount,
            doors: builtDoors,
          },
        });
      } else {
        setIsCustomColor(false);
        setIsCustomGlass(false);
        form.reset({
          clientName: clientName || '',
          environmentName: environmentName || '',
          doorType: 'Giro',
          slidingSystem: '',
          profileModel: PROFILE_MODELS[0].name,
          profileWidthMM: 45,
          glassDiscountMM: 70,
          width: 400,
          height: 700,
          quantity: 1,
          profileColor: 'Preto Fosco',
          glassType: 'Incolor 4mm',
          handleType: 'Linear inteiro',
          hinges: [{ position: 100 }, { position: 600 }],
          hingeSide: 'left',
          isPair: false,
          handlePosition: 'right',
          handleWidth: 150,
          handleOffset: 100,
          handleOffsetFrom: 'bottom',
          doorSet: {
            count: 1,
            doors: [{ handlePosition: 'right', hingeSide: 'left' }],
          },
        });
      }
    }
  }, [isOpen, isEditMode, doorToEdit, form, clientName, environmentName]);

  // Sincronizar array de folhas caso a quantidade venha desatualizada externamente
  useEffect(() => {
    const currentDoors = form.getValues('doorSet.doors') || [];
    if (currentDoors.length !== doorSetCount) {
      const newDoors = Array.from({ length: doorSetCount }, (_, i) => {
        if (currentDoors[i]) return currentDoors[i];
        return {
          handlePosition: (i % 2 === 0 ? 'right' : 'left') as any,
          hingeSide: (i % 2 === 0 ? 'left' : 'right') as any,
        };
      });
      form.setValue('doorSet.doors', newDoors as any, { shouldDirty: true, shouldValidate: true });
      form.setValue('quantity', doorSetCount);
      form.setValue('isPair', doorSetCount === 2);
    }
  }, [doorSetCount, form]);

  // Presets para configuração rápida de múltiplas portas
  const handleApplyPresetAlternated = () => {
    const newDoors = Array.from({ length: doorSetCount }, (_, i) => ({
      hingeSide: (i % 2 === 0 ? 'left' : 'right') as any,
      handlePosition: (i % 2 === 0 ? 'right' : 'left') as any,
    }));
    form.setValue('doorSet.doors', newDoors, { shouldDirty: true, shouldValidate: true });
  };

  const handleApplyPresetAllLeft = () => {
    const newDoors = Array.from({ length: doorSetCount }, () => ({
      hingeSide: 'left' as any,
      handlePosition: 'right' as any,
    }));
    form.setValue('doorSet.doors', newDoors, { shouldDirty: true, shouldValidate: true });
  };

  const handleApplyPresetAllRight = () => {
    const newDoors = Array.from({ length: doorSetCount }, () => ({
      hingeSide: 'right' as any,
      handlePosition: 'left' as any,
    }));
    form.setValue('doorSet.doors', newDoors, { shouldDirty: true, shouldValidate: true });
  };

  // Cálculo de medidas de corte em tempo real
  const cutList = calculateProfileDoorCutList({
    width: doorData.width || 0,
    height: doorData.height || 0,
    quantity: doorSetCount,
    profileWidthMM: doorData.profileWidthMM || 45,
    glassDiscountMM: doorData.glassDiscountMM || 70,
    hingesCount: doorData.hinges?.length || 0,
  });

  // Ação: Calcular Dobradiças Automaticamente
  const handleAutoCalculateHinges = () => {
    const currentH = Number(form.getValues('height')) || 700;
    const recommendedPositions = calculateRecommendedHinges(currentH);
    replaceHinges(recommendedPositions.map((pos) => ({ position: pos })));
  };

  // Ação: Mudar Modelo de Perfil
  const handleProfileModelChange = (modelName: string) => {
    const modelCfg = PROFILE_MODELS.find((m) => m.name === modelName);
    if (modelCfg) {
      form.setValue('profileModel', modelCfg.name, { shouldDirty: true, shouldValidate: true });
      form.setValue('profileWidthMM', modelCfg.widthMM, { shouldDirty: true, shouldValidate: true });
      form.setValue('glassDiscountMM', modelCfg.glassDiscountMM, { shouldDirty: true, shouldValidate: true });

      if (modelCfg.id === 'perfil-gola-45') {
        form.setValue('handleType', 'Perfil Puxador Integrado', { shouldDirty: true, shouldValidate: true });
      }
    }
  };

  // Submissão do formulário
  const onSubmit = () => {
    if (viewOnly) return;

    const submissionData = form.getValues();
    submissionData.quantity = submissionData.doorSet?.count || 1;

    if (submissionData.hinges) {
      submissionData.hinges = submissionData.hinges.map((h) => ({
        position: parseFloat(String(h.position)) || 0,
      }));
    }

    onSave(submissionData as Omit<ProfileDoorItem, 'id' | 'purchased' | 'addedAt'>);
    onClose();
  };

  const handleGeneratePDF = () => {
    generateProfileDoorPDF({
      door: form.getValues() as ProfileDoorItem,
      clientName: form.getValues('clientName') || clientName || 'Especificação Técnica',
      environmentName: form.getValues('environmentName') || environmentName,
    });
  };

  const handleSendToPurchases = () => {
    const formValues = form.getValues();
    const count = formValues.doorSet?.count || formValues.quantity || 1;
    const client = formValues.clientName || clientName || 'Cliente';
    const env = formValues.environmentName || environmentName || 'Geral';
    const pModel = formValues.profileModel || 'Perfil 45';
    const pColor = formValues.profileColor || 'Preto Fosco';
    const gType = formValues.glassType || 'Incolor 4mm';
    const hType = formValues.handleType || 'Linear';
    const w = formValues.width || 400;
    const h = formValues.height || 700;

    const requester = teamMembers.find((m) => m.id === user?.uid) || {
      id: user?.uid || 'user-default',
      name: user?.displayName || user?.email || 'Projetista',
    };

    const handleDesc =
      hType === 'Aba Usinada'
        ? `Aba Usinada (${formValues.handleWidth || 150}mm, a partir de ${formValues.handleOffsetFrom === 'top' ? 'Topo' : 'Base'}: ${formValues.handleOffset || 0}mm)`
        : hType;

    const hingesDesc =
      formValues.doorType === 'Giro' && formValues.hinges?.length
        ? `${formValues.hinges.length} dobradiças por folha (${formValues.hinges.map((hg) => `${hg.position}mm`).join(', ')})`
        : formValues.doorType;

    const cutsDesc = `Cortes: Verticais ${count * 2}x ${h}mm, Horizontais ${count * 2}x ${w}mm (${cutList.totalLinearMeters.toFixed(2)}m linear total). Cantoneiras: ${cutList.cornerBracketsCount} un. Vidro: ${count} un de ${w - (formValues.glassDiscountMM || 70) * 2}x${h - (formValues.glassDiscountMM || 70) * 2}mm.`;

    addPurchaseRequest({
      description: `${count}x Porta(s) de Perfil ${pModel} ${w}×${h}mm - Vidro ${gType} - Cor ${pColor}`,
      quantity: count,
      unit: count > 1 ? 'conjunto' : 'porta',
      reason: `Porta de perfil para ${client} - Ambiente: ${env}`,
      requesterId: requester.id,
      requesterName: requester.name,
      notes: `Configuração técnica:\n- Perfil: ${pModel} (${pColor})\n- Vidro: ${gType}\n- Puxador: ${handleDesc}\n- Furações/Dobradiças: ${hingesDesc}\n- Especificação de corte: ${cutsDesc}`,
      projectName: `${client} - ${env}`,
      profileDoorConfig: {
        id: `prf-${Date.now()}`,
        clientName: client,
        environmentName: env,
        ...formValues,
        quantity: count,
      } as ProfileDoorItem,
    });

    toast({
      title: 'Enviado para Compras!',
      description: `Solicitação de compra para ${count} porta(s) de perfil enviada com sucesso para o departamento de compras.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-7xl h-[92vh] flex flex-col p-6 gap-4">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-headline text-xl flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" />
                {viewOnly
                  ? 'Visualizar Porta de Perfil'
                  : isEditMode
                  ? 'Editar Porta de Perfil'
                  : 'Criador de Porta de Perfil de Alumínio'}
              </DialogTitle>
              <DialogDescription>
                Configure medidas, múltiplas portas lado a lado, furações de dobradiça e consulte a lista de corte.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {(form.watch('clientName') || clientName || form.watch('environmentName') || environmentName) && (
                <Badge variant="secondary" className="text-xs px-3 py-1 flex items-center gap-1.5">
                  {(form.watch('clientName') || clientName) && (
                    <span>
                      Cliente: <strong>{form.watch('clientName') || clientName}</strong>
                    </span>
                  )}
                  {(form.watch('clientName') || clientName) && (form.watch('environmentName') || environmentName) && (
                    <span>•</span>
                  )}
                  {(form.watch('environmentName') || environmentName) && (
                    <span>
                      Ambiente: <strong>{form.watch('environmentName') || environmentName}</strong>
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex min-h-0 gap-6">
              {/* COLUNA ESQUERDA: FORMULÁRIO DE CONFIGURAÇÃO */}
              <fieldset
                disabled={viewOnly}
                className="w-[470px] flex-shrink-0 space-y-4 overflow-y-auto pr-3"
              >
                {/* 0. IDENTIFICAÇÃO DO PROJETO (CLIENTE & AMBIENTE) */}
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Identificação do Projeto
                    </span>
                    {(form.watch('clientName') || form.watch('environmentName')) && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 max-w-[200px] truncate">
                        {[form.watch('clientName'), form.watch('environmentName')].filter(Boolean).join(' • ')}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Nome do Cliente</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Carlos Silva"
                              className="h-8 text-xs"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="environmentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Ambiente</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Cozinha, Suíte..."
                              className="h-8 text-xs"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 1. TIPO DE PORTA, QUANTIDADE DE FOLHAS & DIMENSÕES */}
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      1. Tipo & Quantidade de Folhas
                    </span>
                    <Badge variant="outline" className="text-[11px] font-semibold">
                      {doorSetCount} {doorSetCount === 1 ? 'Folha' : 'Folhas Lado a Lado'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="doorType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tipo de Abertura</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DOOR_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quantidade de Folhas no Conjunto (Suporta 1 a 6 portas lado a lado) */}
                    <FormField
                      control={form.control}
                      name="doorSet.count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Número de Folhas</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              const newCount = parseInt(v);
                              field.onChange(newCount);
                              const currentDoors = form.getValues('doorSet.doors') || [];
                              const newDoors = Array.from({ length: newCount }, (_, i) => {
                                if (currentDoors[i]) return currentDoors[i];
                                return {
                                  handlePosition: (i % 2 === 0 ? 'right' : 'left') as any,
                                  hingeSide: (i % 2 === 0 ? 'left' : 'right') as any,
                                };
                              });
                              form.setValue('doorSet.doors', newDoors as any, { shouldDirty: true, shouldValidate: true });
                              form.setValue('quantity', newCount, { shouldDirty: true });
                              form.setValue('isPair', newCount === 2, { shouldDirty: true });
                            }}
                            value={String(field.value || 1)}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 Porta (Individual)</SelectItem>
                              <SelectItem value="2">2 Portas (Par)</SelectItem>
                              <SelectItem value="3">3 Portas (Trio)</SelectItem>
                              <SelectItem value="4">4 Portas (Quádruplo)</SelectItem>
                              <SelectItem value="5">5 Portas (Quíntuplo)</SelectItem>
                              <SelectItem value="6">6 Portas (Sêxtuplo)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {doorType === 'Correr' && (
                    <FormField
                      control={form.control}
                      name="slidingSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Sistema de Trilho / Roldana</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: RO-65, SS-150, Versatile..."
                              className="h-9"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Dimensões por folha */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Largura por Folha (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-9 font-mono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Altura da Folha (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-9 font-mono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 2. CONFIGURAÇÃO INDIVIDUAL DE CADA FOLHA (SE HOUVER MAIS DE 1 PORTA) */}
                {doorSetCount > 1 && (
                  <div className="space-y-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Configurar Cada Folha Independente
                      </span>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleApplyPresetAlternated}
                        className="h-7 text-[11px] px-2 gap-1 flex-shrink-0"
                        title="Alternar portas em pares (Esq/Dir)"
                      >
                        <ArrowLeftRight className="h-3 w-3 text-primary" />
                        Pares Alternados
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyPresetAllLeft}
                        className="h-7 text-[11px] px-2 gap-1 flex-shrink-0"
                        title="Todas abrindo com dobradiça na esquerda"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Todas Dobradiças Esq
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyPresetAllRight}
                        className="h-7 text-[11px] px-2 gap-1 flex-shrink-0"
                        title="Todas abrindo com dobradiça na direita"
                      >
                        <ArrowRight className="h-3 w-3" />
                        Todas Dobradiças Dir
                      </Button>
                    </div>

                    {/* Lista de Folhas com Seletores Independentes */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {Array.from({ length: doorSetCount }).map((_, index) => (
                        <div
                          key={index}
                          className="p-2 bg-background rounded-md border text-xs space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                                {index + 1}
                              </span>
                              Porta {index + 1}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {doorData.doorSet?.doors?.[index]?.hingeSide === 'left' ? 'Dobradiça Esq' : 'Dobradiça Dir'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {doorType === 'Giro' && (
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Lado Dobradiça</Label>
                                <Controller
                                  control={form.control}
                                  name={`doorSet.doors.${index}.hingeSide`}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value || (index % 2 === 0 ? 'left' : 'right')}
                                      onValueChange={(val) => {
                                        field.onChange(val);
                                        // Auto ajustar puxador no lado oposto se aplicável
                                        if (val === 'left') {
                                          form.setValue(`doorSet.doors.${index}.handlePosition`, 'right');
                                        } else if (val === 'right') {
                                          form.setValue(`doorSet.doors.${index}.handlePosition`, 'left');
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="left">Esquerda</SelectItem>
                                        <SelectItem value="right">Direita</SelectItem>
                                        <SelectItem value="none">Sem Dobradiça</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>
                            )}

                            <div>
                              <Label className="text-[10px] text-muted-foreground">Posição Puxador</Label>
                              <Controller
                                control={form.control}
                                name={`doorSet.doors.${index}.handlePosition`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value || (index % 2 === 0 ? 'right' : 'left')}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Esquerda</SelectItem>
                                      <SelectItem value="right">Direita</SelectItem>
                                      <SelectItem value="both">Ambos os Lados</SelectItem>
                                      <SelectItem value="top">Em cima (Topo)</SelectItem>
                                      <SelectItem value="bottom">Em baixo (Base)</SelectItem>
                                      <SelectItem value="none">Nenhum</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MODELO DE PERFIL, ACABAMENTO & VIDRO */}
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    3. Perfil & Vidraçaria
                  </span>

                  {/* Modelo do Perfil */}
                  <FormField
                    control={form.control}
                    name="profileModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Modelo do Perfil de Alumínio</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            handleProfileModelChange(val);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROFILE_MODELS.map((m) => (
                              <SelectItem key={m.id} value={m.name}>
                                <div className="flex flex-col">
                                  <span>{m.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {m.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Largura do Perfil e Desconto do Vidro */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="profileWidthMM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Borda do Perfil (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-8 font-mono text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="glassDiscountMM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Desconto Vidro (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-8 font-mono text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Acabamento / Cor do Perfil */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs">Acabamento do Alumínio</FormLabel>
                      <button
                        type="button"
                        onClick={() => setIsCustomColor(!isCustomColor)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {isCustomColor ? 'Escolher da paleta' : 'Personalizar nome'}
                      </button>
                    </div>

                    {isCustomColor ? (
                      <FormField
                        control={form.control}
                        name="profileColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Digite a cor/acabamento" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="profileColor"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROFILE_COLORS.map((c) => (
                                  <SelectItem key={c.name} value={c.name}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border shadow-xs"
                                        style={{ backgroundColor: c.hex }}
                                      />
                                      <span>{c.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Tipo de Vidro */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs">Tipo de Vidro / Espelho</FormLabel>
                      <button
                        type="button"
                        onClick={() => setIsCustomGlass(!isCustomGlass)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {isCustomGlass ? 'Escolher do catálogo' : 'Personalizar nome'}
                      </button>
                    </div>

                    {isCustomGlass ? (
                      <FormField
                        control={form.control}
                        name="glassType"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Digite o tipo de vidro" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="glassType"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-60">
                                {GLASS_TYPES.map((g) => (
                                  <SelectItem key={g.name} value={g.name}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-3.5 h-3.5 rounded-xs border shadow-xs"
                                        style={{
                                          backgroundColor: g.bgStyle,
                                          borderColor: g.borderHex,
                                        }}
                                      />
                                      <span>{g.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* 4. ESPECIFICAÇÃO GERAL DO PUXADOR */}
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    4. Modelo do Puxador
                  </span>

                  <FormField
                    control={form.control}
                    name="handleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tipo de Puxador</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HANDLE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Se for apenas 1 porta, mostra a posição geral do puxador aqui */}
                  {doorSetCount === 1 && handleType !== 'Sem Puxador' && (
                    <FormField
                      control={form.control}
                      name="handlePosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Posição na Folha</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('doorSet.doors.0.handlePosition', val as any, { shouldDirty: true });
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(HANDLE_POSITIONS)
                                .filter(([k]) => k !== 'both' && k !== 'none')
                                .map(([val, label]) => (
                                  <SelectItem key={val} value={val}>
                                    {label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {handleType === 'Aba Usinada' && (
                    <div className="space-y-2.5 pt-2 border-t border-dashed">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="handleWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Comprimento da Aba (mm)</FormLabel>
                              <FormControl>
                                <Input type="number" className="h-8 font-mono text-xs" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="handleOffsetFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Medir a partir de:</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'bottom'}>
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bottom">Base (de baixo)</SelectItem>
                                  <SelectItem value="top">Topo (de cima)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="handleOffset"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              {form.watch('handleOffsetFrom') === 'top'
                                ? 'Distância do Topo (mm)'
                                : 'Distância da Base (mm)'}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" className="h-8 font-mono text-xs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Resumo visual dinâmico com cotas do puxador */}
                      {(() => {
                        const hH = Number(doorData.height) || 700;
                        const abaW = Number(doorData.handleWidth) || 150;
                        const off = Number(doorData.handleOffset) || 0;
                        const isFromTop = doorData.handleOffsetFrom === 'top';
                        const distBottom = isFromTop ? Math.max(0, hH - off - abaW) : off;
                        const distTop = isFromTop ? off : Math.max(0, hH - off - abaW);

                        return (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono flex items-center justify-between text-muted-foreground">
                            <span>
                              Base: <strong className="text-foreground">{distBottom}mm</strong>
                            </span>
                            <span className="text-amber-700 dark:text-amber-400 font-bold">
                              Aba: {abaW}mm
                            </span>
                            <span>
                              Topo: <strong className="text-foreground">{distTop}mm</strong>
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* 5. DOBRADIÇAS (FURAÇÕES) */}
                {doorType === 'Giro' && (
                  <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        5. Furação de Dobradiças
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAutoCalculateHinges}
                        className="h-7 text-xs px-2.5 font-medium text-primary hover:text-primary gap-1"
                        title="Calcular automaticamente quantidade e posições das dobradiças com base na altura da porta"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Calcular Automaticamente
                      </Button>
                    </div>

                    {doorSetCount === 1 && (
                      <FormField
                        control={form.control}
                        name="hingeSide"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Lado das Dobradiças</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                const opp = val === 'left' ? 'right' : 'left';
                                form.setValue('handlePosition', opp, { shouldDirty: true });
                                form.setValue('doorSet.doors.0.hingeSide', val as any, { shouldDirty: true });
                                form.setValue('doorSet.doors.0.handlePosition', opp as any, { shouldDirty: true });
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="left">Esquerda</SelectItem>
                                <SelectItem value="right">Direita</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span>Furo / Caneco Ø35mm</span>
                        <span>Distância da Base (mm)</span>
                      </div>

                      {hingeFields.map((fieldItem, index) => {
                        const currentPos = Number(form.watch(`hinges.${index}.position`)) || 0;
                        const distFromTop = Math.max(0, (height || 700) - currentPos);

                        return (
                          <div key={fieldItem.id} className="flex items-center gap-2 bg-background p-1.5 rounded-md border">
                            <span className="text-xs font-semibold text-muted-foreground w-12 pl-1">
                              #{index + 1}:
                            </span>
                            <FormField
                              control={form.control}
                              name={`hinges.${index}.position`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="h-7 font-mono text-xs"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap pr-1 font-mono">
                              ({distFromTop}mm topo)
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeHinge(index)}
                              className="text-destructive h-7 w-7 flex-shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendHinge({ position: 100 })}
                        className="w-full h-8 text-xs gap-1"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Adicionar Ponto de Dobradiça
                      </Button>
                    </div>
                  </div>
                )}
              </fieldset>

              {/* COLUNA DIREITA: VISUALIZADOR CAD INTERATIVO & LISTA DE CORTE */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-muted/20 rounded-xl border p-3 gap-3">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as any)}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="flex items-center justify-between pb-2">
                    <TabsList className="h-8">
                      <TabsTrigger value="cad" className="text-xs gap-1.5 px-3">
                        <Layers className="h-3.5 w-3.5" />
                        Visualizador CAD com Cotas
                      </TabsTrigger>
                      <TabsTrigger value="cutlist" className="text-xs gap-1.5 px-3">
                        <Scissors className="h-3.5 w-3.5" />
                        Lista de Corte para Produção
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        Total: <strong>{cutList.quantity} folha(s)</strong>
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Vidro: <strong>{cutList.totalGlassAreaM2.toFixed(2)} m²</strong>
                      </Badge>
                    </div>
                  </div>

                  {/* ABA 1: VISUALIZADOR CAD TÉCNICO COM COTAS */}
                  <TabsContent value="cad" className="flex-1 min-h-0 m-0 relative rounded-lg border overflow-hidden bg-background">
                    <ProfileDoorVisualizer
                      door={doorData}
                      clientName={form.watch('clientName') || clientName}
                      environmentName={form.watch('environmentName') || environmentName}
                    />
                  </TabsContent>

                  {/* ABA 2: LISTA DE CORTE PARA FABRICAÇÃO */}
                  <TabsContent value="cutlist" className="flex-1 min-h-0 m-0 p-4 rounded-lg border overflow-y-auto bg-background space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm">Medidas de Corte Industrial</h4>
                        <p className="text-xs text-muted-foreground">
                          Descontos de vidro e dimensionamento das barras de alumínio calculados automaticamente.
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        Desconto do Perfil: {cutList.glassDiscountMM}mm
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Card do Vidro */}
                      <div className="p-3.5 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <Scissors className="h-4 w-4" />
                            Chapa de Vidro (Vidraçaria)
                          </span>
                          <Badge variant="outline" className="text-[11px] font-mono border-amber-500/30">
                            {doorData.glassType}
                          </Badge>
                        </div>
                        <div className="pt-1">
                          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
                            {cutList.glassWidth} × {cutList.glassHeight} <span className="text-xs font-normal text-muted-foreground">mm</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Medida por peça (Largura: {doorData.width} - {cutList.glassDiscountMM}mm | Altura: {doorData.height} - {cutList.glassDiscountMM}mm)
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 text-xs">
                          <div>
                            <span className="text-muted-foreground">Qtd. de Peças:</span>
                            <p className="font-bold">{cutList.quantity} un</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Área Total:</span>
                            <p className="font-bold font-mono">{cutList.totalGlassAreaM2.toFixed(3)} m²</p>
                          </div>
                        </div>
                      </div>

                      {/* Card dos Perfis de Alumínio */}
                      <div className="p-3.5 rounded-lg border bg-blue-500/5 border-blue-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                            <Layers className="h-4 w-4" />
                            Perfis de Alumínio (Corte a 45º)
                          </span>
                          <Badge variant="outline" className="text-[11px] font-mono border-blue-500/30">
                            {doorData.profileColor}
                          </Badge>
                        </div>
                        <div className="pt-1 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Perfis Verticais (Altura):</span>
                            <span className="font-mono font-bold">{cutList.verticalProfilesCount} un × {cutList.verticalProfileLengthMM} mm</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Perfis Horizontais (Largura):</span>
                            <span className="font-mono font-bold">{cutList.horizontalProfilesCount} un × {cutList.horizontalProfileLengthMM} mm</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/20 text-xs">
                          <div>
                            <span className="text-muted-foreground">Metragem Total:</span>
                            <p className="font-bold font-mono">{cutList.totalLinearMeters.toFixed(2)} ml</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cantoneiras:</span>
                            <p className="font-bold font-mono">{cutList.cornerBracketsCount} un (4 un/porta)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resumo de Ferragens & Furações */}
                    <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2 text-xs">
                      <h5 className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Ferragens & Furações
                      </h5>
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div>
                          <span className="text-muted-foreground">Dobradiças:</span>
                          <p className="font-medium">
                            {doorType === 'Giro'
                              ? `${cutList.hingesTotal} un (Caneco 35mm)`
                              : 'N/A (Sistema de Correr)'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Puxador:</span>
                          <p className="font-medium">
                            {handleType !== 'Sem Puxador' ? handleType : 'Sem puxador'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Escova Vedadora:</span>
                          <p className="font-medium font-mono">~{cutList.sealGasketMeters.toFixed(1)} metros</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <DialogFooter className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="text-xs text-muted-foreground hidden sm:block">
                Desenho técnico vetorial em milímetros com folha de engenharia.
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant={viewOnly ? 'default' : 'ghost'} onClick={onClose}>
                  {viewOnly ? 'Fechar' : 'Cancelar'}
                </Button>
                <Button type="button" variant="outline" onClick={handleGeneratePDF} className="gap-1.5">
                  <FileDown className="h-4 w-4 text-primary" />
                  Gerar Folha PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendToPurchases}
                  className="gap-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 border-amber-300 dark:border-amber-700"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Enviar para Compras
                </Button>
                {!viewOnly && (
                  <Button type="button" onClick={form.handleSubmit(onSubmit)} className="gap-1.5">
                    <DoorOpen className="h-4 w-4" />
                    {isEditMode ? 'Salvar Alterações' : 'Adicionar Porta'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
