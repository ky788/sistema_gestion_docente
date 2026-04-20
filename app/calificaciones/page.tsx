"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useAppContext } from '@/app/context/AppContext';
import LockScreen from '@/app/ui/LockScreen';

const TRIMESTRES = [
  { id: 1, nombre: '1er Trimestre', meses: ['Marzo', 'Abril', 'Mayo'], valores: ['2026-03-01', '2026-04-01', '2026-05-01'] },
  { id: 2, nombre: '2do Trimestre', meses: ['Junio', 'Julio', 'Agosto'], valores: ['2026-06-01', '2026-07-01', '2026-08-01'] },
  { id: 3, nombre: '3er Trimestre', meses: ['Septiembre', 'Octubre', 'Noviembre'], valores: ['2026-09-01', '2026-10-01', '2026-11-01'] },
];

export default function CalificacionesPage() {
  const { escuela: ctxEscuela, curso: ctxCurso, division: ctxDivision, materia: ctxMateria, isReady } = useAppContext();
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [notasTrimestre, setNotasTrimestre] = useState<Record<string, Record<string, number | null>>>({});
  const [loading, setLoading] = useState(true);
  const [trimestreActivo, setTrimestreActivo] = useState(1);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !ctxEscuela || !ctxCurso || !ctxDivision || !ctxMateria) return;
    fetchData();
  }, [trimestreActivo, ctxEscuela, ctxCurso, ctxDivision, ctxMateria, isReady]);

  async function fetchData() {
    try {
      setLoading(true);
      setAlumnos([]);
      setNotasTrimestre({});
      
      let query = supabase.from('alumnos')
        .select('*')
        .eq('escuela', ctxEscuela)
        .eq('curso', ctxCurso)
        .eq('division', ctxDivision);
      
      const { data: alumnosData, error: alumnosError } = await query.order('apellido', { ascending: true });

      if (alumnosError) throw alumnosError;

      const periodo = TRIMESTRES.find(t => t.id === trimestreActivo);
      
      let tpQuery = supabase
        .from('trabajos_practicos')
        .select('alumno_id, mes, evaluaciones')
        .in('mes', periodo?.valores || []);
      if (ctxMateria) tpQuery = tpQuery.eq('materia', ctxMateria);
      
      const { data: tpData, error: tpError } = await tpQuery;

      if (tpError) throw tpError;

      const mapaNotas: Record<string, Record<string, number | null>> = {};
      tpData?.forEach(reg => {
        if (!mapaNotas[reg.alumno_id]) mapaNotas[reg.alumno_id] = {};
        mapaNotas[reg.alumno_id][reg.mes] = reg.evaluaciones?.nota_final_mes || null;
      });

      setAlumnos(alumnosData || []);
      setNotasTrimestre(mapaNotas);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateMonthGrade = async (alumnoId: string, mes: string, valor: string) => {
    let num = valor === '' ? null : parseInt(valor, 10);
    if (num !== null) {
      if (num < 1) num = 1;
      if (num > 10) num = 10;
    }

    try {
      setIsUpdating(`${alumnoId}-${mes}`);
      
      // Obtener el registro actual para no pisar otras evaluaciones (JSONB)
      let currentQuery = supabase
        .from('trabajos_practicos')
        .select('evaluaciones')
        .eq('alumno_id', alumnoId)
        .eq('mes', mes);
      if (ctxMateria) currentQuery = currentQuery.eq('materia', ctxMateria);
      
      const { data: currentRecord } = await currentQuery.maybeSingle();

      const nuevasEval = { ...(currentRecord?.evaluaciones || {}), nota_final_mes: num };

      const { error } = await supabase
        .from('trabajos_practicos')
        .upsert({ 
          alumno_id: alumnoId, 
          mes: mes, 
          materia: ctxMateria,
          evaluaciones: nuevasEval 
        }, { onConflict: 'alumno_id, mes, materia' });

      if (error) throw error;

      // Actualizar estado local
      setNotasTrimestre(prev => ({
        ...prev,
        [alumnoId]: {
          ...(prev[alumnoId] || {}),
          [mes]: num
        }
      }));
    } catch (error) {
      console.error('Error actualizando nota:', error);
      alert('Error al sincronizar con la planilla de trabajos.');
    } finally {
      setIsUpdating(null);
    }
  };

  const calcularPromedioTrimestral = (alumnoId: string) => {
    const notas = notasTrimestre[alumnoId] || {};
    const periodo = TRIMESTRES.find(t => t.id === trimestreActivo);
    const valoresExtras: number[] = [];
    
    periodo?.valores.forEach(v => {
      if (notas[v] !== undefined && notas[v] !== null) valoresExtras.push(notas[v]!);
    });

    if (valoresExtras.length === 0) return null;
    return (valoresExtras.reduce((a, b) => a + b, 0) / valoresExtras.length).toFixed(1);
  };

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  if (!isReady) return null;
  if (!ctxEscuela || !ctxMateria) return <LockScreen />;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Cruce Trimestral</h1>
          <p className="text-slate-500 font-medium italic">Resumen consolidado desde la planilla de trabajos.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            {TRIMESTRES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTrimestreActivo(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  trimestreActivo === t.id 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {t.id}° Trim
              </button>
            ))}
          </div>

          <select
            value={cursoFiltro}
            onChange={(e) => setCursoFiltro(e.target.value)}
            className="p-3 border-2 border-slate-100 rounded-2xl bg-white font-bold text-slate-600 shadow-sm outline-none transition-all focus:border-blue-500 text-sm"
          >
            <option value="Todos">Todos los Cursos</option>
            {cursosUnicos.map((curso, idx) => (
              <option key={idx} value={curso}>{curso}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
             Consolidando trimestres...
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW: TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</th>
                    {TRIMESTRES.find(t => t.id === trimestreActivo)?.meses.map((mes, idx) => (
                      <th key={idx} className="py-6 px-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">{mes}</th>
                    ))}
                    <th className="py-6 px-8 text-[10px] font-black text-amber-600 uppercase tracking-widest text-center bg-amber-50/50">Prom. Trimestral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {alumnosFiltrados.map((alumno) => {
                    const notas = notasTrimestre[alumno.id] || {};
                    const periodo = TRIMESTRES.find(t => t.id === trimestreActivo);
                    const promedio = calcularPromedioTrimestral(alumno.id);

                    return (
                      <tr key={alumno.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-6 px-8">
                          <p className="font-black text-slate-800 text-base">{alumno.apellido}, {alumno.nombre}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{alumno.curso}</span>
                        </td>
                        
                        {periodo?.valores.map((v, idx) => (
                          <td key={idx} className="py-6 px-4 text-center">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={notas[v] ?? ''}
                              onChange={(e) => handleUpdateMonthGrade(alumno.id, v, e.target.value)}
                              disabled={isUpdating === `${alumno.id}-${v}`}
                              className={`w-14 h-14 text-center font-black text-xl rounded-2xl border-2 transition-all outline-none ${
                                isUpdating === `${alumno.id}-${v}` ? 'opacity-50 animate-pulse' : ''
                              } ${
                                (notas[v] ?? 0) >= 7 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 focus:border-emerald-500' 
                                  : (notas[v] === null) ? 'bg-slate-50 text-slate-300 border-slate-100 focus:border-blue-400'
                                  : 'bg-rose-50 text-rose-600 border-rose-100 focus:border-rose-500'
                              }`}
                              placeholder="-"
                            />
                          </td>
                        ))}

                        <td className="py-6 px-8 text-center bg-amber-50/20">
                          {promedio ? (
                            <div className="w-16 h-16 rounded-full border-4 border-amber-200 flex items-center justify-center mx-auto bg-white shadow-inner">
                              <span className={`text-xl font-black ${parseFloat(promedio) >= 7 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {promedio}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-200 font-bold">--</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW: CARDS */}
            <div className="block md:hidden space-y-4 p-4 bg-slate-50/50">
              {alumnosFiltrados.map((alumno) => {
                const notas = notasTrimestre[alumno.id] || {};
                const periodo = TRIMESTRES.find(t => t.id === trimestreActivo);
                const promedio = calcularPromedioTrimestral(alumno.id);

                return (
                  <div key={alumno.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tighter">{alumno.apellido}, {alumno.nombre}</h3>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{alumno.curso}</span>
                      </div>
                      
                      {promedio && (
                        <div className="w-14 h-14 rounded-full border-4 border-amber-200 flex flex-col items-center justify-center bg-amber-50 shadow-inner">
                          <span className={`text-lg font-black leading-none ${parseFloat(promedio) >= 7 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {promedio}
                          </span>
                          <span className="text-[7px] font-black text-amber-600 uppercase">PROM</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between gap-2">
                       {periodo?.valores.map((v, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{periodo.meses[idx].substring(0,3)}</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={notas[v] ?? ''}
                            onChange={(e) => handleUpdateMonthGrade(alumno.id, v, e.target.value)}
                            disabled={isUpdating === `${alumno.id}-${v}`}
                            className={`w-full h-14 text-center font-black text-lg rounded-2xl border-2 transition-all outline-none ${
                                (notas[v] ?? 0) >= 7 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : (notas[v] === null) ? 'bg-slate-50 text-slate-300 border-slate-100'
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                          />
                        </div>
                       ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <footer className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-slate-400 flex flex-col md:flex-row gap-6 items-center border border-slate-800">
        <div className="flex-1 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-xs font-medium">Esta vista sincroniza automáticamente la <span className="text-white font-bold">Nota Final del Mes</span> de la planilla de trabajos prácticos. Los cambios realizados aquí se reflejarán en todo el sistema.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aprobado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Desaprobado</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
