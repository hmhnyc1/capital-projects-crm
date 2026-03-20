'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LayoutDashboard, Briefcase, Activity, BarChart3, CreditCard, FileText, Store, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { href: '/contacts', label: 'Merchants', icon: Store },
  { href: '/deals', label: 'Deals', icon: Briefcase },
  { href: '/upload-deal', label: 'Upload Deal', icon: Upload },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/bank-statements', label: 'Bank Statements', icon: FileText },
  { href: '/activities', label: 'Activities', icon: Activity },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored) {
      setIsCollapsed(JSON.parse(stored))
    }
  }, [])

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
    }
  }, [isCollapsed, isMounted])

  const sidebarWidth = isCollapsed ? 64 : 240

  return (
    <aside
      className="bg-bg-secondary border-r border-border flex flex-col flex-shrink-0 transition-smooth overflow-hidden"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Brand Header */}
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="bg-accent-primary p-2 rounded-lg flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-text-primary font-bold text-xs leading-tight">Capital</p>
              <p className="text-text-muted text-xs">Platform</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="bg-accent-primary p-2 rounded-lg flex-shrink-0 mx-auto">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth group',
                isActive
                  ? 'bg-accent-primary bg-opacity-10 text-accent-primary border-l-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 py-3 border-t border-border flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-bg-tertiary transition-smooth text-text-secondary hover:text-text-primary"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-border">
          <p className="text-xs text-text-muted text-center">v2.0.0</p>
        </div>
      )}
    </aside>
  )
}
