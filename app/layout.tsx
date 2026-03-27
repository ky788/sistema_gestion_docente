import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Navbar from '@/app/ui/Navbar';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 flex flex-col min-h-screen`}>
        <Navbar />

        {/* Contenedor principal con margen superior para compensar la barra fija (h-16 = pt-16) */}
        <main className="flex-1 w-full pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
