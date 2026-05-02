// Fade between login ↔ register. Auth pages are short and same-shape, so a
// soft fade is enough — no need for slide / scale.
//
// @param {{ children: import('react').ReactNode }} props
export default function AuthTemplate({ children }) {
  return <div className="page-transition">{children}</div>;
}
