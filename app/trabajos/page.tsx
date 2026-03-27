"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

const MESES = [
  { nombre: 'Marzo', valor: '2026-03-01' },
  { nombre: 'Abril', valor: '2026-04-01' },
  { nombre: 'Mayo', valor: '2026-05-01' },
  { nombre: 'Junio', valor: '2026-06-01' },
  { nombre: 'Julio', valor: '2026-07-01' },
  { nombre: 'Agosto', valor: '2026-08-01' },
  { nombre: 'Septiembre', valor: '2026-09-01' },
  { nombre: 'Octubre', valor: '2026-10-01' },
  { nombre: 'Noviembre', valor: '2026-11-01' },
  { nombre: 'Diciembre', valor: '2026-12-01' },
];

export default function TrabajosPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [tps, setTps] = useState<any[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(MESES[0].valor);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);

  const nombreMesSeleccionado = MESES.find(m => m.valor === mesSeleccionado)?.nombre || 'Mes';

  useEffect(() => {
    fetchData();
  }, [mesSeleccionado]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('*')
        .order('apellido', { ascending: true });

      if (alumnosError) throw alumnosError;
      if (alumnosData) setAlumnos(alumnosData);

      const { data: tpData } = await supabase
        .from('trabajos_practicos')
        .select('*')
        .eq('mes', mesSeleccionado);
      if (tpData) setTps(tpData);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTP(alumnoId: string, campo: 'tp1' | 'tp2', valorActual: boolean) {
    const nuevoValor = !valorActual;
    const registroActual = tps.find(t => t.alumno_id === alumnoId && t.mes === mesSeleccionado) || {};

    try {
      const { data, error } = await supabase
        .from('trabajos_practicos')
        .upsert({ 
          ...registroActual,
          alumno_id: alumnoId, 
          mes: mesSeleccionado, 
          [campo]: nuevoValor 
        }, { onConflict: 'alumno_id, mes' })
        .select();

      if (error) throw error;

      if (data) {
        setTps(prev => {
          const existe = prev.some(t => t.alumno_id === alumnoId && t.mes === mesSeleccionado);
          if (existe) {
            return prev.map(t => (t.alumno_id === alumnoId && t.mes === mesSeleccionado) ? data[0] : t);
          } else {
            return [...prev, data[0]];
          }
        });
      }
    } catch (error) {
      console.error('Error actualizando TP:', error);
    }
  }

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-800">Seguimiento de Trabajos Prácticos</h1>
        <p className="text-gray-500 mt-2">Registra la entrega de TPs mensuales por curso.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mes de Evaluación</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium text-gray-700 min-w-[160px]"
            >
              {MESES.map((m) => (
                <option key={m.valor} value={m.valor}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filtrar Curso</label>
            <select
              value={cursoFiltro}
              onChange={(e) => setCursoFiltro(e.target.value)}
              className="p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium text-gray-700 min-w-[160px]"
            >
              <option value="Todos">Todos los Cursos</option>
              {cursosUnicos.map((curso, idx) => (
                <option key={idx} value={curso}>{curso}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Mostrando {alumnosFiltrados.length} alumnos
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-medium flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Cargando planilla de trabajos...
          </div>
        ) : (
          <>
            {/* DESKTOP/TABLET TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Alumno</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Curso</th>
                    <th className="py-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-widest text-center bg-blue-50/30">Trabajo Práctico 1</th>
                    <th className="py-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-widest text-center bg-blue-50/30">Trabajo Práctico 2</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Estado Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {alumnosFiltrados.map((alumno) => {
                    const tpInfo = tps.find(t => t.alumno_id === alumno.id && t.mes === mesSeleccionado) || { tp1: false, tp2: false };
                    const completado = tpInfo.tp1 && tpInfo.tp2;

                    return (
                      <tr key={alumno.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{alumno.apellido}, {alumno.nombre}</p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase">{alumno.curso}</span>
                        </td>
                        <td className="py-4 px-6 text-center bg-blue-50/10">
                          <button
                            onClick={() => handleToggleTP(alumno.id, 'tp1', tpInfo.tp1)}
                            className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center mx-auto ${
                              tpInfo.tp1 
                                ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-200 scale-110' 
                                : 'bg-white border-gray-200 text-gray-300 hover:border-blue-400 hover:text-blue-400'
                            }`}
                          >
                            {tpInfo.tp1 ? '✔' : '✖'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-center bg-blue-50/10">
                          <button
                            onClick={() => handleToggleTP(alumno.id, 'tp2', tpInfo.tp2)}
                            className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center mx-auto ${
                              tpInfo.tp2 
                                ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-200 scale-110' 
                                : 'bg-white border-gray-200 text-gray-300 hover:border-blue-400 hover:text-blue-400'
                            }`}
                          >
                            {tpInfo.tp2 ? '✔' : '✖'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {completado ? (
                            <span className="text-green-600 font-bold text-[10px] bg-green-100 px-3 py-1.5 rounded-full inline-flex items-center gap-1 uppercase tracking-tighter">
                               ✨ Completo
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[10px] bg-amber-100 px-3 py-1.5 rounded-full inline-flex items-center gap-1 uppercase tracking-tighter">
                               ⏳ Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50/50">
              {alumnosFiltrados.map((alumno) => {
                const tpInfo = tps.find(t => t.alumno_id === alumno.id && t.mes === mesSeleccionado) || { tp1: false, tp2: false };
                const completado = tpInfo.tp1 && tpInfo.tp2;

                return (
                  <div key={alumno.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{alumno.nombre} {alumno.apellido}</p>
                        <span className="inline-block mt-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">
                          {alumno.curso}
                        </span>
                      </div>
                      {completado && (
                        <div className="bg-green-100 text-green-600 p-1.5 rounded-full">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleToggleTP(alumno.id, 'tp1', tpInfo.tp1)}
                        className={`py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                          tpInfo.tp1 
                            ? 'bg-green-600 border-green-700 text-white shadow-lg shadow-green-100' 
                            : 'bg-white border-gray-100 text-gray-400'
                        }`}
                      >
                        <span className="text-xs opacity-80 uppercase tracking-tighter">TP 1</span>
                        <span className="text-xl">{tpInfo.tp1 ? '✔' : '✖'}</span>
                      </button>
                      <button
                        onClick={() => handleToggleTP(alumno.id, 'tp2', tpInfo.tp2)}
                        className={`py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                          tpInfo.tp2 
                            ? 'bg-green-600 border-green-700 text-white shadow-lg shadow-green-100' 
                            : 'bg-white border-gray-100 text-gray-400'
                        }`}
                      >
                        <span className="text-xs opacity-80 uppercase tracking-tighter">TP 2</span>
                        <span className="text-xl">{tpInfo.tp2 ? '✔' : '✖'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
