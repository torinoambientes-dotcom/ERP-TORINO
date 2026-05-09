'use client';

import { useState, useContext } from 'react';
import { AppContext } from '@/context/app-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Transaction } from '@/lib/types';
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

interface RegisterRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECURRING_CATEGORIES = [
  'Aluguel / Condomínio',
  'Energia / Água / Internet',
  'Folha de Pagamento',
  'Impostos e Taxas',
  'Plano de Saúde',
  'Software / Assinaturas',
  'Manutenção',
  'Outras Contas Fixas',
];

export function RegisterRecurringModal({ isOpen, onClose }: RegisterRecurringModalProps) {
  const { addTransaction } = useContext(AppContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    recurringDay: '10',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { set('amount', ''); return; }
    set('amount', (parseInt(raw) / 100).toFixed(2));
  };

  const formatCurrency = (value: string) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description || !form.category || !form.recurringDay) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    const day = parseInt(form.recurringDay);
    if (isNaN(day) || day < 1 || day > 31) {
      toast({ title: 'Dia inválido', description: 'O dia de vencimento deve ser entre 1 e 31.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Build the due date for the CURRENT month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const maxDay = new Date(year, month, 0).getDate();
      const actualDay = Math.min(day, maxDay);
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

      // The reference date is the 1st of the current month
      const refDate = format(new Date(year, now.getMonth(), 1), 'yyyy-MM-dd');

      const payload: Omit<Transaction, 'id'> = {
        type: 'expense',
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        date: refDate,
        dueDate,
        status: 'pending',
        isRecurring: true,
        recurringDay: day,
        paymentMethod: 'Boleto',
      };

      addTransaction(payload);

      toast({
        title: 'Conta Programada criada!',
        description: `"${form.description}" cadastrada. Vence todo dia ${day} e já aparece como pendente este mês.`,
      });

      setForm({ description: '', amount: '', category: '', recurringDay: '10' });
      onClose();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-amber-500" />
            Nova Conta Programada
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Contas fixas que se repetem todo mês (energia, aluguel, impostos...).
            Ao cadastrar, a conta já aparece como pendente no mês atual.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-description">Nome da Conta *</Label>
            <Input
              id="r-description"
              placeholder="Ex: Energia Elétrica, ISS, Aluguel Galpão"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-amount">Valor Estimado *</Label>
              <Input
                id="r-amount"
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={formatCurrency(form.amount)}
                onChange={handleAmountChange}
                className="font-bold text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-day">Dia de Vencimento *</Label>
              <Input
                id="r-day"
                type="number"
                min={1}
                max={31}
                placeholder="Ex: 10"
                value={form.recurringDay}
                onChange={e => set('recurringDay', e.target.value)}
                className="text-center font-bold text-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-category">Categoria *</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger id="r-category">
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <strong>Como funciona:</strong> Esta conta aparece automaticamente como pendente a cada mês.
            Para renová-la nos próximos meses, basta marcar a do mês atual como paga e uma nova entrada
            será gerada para o próximo mês ao clicar em "Renovar".
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl font-bold px-8 bg-amber-500 hover:bg-amber-400 text-white"
            >
              {isLoading ? 'Salvando...' : 'Cadastrar Conta Fixa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
