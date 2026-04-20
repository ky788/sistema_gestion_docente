"use client";

export default function LockScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-100 max-w-lg shadow-sm">
        <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        <h2 className="text-2xl font-black text-red-600 mb-2 tracking-tight">Acceso Restringido</h2>
        <p className="text-slate-600 font-medium mb-6">Seleccione una Escuela, Curso, División y Materia en el panel superior para gestionar los datos.</p>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-200">
          Configurar Contexto
        </button>
      </div>
    </div>
  );
}
