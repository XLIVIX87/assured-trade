import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UK Commodity Gateway",
  description: "Assured Trade Deal Desk — facilitating commodity trade between UK/EU buyers and Nigerian suppliers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
