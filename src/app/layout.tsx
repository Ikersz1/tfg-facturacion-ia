import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeCookieSync } from "@/components/theme-cookie-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TFG — Facturación",
  description: "Gestión de clientes, facturas y automatizaciones",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("tfg-theme")?.value;
  const isDark = theme === "dark";

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isLoginPage = pathname === "/login";

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${isDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-zinc-900 dark:text-zinc-100">
        <ThemeCookieSync />
        {isLoginPage ? null : <AppSidebar />}
        <div className={`flex min-h-screen flex-1 flex-col${isLoginPage ? "" : " pt-14 md:pt-0 md:pl-64"}`}>
          {children}
        </div>
      </body>
    </html>
  );
}
