import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Layout } from "@/components/Layout";

export const metadata: Metadata = {
  title: "언주중학교 스포츠클럽 야구부 - 관리 시스템",
  description: "Next.js, NextAuth, Prisma를 활용한 클럽 관리 시스템",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
