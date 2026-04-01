'use client'

const PLANS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    current: true,
    features: ['1 agent', '100k KB tokens', '10,000 requests/mo'],
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/mo',
    current: false,
    features: [
      '5 agents',
      '500k KB tokens',
      '100,000 requests/mo',
      'Dedicated GPU option',
    ],
  },
  {
    name: 'Business',
    price: '$799',
    period: '/mo',
    current: false,
    features: [
      '20 agents',
      '2M KB tokens',
      'Unlimited requests',
      'Dedicated GPU cluster',
      'Priority support',
    ],
  },
]

const USAGE = [
  { label: 'Requests this month', current: 3500, max: 10000 },
  { label: 'KB Tokens', current: 62000, max: 100000 },
  { label: 'Agents', current: 1, max: 1 },
]

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground">
          Qualtron CacheLLM plan, current usage, and upgrade options.
        </p>
      </div>

      {/* Current Usage */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Current Usage</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {USAGE.map((u) => {
            const pct = Math.min((u.current / u.max) * 100, 100)
            return (
              <div
                key={u.label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {u.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {u.current.toLocaleString()} / {u.max.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 90
                        ? 'bg-destructive'
                        : pct > 70
                          ? 'bg-warning'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {Math.round(pct)}%
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-5 ${
                plan.current
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-card-foreground">
                  {plan.name}
                </h3>
                <div className="mt-1">
                  <span className="text-3xl font-bold text-card-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
              </div>
              <ul className="mb-4 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.current}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium ${
                  plan.current
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History placeholder */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Invoice History</h2>
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Connect Stripe to view invoice history.
        </div>
      </div>
    </div>
  )
}
