import './globals.css'

export const metadata = {
  title: 'Expert Fence — Mission Control',
  description: 'Calculator SaaS for fencing installers',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
