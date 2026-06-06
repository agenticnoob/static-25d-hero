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
    <html lang="zh-CN" className="dark" data-scene-ready="false">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#142334" />
        <link
          rel="preload"
          href="/models/black-layered-prism.optimized.glb"
          as="fetch"
          type="model/gltf-binary"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
        <link rel="icon" href="data:," />
      </head>
      <body className="bg-[#142334] text-[#baccd9] antialiased overscroll-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
