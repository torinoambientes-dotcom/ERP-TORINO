
'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, PlusCircle, Users, Search, MoreHorizontal, Building2,
  RotateCcw, Trash2, Pencil, CheckCircle, CreditCard,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RegisterInvoiceModal } from '@/components/modals/register-invoice-modal';
import { RegisterSupplierModal } from '@/components/modals/register-supplier-modal';
import { cn } from '@/lib/utils';
import type { Supplier, Invoice } from '@/lib/types';

const PAYMENT_METHODS = ['Pix', 'Transferência Bancária', 'Dinheiro', 'Boleto', 'Cartão de Débito', 'Cartão de Crédito', 'Crédito em Loja'];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function InvoicesPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('invoices');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Payment dialog
  const [payDialog, setPayDialog] = useState<{ invoices: Invoice[] } | null>(null);
  const [payMethod, setPayMethod] = useState('Boleto');
  const [selectedCreditId, setSelectedCreditId] = useState('');

  const { invoices, suppliers, storeCredits, teamMembers, isLoading, updateInvoice, deleteInvoice, updateTransaction, updateStoreCredit } = useContext(AppContext);

  const activeCredits = useMemo(() => (storeCredits || []).filter(c => c.status === 'active' && c.amount - c.usedAmount > 0), [storeCredits]);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        (inv.supplierName || '').toLowerCase().includes(search) ||
        (inv.number || '').toLowerCase().includes(search) ||
        (inv.category || '').toLowerCase().includes(search)
      );
      const matchesSupplier = selectedSupplier === 'all' || inv.supplierId === selectedSupplier;
      const matchesDate = !dateFilter || (inv.date && inv.date.startsWith(dateFilter));
      return matchesSearch && matchesSupplier && matchesDate;
    });
  }, [invoices, searchTerm, selectedSupplier, dateFilter]);

  const pendingInvoices = useMemo(() => filteredInvoices.filter(i => i.status === 'pending'), [filteredInvoices]);

  const totalFilteredAmount = useMemo(() =>
    filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    [filteredInvoices]
  );

  const filteredSuppliers = useMemo(() => {
    return (suppliers || []).filter(sup => {
      const search = searchTerm.toLowerCase();
      return (
        (sup.name || '').toLowerCase().includes(search) ||
        (sup.document || '').toLowerCase().includes(search) ||
        (sup.category || '').toLowerCase().includes(search)
      );
    });
  }, [suppliers, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pendingInvoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingInvoices.map(i => i.id)));
    }
  };

  const handleDarBaixa = (invs: Invoice[]) => {
    setPayDialog({ invoices: invs });
    setPayMethod('Boleto');
    setSelectedCreditId('');
  };

  const confirmPayment = () => {
    if (!payDialog) return;
    const today = new Date().toISOString().split('T')[0];

    // If using store credit, deduct from selected credit
    if (payMethod === 'Crédito em Loja' && selectedCreditId) {
      const credit = (storeCredits || []).find(c => c.id === selectedCreditId);
      if (credit) {
        const totalToPay = payDialog.invoices.reduce((s, i) => s + i.amount, 0);
        const newUsed = Math.min(credit.usedAmount + totalToPay, credit.amount);
        const newStatus = newUsed >= credit.amount ? 'used' as const : 'active' as const;
        updateStoreCredit(credit.id, { usedAmount: newUsed, status: newStatus });
      }
    }

    for (const inv of payDialog.invoices) {
      updateInvoice(inv.id, { status: 'paid' });
      if (inv.relatedTransactionId) {
        updateTransaction(inv.relatedTransactionId, {
          status: 'completed',
          paymentDate: today,
          paymentMethod: payMethod,
        });
      }
    }
    setSelected(new Set());
    setPayDialog(null);
  };

  if (isLoading || (user && !loggedInMember)) {
    return <div className="flex h-full w-full items-center justify-center"><p>Carregando dados...</p></div>;
  }

  const selectedInvoices = pendingInvoices.filter(i => selected.has(i.id));
  const selectedTotal = selectedInvoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Notas Fiscais e Fornecedores"
          description="Gestão de entradas fiscais e cadastro de fornecedores parceiros."
        />
        <div className="flex gap-2">
          {activeTab === 'invoices' ? (
            <Button onClick={() => setInvoiceModalOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Nova Nota Fiscal
            </Button>
          ) : (
            <Button onClick={() => setSupplierModalOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="invoices" onValueChange={v => { setActiveTab(v); setSelected(new Set()); }} className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-6">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" /> Notas Fiscais
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Users className="h-4 w-4" /> Fornecedores
          </TabsTrigger>
        </TabsList>

        <Card className="bg-white/70 backdrop-blur-md shadow-xl border-slate-100 rounded-[2rem] overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle>{activeTab === 'invoices' ? 'Registro de Notas' : 'Base de Fornecedores'}</CardTitle>
                <CardDescription>
                  {activeTab === 'invoices'
                    ? 'Ao cadastrar uma nota, ela aparece automaticamente nas Saídas do financeiro como pendente.'
                    : 'Gerencie os dados de contato e categorias dos seus fornecedores.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    className="pl-10 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {activeTab === 'invoices' && (
                  <>
                    <select
                      className="h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                    >
                      <option value="all">Todos Fornecedores</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <Input
                      type="month"
                      className="w-full md:w-40 bg-white border-slate-200"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                    <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Filtrado</span>
                      <span className="text-sm font-black text-slate-800">{fmt(totalFilteredAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <TabsContent value="invoices" className="m-0">
            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-emerald-800">
                  {selected.size} nota{selected.size > 1 ? 's' : ''} selecionada{selected.size > 1 ? 's' : ''} — Total: <strong>{fmt(selectedTotal)}</strong>
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="text-xs">
                    Limpar Seleção
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDarBaixa(selectedInvoices)}
                    className="bg-emerald-600 hover:bg-emerald-500 gap-1.5 text-xs font-bold"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Dar Baixa em {selected.size} nota{selected.size > 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-10 pl-6">
                      <Checkbox
                        checked={pendingInvoices.length > 0 && selected.size === pendingInvoices.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todas"
                      />
                    </TableHead>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className={cn('hover:bg-slate-50/80 transition-colors', selected.has(inv.id) && 'bg-emerald-50/50')}>
                        <TableCell className="pl-6">
                          {inv.status === 'pending' && (
                            <Checkbox
                              checked={selected.has(inv.id)}
                              onCheckedChange={() => toggleSelect(inv.id)}
                              aria-label={`Selecionar ${inv.number}`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-500">
                          {inv.date ? (() => { try { return format(parseISO(inv.date), 'dd/MM/yyyy', { locale: ptBR }); } catch { return inv.date; } })() : '---'}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700">
                          {inv.number || '---'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{inv.supplierName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white">
                            {inv.category || 'Geral'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-bold",
                              inv.status === 'paid'
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            )}
                          >
                            {inv.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-800">
                          {fmt(inv.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {inv.status === 'pending' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] h-8 font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleDarBaixa([inv])}
                              >
                                Dar Baixa
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] h-8 font-bold border-rose-200 text-rose-500 hover:bg-rose-50 gap-1"
                                onClick={() => updateInvoice(inv.id, { status: 'pending' })}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Desfazer
                              </Button>
                            )}
                            <AlertDialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => deleteInvoice(inv.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        Nenhuma nota fiscal encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>

          <TabsContent value="suppliers" className="m-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Nome / Razão Social</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((sup) => (
                      <TableRow key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <div className="font-bold text-slate-800">{sup.name}</div>
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium">
                          {sup.document || '---'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">
                            {sup.category || 'Geral'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium text-slate-600">{sup.phone || 'Sem tel'}</p>
                            <p className="text-slate-400">{sup.email || 'Sem e-mail'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setEditingSupplier(sup);
                              setSupplierModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Nenhum fornecedor cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>

      <RegisterInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />

      <RegisterSupplierModal
        isOpen={isSupplierModalOpen}
        supplier={editingSupplier}
        onClose={() => {
          setSupplierModalOpen(false);
          setEditingSupplier(undefined);
        }}
      />

      {/* Payment method dialog */}
      <Dialog open={payDialog !== null} onOpenChange={open => { if (!open) setPayDialog(null); }}>
        <DialogContent className="sm:max-w-[420px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              Dar Baixa {payDialog && payDialog.invoices.length > 1 ? `em ${payDialog.invoices.length} Notas` : 'na Nota'}
            </DialogTitle>
          </DialogHeader>

          {payDialog && (
            <div className="space-y-4 pt-2">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {payDialog.invoices.length === 1 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">NF {payDialog.invoices[0].number} — {payDialog.invoices[0].supplierName}</p>
                    <p className="text-2xl font-black text-slate-800">{fmt(payDialog.invoices[0].amount)}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">{payDialog.invoices.length} notas fiscais selecionadas</p>
                    <p className="text-2xl font-black text-slate-800">
                      {fmt(payDialog.invoices.reduce((s, i) => s + i.amount, 0))}
                    </p>
                    <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                      {payDialog.invoices.map(i => (
                        <p key={i.id} className="text-xs text-slate-400">
                          NF {i.number || '—'} · {i.supplierName} · {fmt(i.amount)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {payMethod === 'Crédito em Loja' && (
                <div className="space-y-2">
                  <Label>Selecionar Crédito em Loja</Label>
                  {activeCredits.length > 0 ? (
                    <>
                      <Select value={selectedCreditId || 'none'} onValueChange={v => setSelectedCreditId(v === 'none' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o crédito..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione...</SelectItem>
                          {activeCredits.map(c => {
                            const remaining = c.amount - c.usedAmount;
                            return (
                              <SelectItem key={c.id} value={c.id}>
                                {c.supplierName} — Saldo: {fmt(remaining)} (Cliente: {c.clientName})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedCreditId && (() => {
                        const cr = activeCredits.find(c => c.id === selectedCreditId);
                        if (!cr) return null;
                        const remaining = cr.amount - cr.usedAmount;
                        const payTotal = payDialog ? payDialog.invoices.reduce((s, i) => s + i.amount, 0) : 0;
                        const afterPay = remaining - payTotal;
                        return (
                          <div className={cn('rounded-xl p-3 text-sm border', afterPay >= 0 ? 'bg-violet-50 border-violet-200 text-violet-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>
                            <p>Saldo atual: <strong>{fmt(remaining)}</strong></p>
                            <p>Valor a debitar: <strong>{fmt(payTotal)}</strong></p>
                            <p className="font-bold">Saldo após pagamento: {fmt(Math.max(afterPay, 0))}</p>
                            {afterPay < 0 && <p className="text-rose-600 font-bold mt-1">⚠ O crédito não cobre o valor total. A diferença de {fmt(Math.abs(afterPay))} ficará como excedente.</p>}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                      Nenhum crédito em loja ativo. Cadastre um crédito na aba "Créditos em Loja" do Financeiro.
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setPayDialog(null)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={confirmPayment}
                  className="rounded-xl font-bold px-8 bg-emerald-600 hover:bg-emerald-500"
                >
                  Confirmar Pagamento
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
