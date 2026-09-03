import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Wanzwei — Healthcare Workforce Platform",
  description:
    "Wanzwei connects healthcare professionals with verified facilities for locum, contract, and permanent opportunities.",
  metadataBase: new URL("https://wanzwei.vercel.app"),
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-[color:var(--color-canvas)] text-[color:var(--color-ink-900)]">
        {children}
        <Toaster
          position="bottom-center"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "max-w-[calc(100vw-1.5rem)] rounded-[var(--radius-md)] border-[color:var(--color-border-default)] shadow-[var(--shadow-md)] sm:max-w-md",
            },
          }}
        />
      </body>
    </html>
  );
}
