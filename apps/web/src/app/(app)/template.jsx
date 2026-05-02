// Fade between top-level (app) routes — /workspaces, /workspaces/new, and
// the entry into /w/[id]. Templates re-mount on every navigation, so the
// `page-transition` class triggers a fresh CSS animation each time.
//
// @param {{ children: import('react').ReactNode }} props
export default function AppTemplate({ children }) {
  return <div className="page-transition">{children}</div>;
}
