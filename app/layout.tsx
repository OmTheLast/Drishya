import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Drishya · Physics you can see",
    template: "%s · Drishya",
  },
  description:
    "Interactive mechanics laboratories for building JEE-level physical intuition.",
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
  openGraph: {
    type: "website",
    title: "Drishya · The Runaway Wedge",
    description: "Predict, observe, and explain a classic JEE mechanics system.",
    images: [
      {
        url: `${basePath}/og.png`,
        width: 1200,
        height: 630,
        alt: "Drishya movable wedge mechanics laboratory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drishya · The Runaway Wedge",
    description: "Predict, observe, and explain a classic JEE mechanics system.",
    images: [`${basePath}/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
