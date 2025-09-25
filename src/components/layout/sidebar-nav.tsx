'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutGrid, PlusCircle, Users, Boxes, LogOut, ShoppingCart } from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { RegisterProjectModal } from '../modals/register-project-modal';
import { Button } from '../ui/button';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const menuItems = [
  { href: '/', label: 'Projetos', icon: LayoutGrid, adminOnly: false },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart, adminOnly: false },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, adminOnly: false },
  { href: '/team', label: 'Equipe', icon: Users, adminOnly: true },
  { href: '/stock', label: 'Estoque', icon: Boxes, adminOnly: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();

  const isAdmin = user?.email === 'carlos.campigotto@gmail.com';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin).sort((a, b) => {
    const order = ['Projetos', 'Compras', 'Estoque', 'Relatórios', 'Equipe'];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center justify-center gap-2 w-full">
          <Logo className="h-14 w-auto" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-base">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='mt-auto'>
         <SidebarSeparator />
         <div className="p-2 space-y-2">
           <Button
            onClick={() => setProjectModalOpen(true)}
            variant="default"
            className="w-full justify-start [&>span]:flex-1"
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-base text-center">Novo Projeto</span>
          </Button>
           <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start [&>span]:flex-1"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-base text-center">Sair</span>
          </Button>
         </div>
      </SidebarFooter>

      <RegisterProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </>
  );
}
