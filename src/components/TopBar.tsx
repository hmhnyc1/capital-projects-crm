'use client'

import { Search, Bell } from 'lucide-react'
import SignOutButton from './SignOutButton'

interface TopBarProps {
  displayName: string
  initials: string
}

export default function TopBar({ displayName, initials }: TopBarProps) {
  return (
    <header className="bg-bg-secondary border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
      {/* Left: Logo/Brand */}
      <div className="text-text-primary font-bold text-sm hidden sm:block">
        MCA Platform
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent-primary transition-smooth"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none hidden sm:block">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & User */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-smooth text-text-secondary hover:text-text-primary">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <span className="text-sm text-text-primary font-medium hidden sm:block">{displayName}</span>
        </div>

        <div className="h-5 w-px bg-border" />
        <SignOutButton />
      </div>
    </header>
  )
}
