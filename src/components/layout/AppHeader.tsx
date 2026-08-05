import { cn } from '../../lib/cn'
import { LimelightDockNav } from '../ui/limelight-dock-nav'
import { FileText, BarChart3, Info } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export interface AppHeaderProps {
  className?: string
}

export function AppHeader({ className }: AppHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathMap: Record<string, string> = {
    '/setup': 'setup',
    '/report': 'report',
    '/about': 'about',
  }
  const activeId = pathMap[location.pathname] || 'setup'
  const handleNav = (_id: string, to: string) => {
    navigate(to)
  }

  return (
    <header className={cn('sticky top-0 z-40 bg-transparent border-b border-border backdrop-blur', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/setup" className="flex items-center gap-2">
              <img src="/logo.png" alt="CSS-300" className="h-8 w-8 rounded-md" />
              <span className="font-semibold text-text hidden sm:inline">CSS-300</span>
            </Link>
          </div>

          {/* Limelight Dock Nav */}
          <LimelightDockNav
            items={[
              { id: 'setup', label: 'Setup', icon: <FileText size={16} />, onClick: () => handleNav('setup', '/setup') },
              { id: 'report', label: 'Report', icon: <BarChart3 size={16} />, onClick: () => handleNav('report', '/report') },
              { id: 'about', label: 'About', icon: <Info size={16} />, onClick: () => handleNav('about', '/about') },
            ]}
            activeId={activeId}
          />
        </div>
      </div>
    </header>
  )
}
