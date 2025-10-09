import "./globals.css";
import Nav from "@/components/Nav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <Nav />
        <div className="max-w-5xl mx-auto p-6">{children}</div>
      </body>
    </html>
  );
}
