import React from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'

export function BlockedBanner() {
  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-warning mb-2">Desktop App Required</h3>
          <p className="text-muted">
            Running benchmarks requires the CSS-300 desktop application. Your configuration is saved locally.
            Join the waitlist to get early access when we launch.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => window.open('https://css300.com/waitlist', '_blank')}
          className="shrink-0"
        >
          Join Waitlist
          <ExternalLink size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  )
}