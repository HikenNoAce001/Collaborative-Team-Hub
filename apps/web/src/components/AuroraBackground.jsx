/**
 * Pure-CSS animated background. Three blurred gradient blobs drift across
 * the viewport. Server component — zero JS, no hooks. Theme-aware via the
 * `.dark` class set on <html> by next-themes.
 */
export default function AuroraBackground() {
  return (
    <div aria-hidden className="aurora-root">
      <div className="aurora-blob b1" />
      <div className="aurora-blob b2" />
      <div className="aurora-blob b3" />
    </div>
  );
}
