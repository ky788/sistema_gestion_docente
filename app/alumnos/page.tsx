"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [curso, setCurso] = useState('');
  const [loading, setLoading] = useState(true);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  
  // Estado para el Modal (Ficha del Alumno)
  const [alumnoModal, setAlumnoModal] = useState<any | null>(null);
  const [evalOral, setEvalOral] = useState({ nota: '', fecha: '' });
  const [evalEscrita, setEvalEscrita] = useState({ nota: '', fecha: '' });
  const [evalCarpeta, setEvalCarpeta] = useState({ nota: '', fecha: '' });
  const [mensajePadres, setMensajePadres] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      if (data) setAlumnos(data);

      const { data: asisData } = await supabase.from('asistencia').select('*');
      if (asisData) setAsistencias(asisData);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .insert([{ nombre, apellido, curso, notas: [] }])
        .select();

      if (error) throw error;
      if (data) {
        setAlumnos([data[0], ...alumnos]);
        setNombre('');
        setApellido('');
        setCurso('');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar alumno?')) return;
    try {
      const { error } = await supabase.from('alumnos').delete().eq('id', id);
      if (error) throw error;
      setAlumnos(alumnos.filter(al => al.id !== id));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const handleOpenModal = (alumno: any) => {
    setAlumnoModal(alumno);
    setEvalOral({ nota: '', fecha: '' }); 
    setEvalEscrita({ nota: '', fecha: '' });
    setEvalCarpeta({ nota: '', fecha: '' });
    setMensajePadres('');
  };

  const handleSendEmail = async () => {
    if (!alumnoModal) return;
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: alumnoModal.nombre,
          apellido: alumnoModal.apellido,
          curso: alumnoModal.curso,
          mensaje: mensajePadres,
          evalOral,
          evalEscrita,
          evalCarpeta
        }),
      });

      if (!response.ok) throw new Error('Error al enviar el correo');
      
      alert(`✅ Notificación enviada con éxito para ${alumnoModal.nombre}`);
    } catch (error) {
      console.error(error);
      alert('❌ Hubo un problema al enviar la notificación. Verifica tu API Key de Resend en .env.local');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Gestión de Alumnos</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Agregar Nuevo Alumno</h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <input type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <input type="text" placeholder="Curso" value={curso} onChange={(e) => setCurso(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition">Agregar</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-700">Lista de Alumnos</h2>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="curso-filtro" className="text-sm font-medium text-gray-600">Curso:</label>
              <select
                id="curso-filtro"
                value={cursoFiltro}
                onChange={(e) => setCursoFiltro(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="Todos">Todos</option>
                {cursosUnicos.map((curso, idx) => (
                  <option key={idx} value={curso}>{curso}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-20 text-gray-500 animate-pulse font-medium">Cargando alumnos...</div>
        ) : (
          <>
            {/* VISTA TABLET/DESKTOP: Tabla tradicional */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Alumno</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Curso</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Resumen Asistencia</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alumnosFiltrados.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-4 font-bold text-gray-800">
                        {alumno.nombre} {alumno.apellido}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{alumno.curso}</span>
                      </td>
                      <td className="py-4 px-4 text-sm whitespace-nowrap text-center">
                        <div className="flex justify-center gap-4">
                          <span className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-lg">P: {asistencias.filter(a => a.alumno_id === alumno.id && a.presente === true).length}</span>
                          <span className="text-red-500 font-semibold bg-red-50 px-3 py-1 rounded-lg">A: {asistencias.filter(a => a.alumno_id === alumno.id && a.presente === false).length}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(alumno)}
                            className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            Ficha
                          </button>
                          <button onClick={() => handleEliminar(alumno.id)} className="text-red-400 hover:text-red-600 p-1.5 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISTA MÓVIL: Tarjetas (Cards) */}
            <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {alumnosFiltrados.map((alumno) => {
                const presencias = asistencias.filter(a => a.alumno_id === alumno.id && a.presente === true).length;
                const ausencias = asistencias.filter(a => a.alumno_id === alumno.id && a.presente === false).length;
                
                return (
                  <div key={alumno.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg leading-tight">{alumno.nombre} {alumno.apellido}</p>
                        <span className="inline-block mt-2 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-blue-100">
                          {alumno.curso}
                        </span>
                      </div>
                      <button onClick={() => handleEliminar(alumno.id)} className="p-2 text-red-300 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                    <div className="flex gap-2 text-xs font-bold">
                      <div className="flex-1 bg-green-50 text-green-700 p-2 rounded-xl text-center">
                        <span className="block text-[10px] opacity-60 uppercase mb-0.5">Presencias</span>
                        {presencias}
                      </div>
                      <div className="flex-1 bg-red-50 text-red-700 p-2 rounded-xl text-center">
                        <span className="block text-[10px] opacity-60 uppercase mb-0.5">Ausencias</span>
                        {ausencias}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenModal(alumno)}
                      className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Ver Ficha del Alumno
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL: FICHA DEL ALUMNO */}
      {alumnoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white relative flex-shrink-0">
              <button onClick={() => setAlumnoModal(null)} className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-xl font-bold tracking-tight">Comunicado Institucional</h2>
              <p className="text-blue-100 text-sm opacity-90">{alumnoModal.nombre} {alumnoModal.apellido} • {alumnoModal.curso}</p>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-700 text-xs uppercase mb-3 text-amber-600">Oral</h3>
                  <input type="date" value={evalOral.fecha} onChange={(e) => setEvalOral({...evalOral, fecha: e.target.value})} className="w-full mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                  <input type="number" placeholder="Nota" value={evalOral.nota} onChange={(e) => setEvalOral({...evalOral, nota: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-700 text-xs uppercase mb-3 text-blue-600">Escrita</h3>
                  <input type="date" value={evalEscrita.fecha} onChange={(e) => setEvalEscrita({...evalEscrita, fecha: e.target.value})} className="w-full mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                  <input type="number" placeholder="Nota" value={evalEscrita.nota} onChange={(e) => setEvalEscrita({...evalEscrita, nota: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-700 text-xs uppercase mb-3 text-emerald-600">Carpeta</h3>
                  <input type="date" value={evalCarpeta.fecha} onChange={(e) => setEvalCarpeta({...evalCarpeta, fecha: e.target.value})} className="w-full mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                  <input type="number" placeholder="Nota" value={evalCarpeta.nota} onChange={(e) => setEvalCarpeta({...evalCarpeta, nota: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600">Mensaje Adicional para los Padres</label>
                <textarea rows={3} value={mensajePadres} onChange={(e) => setMensajePadres(e.target.value)} placeholder="Ej: Felicitaciones por el desempeño..." className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs resize-none placeholder:text-gray-300" />
              </div>

              <button className={`w-full font-bold py-3.5 rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base ${isSendingEmail ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`} onClick={handleSendEmail} disabled={isSendingEmail}>
                {isSendingEmail ? 'Enviando...' : 'Enviar Notificación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
