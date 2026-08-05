import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { EngineProvider } from './hooks/useEngine'
import { ToastProvider } from './hooks/useToast'
import { initTheme } from './storage/theme'
import { ToastContainer } from './components/ui/Toast'
import { Spinner } from './components/ui/Spinner'
import { AppShell } from './components/layout/AppShell'
import { AppHeader } from './components/layout/AppHeader'

// Lazy load pages
const SetupPage = React.lazy(() => import('./pages/Setup').then(m => ({ default: m.SetupPage })))
const ReportPage = React.lazy(() => import('./pages/Report'))
const AboutPage = React.lazy(() => import('./pages/About').then(m => ({ default: m.AboutPage })))
const RunningPage = React.lazy(() => import('./pages/Running').then(m => ({ default: m.RunningPage })))
const NotFoundPage = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFoundPage })))

// Initialize theme on load
initTheme()

/** Shell-less fallback — used for routes rendered outside AppShell. */
function LoadingFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <Spinner size="lg" />
    </div>
  )
}

/** In-shell fallback — renders inside <main>, so it must not claim the viewport. */
function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
    </div>
  )
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/**
 * Suspense must live INSIDE this wrapper, not above AnimatePresence: with it
 * outside, navigating to an unresolved lazy chunk swaps the whole subtree for
 * the fallback and the exiting page is discarded mid-animation.
 */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </motion.div>
  )
}

function ShellRoutes() {
  const location = useLocation()
  return (
    <AppShell header={<AppHeader />}>
      <AnimatePresence mode="wait" initial={false}>
        {/* `location` and `key` are both load-bearing: the key makes the
            outgoing tree a distinct holdable child, the location prop stops it
            re-matching the new URL while it exits. */}
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<Page><SetupPage /></Page>} />
          <Route path="/report" element={<Page><ReportPage /></Page>} />
          <Route path="/about" element={<Page><AboutPage /></Page>} />
          <Route path="/running" element={<Page><RunningPage /></Page>} />
        </Routes>
      </AnimatePresence>
    </AppShell>
  )
}

const SHELL_PATHS = ['/', '/setup', '/report', '/about', '/running']

function AppRoutes() {
  const location = useLocation()

  if (!SHELL_PATHS.includes(location.pathname)) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    )
  }

  return <ShellRoutes />
}

export function App() {
  return (
    <ToastProvider>
      <EngineProvider>
        {/* Single source of truth for reduced motion: framer-motion writes
            inline transforms from JS, so the CSS @media block in index.css
            cannot reach any motion component. */}
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <AppRoutes />
            <ToastContainer />
          </BrowserRouter>
        </MotionConfig>
      </EngineProvider>
    </ToastProvider>
  )
}
