import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/constants"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "sewa freezer ASI", "rental kulkas ASI", "harga sewa freezer ASI",
    "sewa freezer ASI terdekat", "sewa freezer ASI Jakarta", "sewa freezer ASI murah",
    "freezer ASI JABODETABEK", "penyimpanan ASI", "ASI perah", "ibu menyusui"
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={poppins.variable}>
      <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}

