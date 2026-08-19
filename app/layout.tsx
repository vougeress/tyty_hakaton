import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tutu Окно",
  description: "Mobile-first shell для группового свободного окна в поездке"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
