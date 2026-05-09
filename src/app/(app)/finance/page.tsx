
'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Transaction } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PlusCircle, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, CalendarClock,
  MoreHorizontal, Receipt, CheckCircle, Trash2, Search, RefreshCw, Copy, Check,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RegisterTransactionModal } from '@/components/modals/register-transaction-modal';
import { RegisterRecurringModal } from '@/components/modals/register-recurring-modal';
import { ReceiptModal } from '@/components/modals/receipt-modal';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function safeDate(dateStr: string | undefined) {
  if (!dateStr) return null;
  try { const d = parseISO(dateStr); return isValid(d) ? d : null; } catch { return null; }
}

function DateCell({ t }: { t: Transaction }) {
  const payDate = t.status === 'completed' && t.paymentDate ? safeDate(t.paymentDate) : null;
  const dueDate = t.dueDate ? safeDate(t.dueDate) : null;
  const refDate = safeDate(t.date);

  if (payDate) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-emerald-600 font-bold text-sm">{format(payDate, 'dd MMM yyyy', { locale: ptBR })}</span>
      {dueDate && <span className="text-slate-400 text-xs">Venc: {format(dueDate, 'dd/MM')}</span>}
    </div>
  );
  if (dueDate) return <span className="text-amber-600 font-bold text-sm">{format(dueDate, 'dd MMM yyyy', { locale: ptBR })}</span>;
  if (refDate) return <span className="text-slate-500 text-sm">{format(refDate, 'dd MMM yyyy', { locale: ptBR })}</span>;
  return <span className="text-slate-400 text-sm">—</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </Button>
  );
}

export default function FinancePage() {
  const { user } = useUser();
  const { transactions, isLoading, teamMembers, deleteTransaction, updateTransaction, addTransaction } = useContext(AppContext);

  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState<'income' | 'expense' | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(m => m.id === user.uid);
  }, [user, teamMembers]);

  const isAdmin = loggedInMember?.role === 'Administrativo';

  const allTx = useMemo(() => transactions || [], [transactions]);

  const periodTx = useMemo(() =>
    allTx.filter(t => !dateFilter || (t.date && t.date.startsWith(dateFilter))),
    [allTx, dateFilter]
  );

  const summary = useMemo(() => {
    const income = periodTx.filter(t => t.type === 'income' && t.status === 'completed').reduce((a, t) => a + t.amount, 0);
    const expense = periodTx.filter(t => t.type === 'expense' && t.status === 'completed' && !t.isRecurring).reduce((a, t) => a + t.amount, 0);
    const recurringPaid = periodTx.filter(t => t.isRecurring && t.status === 'completed').reduce((a, t) => a + t.amount, 0);
    const pendingIn = periodTx.filter(t => t.type === 'income' && t.status === 'pending').reduce((a, t) => a + t.amount, 0);
    const pendingOut = periodTx.filter(t => t.type === 'expense' && t.status === 'pending').reduce((a, t) => a + t.amount, 0);
    return { income, expense: expense + recurringPaid, balance: income - expense - recurringPaid, pendingIn, pendingOut };
  }, [periodTx]);

  const filtered = (type: 'income' | 'expense' | 'recurring') =>
    periodTx.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      if (type === 'recurring') return matchSearch && !!t.isRecurring;
      if (type === 'income') return matchSearch && t.type === 'income' && !t.isRecurring;
      return matchSearch && t.type === 'expense' && !t.isRecurring;
    });

  const handleRenewRecurring = (t: Transaction) => {
    const now = new Date();
    const nextMonth = now.getMonth() + 1 === 12 ? 0 : now.getMonth() + 1;
    const nextYear = nextMonth === 0 ? now.getFullYear() + 1 : now.getFullYear();
    const day = t.recurringDay || 10;
    const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate();
    const actualDay = Math.min(day, maxDay);
    const dueDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
    const refDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;
    addTransaction({ ...t, id: undefined as any, date: refDate, dueDate, paymentDate: undefined, status: 'pending' });
  };

  if (isLoading || (user && !loggedInMember)) {
    return <div className="flex h-full w-full items-center justify-center"><p>Carregando financeiro...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="p-6 bg-rose-50 rounded-full"><Wallet className="h-12 w-12 text-rose-500" /></div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 text-center max-w-md">Você não tem permissão para visualizar as informações financeiras.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader title="Gestão Financeira" description="Controle de entradas, saídas e contas programadas da Torino Ambientes." />
        <Input type="month" className="w-full md:w-40 bg-white border-slate-200" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Entradas', value: summary.income, color: 'emerald', icon: TrendingUp, sub: `+ ${fmt(summary.pendingIn)} a receber` },
          { label: 'Total Saídas', value: summary.expense, color: 'rose', icon: TrendingDown, sub: `+ ${fmt(summary.pendingOut)} pendente` },
          { label: 'Saldo do Mês', value: summary.balance, color: summary.balance >= 0 ? 'blue' : 'rose', icon: DollarSign, sub: 'Entradas − Saídas confirmadas' },
          { label: 'Contas Pendentes', value: summary.pendingOut, color: 'amber', icon: CalendarClock, sub: 'A pagar este mês' },
        ].map(c => (
          <Card key={c.label} className={`bg-white/50 border-${c.color}-100 overflow-hidden relative group hover:shadow-md transition-all`}>
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <c.icon className={`h-16 w-16 text-${c.color}-600`} />
            </div>
            <CardHeader className="pb-1">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">{c.label}</CardDescription>
              <CardTitle className={`text-2xl font-black text-${c.color}-700`}>{fmt(c.value)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{c.sub}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Card className="bg-white/70 backdrop-blur-md shadow-xl border-slate-100 rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Movimentações Financeiras</CardTitle>
              <CardDescription>Gerencie entradas, saídas e contas fixas do mês.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." className="pl-10 bg-white border-slate-200" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="income">
            <div className="px-6 pt-4 pb-0 border-b flex items-center justify-between gap-4 flex-wrap">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="income" className="gap-1.5"><ArrowUpCircle className="h-4 w-4 text-emerald-500" />Entradas</TabsTrigger>
                <TabsTrigger value="expense" className="gap-1.5"><ArrowDownCircle className="h-4 w-4 text-rose-500" />Saídas</TabsTrigger>
                <TabsTrigger value="recurring" className="gap-1.5"><CalendarClock className="h-4 w-4 text-amber-500" />Contas Fixas</TabsTrigger>
              </TabsList>
              <div className="flex gap-2 pb-1">
                <TabsContent value="income" className="m-0 data-[state=active]:flex">
                  <Button size="sm" onClick={() => setModalType('income')} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
                    <PlusCircle className="h-4 w-4" /> Nova Entrada
                  </Button>
                </TabsContent>
                <TabsContent value="expense" className="m-0 data-[state=active]:flex">
                  <Button size="sm" onClick={() => setModalType('expense')} className="bg-rose-600 hover:bg-rose-500 gap-1.5">
                    <PlusCircle className="h-4 w-4" /> Nova Saída
                  </Button>
                </TabsContent>
                <TabsContent value="recurring" className="m-0 data-[state=active]:flex">
                  <Button size="sm" onClick={() => setShowRecurringModal(true)} className="bg-amber-500 hover:bg-amber-400 gap-1.5">
                    <PlusCircle className="h-4 w-4" /> Nova Conta Fixa
                  </Button>
                </TabsContent>
              </div>
            </div>

            {/* INCOME TAB */}
            <TabsContent value="income" className="m-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered('income').length > 0 ? filtered('income').map(t => (
                    <TableRow key={t.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell><DateCell t={t} /></TableCell>
                      <TableCell className="text-sm text-slate-600">{t.clientName || <span className="text-slate-300 italic">—</span>}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{t.description}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-white text-xs">{t.category}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-500">{t.paymentMethod || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(t.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-400 text-white hover:bg-amber-500')}>
                          {t.status === 'completed' ? 'Recebido' : 'A Receber'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-600">+ {fmt(t.amount)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-44">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {t.status === 'pending' && (
                              <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer" onClick={() => updateTransaction(t.id, { status: 'completed', paymentDate: new Date().toISOString().split('T')[0] })}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Recebimento
                              </DropdownMenuItem>
                            )}
                            {t.status === 'completed' && (
                              <DropdownMenuItem className="text-blue-600 font-medium cursor-pointer" onClick={() => setReceiptTx(t)}>
                                <Receipt className="mr-2 h-4 w-4" /> Gerar Recibo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => setToDelete(t)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhuma entrada registrada neste período.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* EXPENSE TAB */}
            <TabsContent value="expense" className="m-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>PIX / Código</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered('expense').length > 0 ? filtered('expense').map(t => (
                    <TableRow key={t.id} className="hover:bg-rose-50/30 transition-colors">
                      <TableCell><DateCell t={t} /></TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{t.description}</div>
                        {t.relatedProjectId && <div className="text-xs text-slate-400 mt-0.5">Projeto vinculado</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="bg-white text-xs">{t.category}</Badge></TableCell>
                      <TableCell>
                        {t.barcode ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-slate-500 max-w-[100px] truncate">{t.barcode}</span>
                            <CopyButton text={t.barcode} />
                          </div>
                        ) : <span className="text-slate-300 italic text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(t.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-400 text-white hover:bg-rose-500')}>
                          {t.status === 'completed' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-600">- {fmt(t.amount)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-44">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {t.status === 'pending' && (
                              <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer" onClick={() => updateTransaction(t.id, { status: 'completed', paymentDate: new Date().toISOString().split('T')[0] })}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => setToDelete(t)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma saída registrada neste período.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* RECURRING TAB */}
            <TabsContent value="recurring" className="m-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Dia fixo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered('recurring').length > 0 ? filtered('recurring').map(t => (
                    <TableRow key={t.id} className="hover:bg-amber-50/30 transition-colors">
                      <TableCell><DateCell t={t} /></TableCell>
                      <TableCell className="font-semibold text-slate-800">{t.description}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-white text-xs">{t.category}</Badge></TableCell>
                      <TableCell>
                        {t.recurringDay ? (
                          <span className="text-sm font-bold text-amber-600">Todo dia {t.recurringDay}</span>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(t.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-400 text-white hover:bg-amber-500')}>
                          {t.status === 'completed' ? 'Pago ✓' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-700">{fmt(t.amount)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-52">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {t.status === 'pending' && (
                              <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer" onClick={() => updateTransaction(t.id, { status: 'completed', paymentDate: new Date().toISOString().split('T')[0] })}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pago
                              </DropdownMenuItem>
                            )}
                            {t.status === 'completed' && (
                              <DropdownMenuItem className="text-amber-600 font-medium cursor-pointer" onClick={() => handleRenewRecurring(t)}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Renovar para Próx. Mês
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => setToDelete(t)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <CalendarClock className="h-8 w-8 opacity-30" />
                          <p>Nenhuma conta fixa registrada neste período.</p>
                          <Button size="sm" variant="outline" onClick={() => setShowRecurringModal(true)} className="mt-1 gap-1.5">
                            <PlusCircle className="h-3.5 w-3.5" /> Cadastrar Conta Fixa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <RegisterTransactionModal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        defaultType={modalType || 'income'}
      />

      <RegisterRecurringModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
      />

      <ReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />

      <AlertDialog open={!!toDelete} onOpenChange={open => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente <strong>{toDelete?.description}</strong> ({toDelete ? fmt(toDelete.amount) : ''}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => { if (toDelete) { deleteTransaction(toDelete.id); setToDelete(null); } }}>
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
