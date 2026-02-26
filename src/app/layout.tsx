export const metadata = {
  title: "ICEPOS",
  description: "ICEPOS Billing System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}