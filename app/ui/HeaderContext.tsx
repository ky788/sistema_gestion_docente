"use client";
import { useAppContext } from '@/app/context/AppContext';
import { usePathname } from 'next/navigation';

export default function HeaderContext() {
  const pathname = usePathname();
  const { escuela, curso, division, turno, materia, historialMaterias, setContext, isReady } = useAppContext();

  if (pathname === '/') return null;
  if (!isReady) return <div className="bg-white border-b h-[68px] animate-pulse"></div>;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex flex-wrap gap-4 items-center justify-center z-40 relative">
      <div className="flex items-center gap-2">
        <label className="text-sm font-black text-gray-400 uppercase tracking-widest">Escuela:</label>
        <input 
          type="text" 
          value={escuela} 
          onChange={(e) => setContext('escuela', e.target.value)} 
          placeholder="Ej: Colegio Nacional" 
          className="text-sm font-bold text-slate-700 border-2 border-slate-100 rounded-lg px-3 py-2 w-48 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-black text-gray-400 uppercase tracking-widest">Curso:</label>
        <select value={curso} onChange={(e) => setContext('curso', e.target.value)} className="text-sm font-bold text-slate-700 border-2 border-slate-100 rounded-lg px-3 py-2 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white">
          <option value="">Seleccione</option>
          {[1,2,3,4,5,6].map(c => <option key={c} value={c.toString()}>{c}°</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-black text-gray-400 uppercase tracking-widest">División:</label>
        <select value={division} onChange={(e) => setContext('division', e.target.value)} className="text-sm font-bold text-slate-700 border-2 border-slate-100 rounded-lg px-3 py-2 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white">
          <option value="">Seleccione</option>
          {[1,2,3,4,5,6,7].map(d => <option key={d} value={d.toString()}>{d}°</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-black text-gray-400 uppercase tracking-widest">Turno:</label>
        <select value={turno} onChange={(e) => setContext('turno', e.target.value)} className="text-sm font-bold text-slate-700 border-2 border-slate-100 rounded-lg px-3 py-2 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white">
          <option value="">Seleccione</option>
          <option value="Mañana">Mañana</option>
          <option value="Tarde">Tarde</option>
          <option value="Noche">Noche</option>
        </select>
      </div>
      {pathname !== '/alumnos' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-black text-gray-400 uppercase tracking-widest">Materia:</label>
          
          {historialMaterias.length > 0 ? (
            <div className="flex items-center gap-1">
              <select 
                value={materia} 
                onChange={(e) => setContext('materia', e.target.value)}
                className="text-sm font-bold text-blue-700 bg-blue-50 border-2 border-blue-100 rounded-lg px-3 py-2 w-40 focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">Seleccionar...</option>
                {historialMaterias.map((mat, idx) => (
                  <option key={idx} value={mat}>{mat}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  const nueva = prompt('Escribe el nombre de la nueva materia (Ej: Física):');
                  if (nueva && nueva.trim() !== '') {
                    setContext('materia', nueva.trim());
                  }
                }}
                title="Añadir nueva materia"
                className="w-9 h-9 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 hover:text-blue-800 transition-colors font-black text-xl"
              >
                +
              </button>
            </div>
          ) : (
            <input 
              type="text" 
              value={materia} 
              onChange={(e) => setContext('materia', e.target.value)} 
              placeholder="Ej: Matemáticas" 
              className="text-sm font-bold text-blue-700 bg-blue-50 border-2 border-blue-100 rounded-lg px-3 py-2 w-40 focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all"
            />
          )}
        </div>
      )}
    </div>
  );
}
