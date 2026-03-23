import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight text-center">
            Sistema de Gestión Docente
            <span className="block text-xl md:text-2xl text-blue-600 font-semibold mt-2">Educación Tecnológica</span>
          </h1>
        </div>
      </header>
      
      <main className="flex-1 max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-14">
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bienvenido al panel principal. Desde aquí puedes administrar todos tus cursos, registrar calificaciones y tomar la asistencia diaria de forma rápida y sencilla.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Tarjeta: Lista de Alumnos */}
          <Link 
            href="/alumnos" 
            className="group flex flex-col bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="bg-blue-50 text-blue-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 z-10 shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">📋 Panel y Calificaciones</h3>
            <p className="text-gray-500 flex-1 leading-relaxed">
              Consulta la estadística de tus estudiantes. Agrega notas, calcula sus promedios de forma automática y exporta planillas en Excel.
            </p>
            <div className="mt-6 flex items-center text-blue-600 font-semibold text-sm">
              Acceder al panel <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          {/* Tarjeta: Tomar Asistencia */}
          <Link 
            href="/asistencia" 
            className="group flex flex-col bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-100 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="bg-emerald-50 text-emerald-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 z-10 shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">✅ Tomar Asistencia</h3>
            <p className="text-gray-500 flex-1 leading-relaxed">
              Registra el estado de "presente" o "ausente" de la jornada escolar filtrando los alumnos de un curso en particular.
            </p>
            <div className="mt-6 flex items-center text-emerald-600 font-semibold text-sm">
              Tomar lista hoy <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          {/* Tarjeta: Registrar Nuevo Alumno */}
          <Link 
            href="/alumnos" 
            className="group flex flex-col bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-100 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="bg-purple-50 text-purple-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 z-10 shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">➕ Registro Rápido</h3>
            <p className="text-gray-500 flex-1 leading-relaxed">
              Formulario simplificado para la inscripción de un nuevo estudiante en tu ecosistema introduciendo sus datos básicos.
            </p>
            <div className="mt-6 flex items-center text-purple-600 font-semibold text-sm">
              Inscribir alumno <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="mt-auto py-8 text-center text-gray-400 text-sm border-t border-gray-100 bg-white">
        <p>Desarrollado con Next.js + Tailwind CSS. Gestión Educativa © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
