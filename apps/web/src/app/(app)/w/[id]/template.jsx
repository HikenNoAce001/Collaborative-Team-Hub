// Next App Router templates re-mount on every navigation, so this is the
// natural seam for entrance animations. Wrapping the child route here keeps
// the workspace layout (auth check, workspace fetch, socket join) cached
// while feature pages fade in on switch.
//
// @param {{ children: import('react').ReactNode }} props
export default function WorkspaceTemplate({ children }) {
  return <div className="page-transition">{children}</div>;
}
