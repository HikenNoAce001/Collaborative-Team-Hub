/**
 * Stub for feature pages whose implementation is the next agent's task.
 * Renders a clear "coming soon" card with the acceptance criteria from
 * requirements.md so the next agent has the spec inline.
 *
 * @param {{ title: string, description: string, criteria: string[], endpoints?: string[] }} props
 */
export default function Placeholder({ title, description, criteria, endpoints }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-6 rounded-lg border border-dashed bg-muted/30 p-6">
        <p className="text-sm font-medium">Coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The backend endpoints are live; this page renders the UI on top.
        </p>

        {endpoints && endpoints.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API
            </p>
            <ul className="mt-1 space-y-1 font-mono text-xs">
              {endpoints.map((e) => (
                <li key={e} className="text-muted-foreground">{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Acceptance
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
