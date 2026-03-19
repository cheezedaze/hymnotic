export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Allow visitors (unauthenticated users) to browse the catalog.
  // Individual pages that require auth (profile, etc.) handle their own redirects.
  return <>{children}</>;
}
