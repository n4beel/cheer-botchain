import type { Metadata, Viewport } from "next";
import { Raleway, Nanum_Gothic_Coding, Abril_Fatface } from "next/font/google";
import { EvmProvider } from "@/components/providers/EvmProvider";
import { ToastProvider } from "@/components/ui/Toast";
import WrongNetworkBar from "@/components/botchain/WrongNetworkBar";
import { app } from "@/lib/app-config";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-raleway",
});

const nanum = Nanum_Gothic_Coding({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum",
});

const abril = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-abril",
});

export const metadata: Metadata = {
  title: `${app.name} — ${app.tagline}`,
  description: app.tagline,
  openGraph: { title: app.name, description: app.tagline, type: "website", url: app.url },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A6F8C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${raleway.variable} ${nanum.variable} ${abril.variable} h-full`}>
      <body className="min-h-full antialiased flex flex-col font-sans">
        <EvmProvider>
          <ToastProvider>
            <WrongNetworkBar />
            {children}
          </ToastProvider>
        </EvmProvider>
      </body>
    </html>
  );
}
