
'use client';

import { useContext, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format, set, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getInitials } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { TeamMember } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';

const singleEntrySchema = z.object({
  title: z.string().min(2, 'Título obrigatório.'),
  category: z.enum(['montagem', 'corte', 'producao']),
  startDate: z.date({ required_error: 'Início obrigatório.' }),
  endDate: z.date({ required_error: 'Fim obrigatório.' }),
  memberIds: z.array(z.string()).min(1, 'Selecione ao menos um.'),
  location: z.string().optional(),
}).refine(data => {
    return !isBefore(startOfDay(data.endDate), startOfDay(data.startDate));
}, {
    message: 'Fim inválido',
    path: ['endDate'],
});

const bulkSchema = z.object({
  entries: z.array(singleEntrySchema).min(1, 'Adicione ao menos uma entrada.'),
});

type BulkFormValues = z.infer<typeof bulkSchema>;

interface BulkWeeklyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
}

export function BulkWeeklyEntryModal({ isOpen, onClose, initialDate }: BulkWeeklyEntryModalProps) {
  const { teamMembers, addAppointments } = useContext(AppContext);
  const { toast } = useToast();

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      entries: [
        { title: '', category: 'montagem', startDate: initialDate || new Date(), endDate: initialDate || new Date(), memberIds: [], location: '' }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'entries',
  });

  useEffect(() => {
    if (isOpen) {
      const initial = initialDate || new Date();
      form.reset({
        entries: [
          { title: '', category: 'montagem', startDate: initial, endDate: initial, memberIds: [], location: '' }
        ],
      });
    }
  }, [isOpen, initialDate, form]);

  const onSubmit = (data: BulkFormValues) => {
    const appointmentsToAdd = data.entries.map(entry => {
      const start = set(entry.startDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
      const end = set(entry.endDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

      return {
        title: entry.title,
        category: entry.category,
        start: start.toISOString(),
        end: end.toISOString(),
        memberIds: entry.memberIds,
        location: entry.location || '',
        description: '',
        status: 'todo' as const,
      };
    });

    addAppointments(appointmentsToAdd);

    toast({
      title: 'Lançamento Concluído!',
      description: `${data.entries.length} itens adicionados à programação semanal.`,
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Lançamento em Massa</DialogTitle>
          <DialogDescription>
            Pode definir um período para cada projeto. Ele aparecerá todos os dias entre o início e o fim.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow pr-4">
              <div className="space-y-4 pt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-xl bg-muted/30 flex flex-col lg:flex-row gap-4 items-start relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 lg:static lg:mt-8 h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 w-full">
                      <FormField
                        control={form.control}
                        name={`entries.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="corte">Corte</SelectItem>
                                <SelectItem value="producao">Produção</SelectItem>
                                <SelectItem value="montagem">Montagem</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`entries.${index}.title`}
                        render={({ field }) => (
                          <FormItem className="lg:col-span-1">
                            <FormLabel>Projeto / Cliente</FormLabel>
                            <FormControl><Input placeholder="Ex: Torino Cozinha" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`entries.${index}.startDate`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Início</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yy") : "Início"}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`entries.${index}.endDate`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fim</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yy") : "Término"}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`entries.${index}.memberIds`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Responsáveis</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className="w-full justify-start text-left font-normal truncate">
                                    {formField.value?.length > 0 ? `${formField.value.length} membro(s)` : "Selecionar..."}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="end">
                                <Command>
                                  <CommandInput placeholder="Buscar marceneiro..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {teamMembers.map((member: TeamMember) => (
                                        <CommandItem
                                          key={member.id}
                                          onSelect={() => {
                                            const val = formField.value.includes(member.id)
                                              ? formField.value.filter(id => id !== member.id)
                                              : [...formField.value, member.id];
                                            formField.onChange(val);
                                          }}
                                        >
                                          <Checkbox className="mr-2" checked={formField.value.includes(member.id)} />
                                          <Avatar className="h-6 w-6 mr-2">
                                            <AvatarImage src={member.avatarUrl} />
                                            <AvatarFallback style={{ backgroundColor: member.color }} className="text-[10px]">
                                              {getInitials(member.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="truncate">{member.name}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`entries.${index}.location`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Local (Opcional)</FormLabel>
                            <FormControl><Input placeholder="Ex: Rua X" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-12 border-dashed"
                  onClick={() => append({ title: '', category: 'montagem', startDate: initialDate || new Date(), endDate: initialDate || new Date(), memberIds: [], location: '' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Outra Linha
                </Button>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-6 border-t mt-4">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" size="lg" className="px-12">Salvar Tudo</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
