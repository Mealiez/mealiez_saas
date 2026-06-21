import type { Metadata, Viewport } from 'next'
import MobileClientLayout from './mobile-client-layout'

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Mealiez Mobile',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mealiez',
    startupImage: [
      {
        url: '/icons/apple-touch-icon.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault();
              window.deferredBeforeInstallPrompt = e;
              window.dispatchEvent(new CustomEvent('d-beforeinstallprompt', { detail: e }));
            });
          `,
        }}
      />
      <MobileClientLayout>{children}</MobileClientLayout>
    </>
  )
}
