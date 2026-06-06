import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "noobli — dream valley interface",
  description:
    "noobli 的空间化个人主页，关于梦境山谷、递归界面、WebGL 和 AI 参与后的系统重构。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#070604" />
        <link rel="icon" href="data:," />
      </head>
      <body className="bg-[#070604] text-[#F0E7D7] antialiased overscroll-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
