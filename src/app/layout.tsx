import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Wanzwei — Healthcare Workforce Platform",
  description:
    "Wanzwei connects healthcare professionals with verified facilities. Locum, contract, and permanent opportunities, CPD tracking, and a healthcare marketplace.",
  metadataBase: new URL("https://wanzwei.com"),
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
      className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[color:var(--color-canvas)] text-[color:var(--color-ink-900)]">
        {children}
        <Toaster
          position="bottom-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "rounded-[var(--radius-md)] border-[color:var(--color-border-default)] shadow-[var(--shadow-md)]",
            },
          }}
        />
      </body>
    </html>
  );
}
