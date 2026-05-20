import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,   // silently disabled in local dev if DSN not set
  environment: import.meta.env.MODE,              // "production" on Vercel, "development" locally

  // Capture 100% of errors; sample 10% of performance traces to keep quota low
  tracesSampleRate: 0.1,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Record 0% of normal sessions; 100% of sessions that hit an error
      sessionSampleRate: 0,
      errorSampleRate: 1.0,
      // Never capture passwords or sensitive fields
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],
})

// Fallback UI shown when the entire app crashes
function AppCrashFallback({ error }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">
          We've been notified and are looking into it. Please refresh the page to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl py-2.5 text-sm font-medium transition-colors mb-3"
        >
          Refresh page
        </button>
        {import.meta.env.DEV && (
          <pre className="mt-4 text-left text-xs text-red-600 bg-red-50 rounded-lg p-3 overflow-auto max-h-40">
            {error?.stack ?? error?.message}
          </pre>
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={AppCrashFallback} showDialog={false}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
