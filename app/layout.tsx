import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Link from 'next/link';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 flex flex-col min-h-screen`}>
        {/* Barra de Navegación Fija */}
        <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-900 shadow-md z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex justify-between items-center h-full">
              {/* Título a la izquierda */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-white font-bold text-lg md:text-xl tracking-tight hover:text-blue-300 transition-colors">
                  <span className="text-blue-500">Edu</span>Tech
                </Link>
              </div>

              {/* Botones a la derecha */}
              <div className="flex space-x-1 sm:space-x-2">
                <Link href="/" className="text-slate-200 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                   🏠 <span className="hidden sm:inline ml-1">Inicio</span>
                </Link>
                <Link href="/alumnos" className="text-slate-200 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                   📋 <span className="hidden sm:inline ml-1">Alumnos</span>
                </Link>
                <Link href="/asistencia" className="text-slate-200 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                   ✅ <span className="hidden sm:inline ml-1">Asistencia</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Contenedor principal con margen superior para compensar la barra fija (h-16 = pt-16) */}
        <main className="flex-1 w-full pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
