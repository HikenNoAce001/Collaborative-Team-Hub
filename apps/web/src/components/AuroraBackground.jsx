/**
 * Pure-CSS animated background. Three blurred gradient blobs drift across
 * the viewport. Server component — zero JS, no hooks. Theme-aware via the
 * `.dark` class set on <html> by next-themes.
 *
 * @param {{ variant?: 'default' | 'app' }} props
 *   `default` — blue/cyan/emerald (landing + auth)
 *   `app`     — violet/fuchsia/amber (post-login pages)
 */
export default function AuroraBackground({ variant = 'default' }) {
  return (
    <div aria-hidden className={`aurora-root aurora-${variant}`}>
      <div className="aurora-blob b1" />
      <div className="aurora-blob b2" />
      <div className="aurora-blob b3" />
    </div>
  );
}
