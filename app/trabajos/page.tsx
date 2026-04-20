"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useAppContext } from '@/app/context/AppContext';
import LockScreen from '@/app/ui/LockScreen';

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

const SEMANAS = [
  { id: 1, nombre: 'Semana 1', dias: 'Días 1-7' },
  { id: 2, nombre: 'Semana 2', dias: 'Días 8-14' },
  { id: 3, nombre: 'Semana 3', dias: 'Días 15-21' },
  { id: 4, nombre: 'Semana 4', dias: 'Días 22+' },
];

export default function TrabajosPage() {
  const { escuela: ctxEscuela, curso: ctxCurso, division: ctxDivision, materia: ctxMateria, isReady } = useAppContext();
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [asistenciasMes, setAsistenciasMes] = useState<Record<string, number>>({});
  const [mesSeleccionado, setMesSeleccionado] = useState(MESES[0].valor);
  const [semanaActiva, setSemanaActiva] = useState(1);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Calcular semana actual automáticamente al cargar
  useEffect(() => {
    const diaActual = new Date().getDate();
    const s = diaActual <= 7 ? 1 : diaActual <= 14 ? 2 : diaActual <= 21 ? 3 : 4;
    setSemanaActiva(s);
  }, []);

  useEffect(() => {
    if (!isReady || !ctxEscuela || !ctxCurso || !ctxDivision || !ctxMateria) return;
    fetchData();
  }, [mesSeleccionado, ctxEscuela, ctxCurso, ctxDivision, ctxMateria, isReady]);

  async function fetchData() {
    try {
      setLoading(true);
      setAlumnos([]);
      setCalificaciones([]);
      
      let query = supabase.from('alumnos')
        .select('*')
        .eq('escuela', ctxEscuela)
        .eq('curso', ctxCurso)
        .eq('division', ctxDivision);
      
      const { data: alumnosData, error: alumnosError } = await query.order('apellido', { ascending: true });

      if (alumnosError) throw alumnosError;
      setAlumnos(alumnosData || []);

      let calQuery = supabase
        .from('trabajos_practicos')
        .select('*')
        .eq('mes', mesSeleccionado);
      if (ctxMateria) calQuery = calQuery.eq('materia', ctxMateria);
      const { data: calData } = await calQuery;
      
      setCalificaciones(calData || []);

      const fechaFin = new Date(new Date(mesSeleccionado).setMonth(new Date(mesSeleccionado).getMonth() + 1)).toISOString().split('T')[0];
      
      let asisQuery = supabase
        .from('asistencia')
        .select('alumno_id')
        .gte('fecha', mesSeleccionado)
        .lt('fecha', fechaFin)
        .eq('presente', false);
      if (ctxMateria) asisQuery = asisQuery.eq('materia', ctxMateria);
      
      const { data: asisData } = await asisQuery;
      
      const conteoAsis: Record<string, number> = {};
      asisData?.forEach(a => {
        conteoAsis[a.alumno_id] = (conteoAsis[a.alumno_id] || 0) + 1;
      });
      setAsistenciasMes(conteoAsis);

    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRow(alumnoId: string) {
    const registroExisting = calificaciones.find(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado);
    
    const payload = {
      alumno_id: alumnoId,
      mes: mesSeleccionado,
      materia: ctxMateria,
      evaluaciones: registroExisting?.evaluaciones || {}
    };

    try {
      setIsSaving(alumnoId);
      const { data, error } = await supabase
        .from('trabajos_practicos')
        .upsert(payload, { onConflict: 'alumno_id, mes, materia' })
        .select();

      if (error) throw error;
      if (data) {
        setCalificaciones(prev => {
          const existe = prev.some(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado);
          return existe 
            ? prev.map(c => (c.alumno_id === alumnoId && c.mes === mesSeleccionado) ? data[0] : c)
            : [...prev, data[0]];
        });
      }
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(`Error al guardar: ${error.message}. Asegúrate de haber ejecutado el SQL para la columna JSONB 'evaluaciones'.`);
    } finally {
      setIsSaving(null);
    }
  }

  const handleInputChange = (alumnoId: string, campo: string, valor: string) => {
    let num = valor === '' ? null : parseInt(valor, 10);
    if (num !== null) {
      if (num < 1) num = 1;
      if (num > 10) num = 10;
    }

    setCalificaciones(prev => {
      const existing = prev.find(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado) || { 
        alumno_id: alumnoId, 
        mes: mesSeleccionado, 
        evaluaciones: {} 
      };

      const nuevasEval = { ...existing.evaluaciones };
      const sKey = `semana${semanaActiva}`;
      nuevasEval[sKey] = { ...nuevasEval[sKey], [campo]: num };

      const nuevoRegistro = { ...existing, evaluaciones: nuevasEval };

      if (prev.some(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado)) {
        return prev.map(c => (c.alumno_id === alumnoId && c.mes === mesSeleccionado) ? nuevoRegistro : c);
      } else {
        return [...prev, nuevoRegistro];
      }
    });
  };

  const handleFinalGradeChange = (alumnoId: string, valor: string) => {
    let num = valor === '' ? null : parseInt(valor, 10);
    if (num !== null) {
      if (num < 1) num = 1;
      if (num > 10) num = 10;
    }

    setCalificaciones(prev => {
      const existing = prev.find(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado) || { 
        alumno_id: alumnoId, 
        mes: mesSeleccionado, 
        evaluaciones: {} 
      };

      const nuevasEval = { ...existing.evaluaciones, nota_final_mes: num };
      const nuevoRegistro = { ...existing, evaluaciones: nuevasEval };

      if (prev.some(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado)) {
        return prev.map(c => (c.alumno_id === alumnoId && c.mes === mesSeleccionado) ? nuevoRegistro : c);
      } else {
        return [...prev, nuevoRegistro];
      }
    });
  };

  const calcularNotaOrientadora = (alumnoId: string) => {
    const cal = calificaciones.find(c => c.alumno_id === alumnoId && c.mes === mesSeleccionado);
    if (!cal || !cal.evaluaciones) return null;

    // Aplanamos todas las notas de todas las semanas
    const todasLasNotas: number[] = [];
    Object.entries(cal.evaluaciones).forEach(([key, value]: any) => {
      if (key.startsWith('semana')) {
        Object.values(value).forEach((nota: any) => {
          if (typeof nota === 'number' && nota !== null) todasLasNotas.push(nota);
        });
      }
    });

    if (todasLasNotas.length === 0) return null;

    const promedio = todasLasNotas.reduce((a, b) => a + b, 0) / todasLasNotas.length;
    const faltas = asistenciasMes[alumnoId] || 0;
    const final = Math.max(1, Math.round(promedio - faltas));
    
    return final;
  };

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  if (!isReady) return null;
  if (!ctxEscuela || !ctxMateria) return <LockScreen />;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto font-sans">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">Planilla de Seguimiento</h1>
          <p className="text-gray-500 text-sm">Control semanal de TPs y Evaluaciones.</p>
        </div>
        
        <div className="flex gap-3">
          <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="p-2 border border-blue-200 rounded-xl bg-white shadow-sm font-bold text-blue-700 outline-none">
            {MESES.map((m) => (<option key={m.valor} value={m.valor}>{m.nombre}</option>))}
          </select>
          <select value={cursoFiltro} onChange={(e) => setCursoFiltro(e.target.value)} className="p-2 border border-gray-200 rounded-xl bg-white shadow-sm font-medium outline-none text-sm">
            <option value="Todos">Cursos: Todos</option>
            {cursosUnicos.map((curso, idx) => (<option key={idx} value={curso}>{curso}</option>))}
          </select>
        </div>
      </header>

      {/* Selector de Semanas - Mobile Optimized */}
      <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide no-scrollbar">
        {SEMANAS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSemanaActiva(s.id)}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-center ${
              semanaActiva === s.id 
                ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-100' 
                : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest">{s.nombre}</span>
            <span className={`text-[10px] font-bold ${semanaActiva === s.id ? 'text-blue-100' : 'text-gray-300'}`}>{s.dias}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-medium flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Cargando planilla...
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW: TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-[11px] font-black text-gray-500 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 w-48">Alumno</th>
                    {['tp1', 'tp2', 'tp3', 'tp4'].map((tp) => (
                      <th key={tp} className="py-4 px-2 text-center text-[10px] font-bold text-blue-600 uppercase tracking-tighter">S{semanaActiva}-{tp.toUpperCase()}</th>
                    ))}
                    <th className="py-4 px-2 text-center text-[10px] font-bold text-amber-600 uppercase tracking-tighter">S{semanaActiva}-EVA</th>
                    <th className="py-4 px-2 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">S{semanaActiva}-REC</th>
                    <th className="py-4 px-4 text-center text-[10px] font-bold text-indigo-700 uppercase">Nota Or.</th>
                    <th className="py-4 px-4 text-center text-[10px] font-bold text-slate-800 uppercase">Nota Final</th>
                    <th className="py-4 px-6 text-center text-[10px] font-bold text-gray-400 uppercase">Guardar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {alumnosFiltrados.map((alumno) => {
                    const calRaw = calificaciones.find(c => c.alumno_id === alumno.id && c.mes === mesSeleccionado);
                    const evalSemana = calRaw?.evaluaciones?.[`semana${semanaActiva}`] || {};
                    const notaOr = calcularNotaOrientadora(alumno.id);

                    return (
                      <tr key={alumno.id} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="py-4 px-6 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors z-10">
                          <p className="font-bold text-gray-800 text-sm truncate">{alumno.apellido}, {alumno.nombre}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Faltas: {asistenciasMes[alumno.id] || 0}</p>
                        </td>
                        
                        {['tp1', 'tp2', 'tp3', 'tp4', 'eva1', 'recu1'].map((campo) => (
                          <td key={campo} className="px-1 text-center">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={evalSemana[campo] ?? ''}
                              onChange={(e) => handleInputChange(alumno.id, campo, e.target.value)}
                              className={`w-11 h-11 text-center font-bold text-sm bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all rounded-xl ${
                                evalSemana[campo] < 7 ? 'text-red-500' : 'text-blue-700'
                              }`}
                              placeholder="-"
                            />
                          </td>
                        ))}

                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-lg font-black ${notaOr !== null ? (notaOr >= 7 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                              {notaOr ?? '--'}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-1 text-center">
                           <input
                            type="number"
                            min="1"
                            max="10"
                            value={calRaw?.evaluaciones?.nota_final_mes ?? ''}
                            onChange={(e) => handleFinalGradeChange(alumno.id, e.target.value)}
                            className={`w-14 h-12 text-center font-black text-lg bg-slate-100 border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all rounded-xl shadow-inner ${
                              calRaw?.evaluaciones?.nota_final_mes < 4 ? 'text-red-600' : calRaw?.evaluaciones?.nota_final_mes >= 7 ? 'text-green-600' : 'text-slate-800'
                            }`}
                            placeholder="-"
                          />
                        </td>

                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleSaveRow(alumno.id)}
                            disabled={isSaving === alumno.id}
                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${
                              isSaving === alumno.id ? 'bg-gray-100 text-gray-400 animate-spin' : 'bg-blue-600 text-white shadow-md active:scale-95'
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW: CARDS */}
            <div className="md:hidden p-4 space-y-4 bg-gray-50/50">
              {alumnosFiltrados.map((alumno) => {
                const calRaw = calificaciones.find(c => c.alumno_id === alumno.id && c.mes === mesSeleccionado);
                const evalSemana = calRaw?.evaluaciones?.[`semana${semanaActiva}`] || {};
                const notaOr = calcularNotaOrientadora(alumno.id);
                const faltas = asistenciasMes[alumno.id] || 0;

                return (
                  <div key={alumno.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 pb-4 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 leading-tight">{alumno.apellido}, {alumno.nombre}</h3>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">Curso {alumno.curso}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-gray-700 block leading-none">{faltas}</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Faltas Mes</span>
                      </div>
                    </div>

                    <div className="px-6 grid grid-cols-3 gap-3 mb-6">
                      {['tp1', 'tp2', 'tp3', 'tp4', 'eva1', 'recu1'].map((campo) => (
                        <div key={campo} className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            placeholder={campo.toUpperCase()}
                            value={evalSemana[campo] ?? ''}
                            onChange={(e) => handleInputChange(alumno.id, campo, e.target.value)}
                            className={`h-14 text-center font-bold text-lg bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-400 focus:bg-white outline-none transition-all ${
                              evalSemana[campo] < 7 ? 'text-red-500' : 'text-blue-700'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`text-2xl font-black leading-none ${notaOr !== null ? (notaOr >= 7 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                          {notaOr ?? '--'}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Nota Global</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={calRaw?.evaluaciones?.nota_final_mes ?? ''}
                          onChange={(e) => handleFinalGradeChange(alumno.id, e.target.value)}
                          className={`w-14 h-14 text-center font-black text-xl bg-slate-100 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-inner outline-none transition-all ${
                            calRaw?.evaluaciones?.nota_final_mes < 4 ? 'text-red-600' : calRaw?.evaluaciones?.nota_final_mes >= 7 ? 'text-green-600' : 'text-slate-800'
                          }`}
                        />
                        <span className="text-[9px] font-bold text-slate-800 uppercase tracking-widest mt-1">Nota Final</span>
                      </div>
                      
                      <button
                        onClick={() => handleSaveRow(alumno.id)}
                        disabled={isSaving === alumno.id}
                        className={`px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                          isSaving === alumno.id 
                            ? 'bg-gray-200 text-gray-400' 
                            : 'bg-green-600 text-white shadow-lg shadow-green-100 active:scale-95'
                        }`}
                      >
                        {isSaving === alumno.id ? (
                          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-6 p-6 bg-gray-900 rounded-[2rem] text-white">
        <div className="flex-1 border-r border-gray-800 pr-6 last:border-0">
          <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-2">Semana Actual</h4>
          <p className="text-gray-400 text-xs">El sistema selecciona automáticamente la semana basándose en el día del mes.</p>
        </div>
        <div className="flex-1 border-r border-gray-800 pr-6 last:border-0">
          <h4 className="text-amber-400 font-black text-xs uppercase tracking-widest mb-2">Cálculo Mensual</h4>
          <p className="text-gray-400 text-xs">La Nota Orientadora es el promedio de todas las semanas del mes menos las faltas totales.</p>
        </div>
        <div className="flex-1">
          <h4 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-2">Guardado Manual</h4>
          <p className="text-gray-400 text-xs">Debes guardar cada fila para sincronizar todas las semanas en la nube.</p>
        </div>
      </div>
    </div>
  );
}
