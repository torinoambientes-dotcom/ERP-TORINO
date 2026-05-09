
'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  PlusCircle, 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Building2, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Tag,
  RotateCcw,
  Trash2,
  Pencil
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisterInvoiceModal } from '@/components/modals/register-invoice-modal';
import { RegisterSupplierModal } from '@/components/modals/register-supplier-modal';
import { cn } from '@/lib/utils';
import type { Supplier } from '@/lib/types';

export default function InvoicesPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('invoices');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM'));

  const { invoices, suppliers, teamMembers, isLoading, updateInvoice, deleteInvoice, addTransaction } = useContext(AppContext);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const isAdmin = loggedInMember?.role === 'Administrativo';

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      const search = searchTerm.toLowerCase();
      const supplierName = inv.supplierName || '';
      const number = inv.number || '';
      const category = inv.category || '';
      
      const matchesSearch = (
        supplierName.toLowerCase().includes(search) ||
        number.toLowerCase().includes(search) ||
        category.toLowerCase().includes(search)
      );

      const matchesSupplier = selectedSupplier === 'all' || inv.supplierId === selectedSupplier;
      const matchesDate = !dateFilter || (inv.date && inv.date.startsWith(dateFilter));

      return matchesSearch && matchesSupplier && matchesDate;
    });
  }, [invoices, searchTerm, selectedSupplier, dateFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [filteredInvoices]);

  const filteredSuppliers = useMemo(() => {
    return (suppliers || []).filter(sup => {
      const search = searchTerm.toLowerCase();
      const name = sup.name || '';
      const document = sup.document || '';
      const category = sup.category || '';

      return (
        name.toLowerCase().includes(search) ||
        document.toLowerCase().includes(search) ||
        category.toLowerCase().includes(search)
      );
    });
  }, [suppliers, searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading || (user && !loggedInMember)) {
    return <div className="flex h-full w-full items-center justify-center"><p>Carregando dados...</p></div>;
  }

  // Acesso liberado para todos os usuários autenticados


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

      <Tabs defaultValue="invoices" onValueChange={setActiveTab} className="w-full">
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
                    ? 'Visualize todas as notas fiscais lançadas no sistema.' 
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
                      <span className="text-sm font-black text-slate-800">{formatCurrency(totalFilteredAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <TabsContent value="invoices" className="m-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
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
                      <TableRow key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-medium text-slate-500">
                          {inv.date ? (
                            (() => {
                              try {
                                return format(parseISO(inv.date), 'dd/MM/yyyy', { locale: ptBR });
                              } catch (e) {
                                return inv.date;
                              }
                            })()
                          ) : '---'}
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
                          {formatCurrency(inv.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {inv.status === 'pending' ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] h-8 font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => {
                                  updateInvoice(inv.id, { status: 'paid' });
                                  addTransaction({
                                    type: 'expense',
                                    description: `NF ${inv.number || ''} - ${inv.supplierName}`.trim(),
                                    category: inv.category || 'Nota Fiscal',
                                    amount: inv.amount,
                                    date: new Date().toISOString().split('T')[0],
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    status: 'completed',
                                    paymentMethod: 'Boleto',
                                  });
                                }}
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
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Nota Fiscal?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Você está prestes a excluir a NF{inv.number ? ` nº ${inv.number}` : ''} de <strong>{inv.supplierName}</strong> no valor de <strong>{formatCurrency(inv.amount)}</strong>. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                    onClick={() => deleteInvoice(inv.id)}
                                  >
                                    Sim, excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
    </div>
  );
}
