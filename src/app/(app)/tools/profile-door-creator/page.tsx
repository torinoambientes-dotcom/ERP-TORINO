
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FileText } from 'lucide-react';
import { useState } from 'react';

const doorCreatorSchema = z.object({
  clientName: z.string().optional(),
  environment: z.string().optional(),
  width: z.coerce.number().min(100, 'Largura mínima de 100mm').max(1500, 'Largura máxima de 1500mm'),
  height: z.coerce.number().min(300, 'Altura mínima de 300mm').max(3000, 'Altura máxima de 3000mm'),
  aluminumColor: z.string().min(1, 'Cor do alumínio é obrigatória.'),
  glassType: z.string().min(1, 'Tipo de vidro é obrigatório.'),
  handleType: z.string().min(1, 'Tipo de puxador é obrigatório.'),
  hingeMarking: z.boolean().default(false),
});

type DoorCreatorFormValues = z.infer<typeof doorCreatorSchema>;

const aluminumColors = ['Preto Fosco', 'Inox', 'Bronze', 'Branco'];
const glassTypes = ['Espelho Prata', 'Vidro Incolor', 'Vidro Reflecta Bronze', 'Vidro Reflecta Fumê'];
const handleTypes = ['Sem puxador', 'Linear inteiro', 'Aba Usinada'];

export default function ProfileDoorCreatorPage() {
  const form = useForm<DoorCreatorFormValues>({
    resolver: zodResolver(doorCreatorSchema),
    defaultValues: {
      width: 800,
      height: 2100,
      aluminumColor: 'Preto Fosco',
      glassType: 'Espelho Prata',
      handleType: 'Sem puxador',
      hingeMarking: false,
    },
  });

  const width = form.watch('width');
  const height = form.watch('height');

  const aspectRatio = width && height ? width / height : 1;

  const handleExport = () => {
    // PDF export logic would go here
    alert('Funcionalidade de exportar para PDF a ser implementada.');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Criador de Portas de Perfil"
        description="Personalize as dimensões, acabamentos e acessórios da sua porta."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Porta</CardTitle>
            <CardDescription>Defina as características da porta.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João da Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cozinha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Largura (mm)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Altura (mm)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <FormField
                  control={form.control}
                  name="aluminumColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Alumínio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a cor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aluminumColors.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="glassType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Vidro/Espelho</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {glassTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="handleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Puxador</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o puxador" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {handleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="hingeMarking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                         <FormLabel className="text-base">
                            Marcação de Dobradiças
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visualização</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar para PDF
            </Button>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[calc(100%-80px)]">
             <div className="w-full h-full flex items-center justify-center p-8">
                <div className="relative" style={{ width: '100%', height: '100%', maxWidth: '400px', maxHeight: '800px' }}>
                    <div 
                        className="relative mx-auto border-4 border-gray-400 bg-gray-200/50 flex items-center justify-center" 
                        style={{
                            aspectRatio: `${width} / ${height}`,
                            width: aspectRatio > 0.5 ? '100%' : 'auto',
                            height: aspectRatio <= 0.5 ? '100%' : 'auto',
                        }}
                    >
                        <span className="text-muted-foreground text-sm">{form.watch('glassType')}</span>
                        {/* Width Dimension */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="h-px w-2 bg-muted-foreground"></div>
                            <div className="h-4 w-px bg-muted-foreground"></div>
                            <span>{width}mm</span>
                             <div className="h-4 w-px bg-muted-foreground"></div>
                             <div className="h-px w-2 bg-muted-foreground"></div>
                        </div>
                        {/* Height Dimension */}
                        <div className="absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-xs text-muted-foreground">
                            <div className="w-px h-2 bg-muted-foreground"></div>
                            <div className="w-4 h-px bg-muted-foreground"></div>
                             <span className="rotate-90 whitespace-nowrap ">{height}mm</span>
                             <div className="w-4 h-px bg-muted-foreground"></div>
                             <div className="w-px h-2 bg-muted-foreground"></div>
                        </div>

                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

