import { useEffect } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Kanban, Users, LogOut, Loader2, Settings, ListIcon, Blocks } from 'lucide-react'

export default function Layout() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      navigate('/login')
    }
  }, [user, loading, navigate, location])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user && location.pathname === '/login') {
    return <Outlet />
  }

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-slate-200/60 dark:border-zinc-800">
        <SidebarHeader className="border-b border-slate-200/60 dark:border-zinc-800 px-6 py-5">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100">
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <Blocks className="h-5 w-5" />
            </div>
            ManySkip
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-3">
              Menu Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/'}
                    className="rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-zinc-800 data-[active=true]:bg-primary/5 data-[active=true]:text-primary data-[active=true]:font-medium px-3 py-2.5 h-auto"
                  >
                    <Link to="/">
                      <Kanban className="h-5 w-5 opacity-70" />
                      <span className="text-[15px]">Kanban</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/contatos'}
                    className="rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-zinc-800 data-[active=true]:bg-primary/5 data-[active=true]:text-primary data-[active=true]:font-medium px-3 py-2.5 h-auto"
                  >
                    <Link to="/contatos">
                      <Users className="h-5 w-5 opacity-70" />
                      <span className="text-[15px]">Atendimentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/logs'}
                    className="rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-zinc-800 data-[active=true]:bg-primary/5 data-[active=true]:text-primary data-[active=true]:font-medium px-3 py-2.5 h-auto"
                  >
                    <Link to="/logs">
                      <ListIcon className="h-5 w-5 opacity-70" />
                      <span className="text-[15px]">Logs Webhook</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="my-4 border-t border-slate-200/60 dark:border-zinc-800 mx-3"></div>

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-3">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    disabled
                    className="rounded-lg px-3 py-2.5 h-auto opacity-50"
                  >
                    <Link to="#">
                      <Settings className="h-5 w-5" />
                      <span className="text-[15px]">Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-200/60 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 rounded-lg p-3 border border-slate-200/60 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col truncate pr-2">
              <span className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">
                {user.email}
              </span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                Administrador
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sair"
              className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-slate-50/50 dark:bg-zinc-950">
        <header className="flex h-16 items-center gap-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] sticky top-0 z-10">
          <SidebarTrigger className="text-slate-500 hover:text-slate-900" />
          <div className="flex-1">
            <h1 className="font-semibold text-lg tracking-tight text-slate-800 dark:text-slate-100">
              {location.pathname === '/'
                ? 'Kanban'
                : location.pathname === '/contatos'
                  ? 'Gestão de Atendimentos'
                  : location.pathname === '/logs'
                    ? 'Monitoramento de Logs'
                    : 'Sistema'}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto flex flex-col">
          <div
            className={
              location.pathname === '/'
                ? 'w-full flex-1 flex flex-col'
                : location.pathname === '/contatos'
                  ? 'w-full mx-auto p-6 md:p-8'
                  : 'max-w-7xl mx-auto p-6 md:p-8'
            }
          >
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
