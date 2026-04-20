"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useAppContext } from '@/app/context/AppContext';
import LockScreen from '@/app/ui/LockScreen';

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  escuela: string;
  curso: string;
  division: string;
  turno: string;
  creado_en?: string;
  notas?: any[];
}

export default function AlumnosPage() {
  const { escuela: ctxEscuela, curso: ctxCurso, division: ctxDivision, turno: ctxTurno, materia: ctxMateria, isReady } = useAppContext();
  
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  
  // Mapeo Automático de Base de Datos - Hereda del Contexto Global
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    escuela: '',
    curso: '1',
    division: '1',
    turno: 'Mañana'
  });

  useEffect(() => {
    if (isReady) {
      setFormData(prev => ({
        ...prev,
        escuela: ctxEscuela || prev.escuela,
        curso: ctxCurso || prev.curso,
        division: ctxDivision || prev.division,
        turno: ctxTurno || prev.turno
      }));
    }
  }, [ctxEscuela, ctxCurso, ctxDivision, ctxTurno, isReady]);
  
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal (Ficha del Alumno)
  const [alumnoModal, setAlumnoModal] = useState<Alumno | null>(null);
  const [evalOral, setEvalOral] = useState({ nota: '', fecha: '' });
  const [evalEscrita, setEvalEscrita] = useState({ nota: '', fecha: '' });
  const [evalCarpeta, setEvalCarpeta] = useState({ nota: '', fecha: '' });
  const [mensajePadres, setMensajePadres] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (!isReady || !ctxEscuela || !ctxCurso || !ctxDivision) return;

    fetchData();

    // Sincronización mediante Supabase Realtime
    const channel = supabase
      .channel('alumnos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alumnos' }, (payload) => {
        setAlumnos((prev) => {
          if (prev.some((a) => a.id === payload.new.id)) return prev;
          return [payload.new as Alumno, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'alumnos' }, (payload) => {
        setAlumnos((prev) => prev.filter((a) => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alumnos' }, (payload) => {
        setAlumnos((prev) => prev.map((a) => a.id === payload.new.id ? payload.new as Alumno : a));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ctxEscuela, ctxCurso, ctxDivision, isReady]);

  async function fetchData() {
    try {
      setLoading(true);
      setAlumnos([]);
      
      let query = supabase.from('alumnos')
        .select('*')
        .eq('escuela', ctxEscuela)
        .eq('curso', ctxCurso)
        .eq('division', ctxDivision);

      const { data, error } = await query.order('creado_en', { ascending: false });

      if (error) throw new Error(error.message || JSON.stringify(error));
      if (data) setAlumnos(data as Alumno[]);

      const { data: asisData } = await supabase.from('asistencia').select('*');
      if (asisData) setAsistencias(asisData);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Usar los datos del formulario (que heredan del contexto si no se modificaron)
      const { data, error } = await supabase
        .from('alumnos')
        .insert([{ 
          nombre: formData.nombre, 
          apellido: formData.apellido, 
          escuela: formData.escuela, 
          curso: formData.curso, 
          division: formData.division, 
          turno: formData.turno 
        }])
        .select();

      if (error) throw new Error(error.message || JSON.stringify(error));
      
      // Actualizar el estado local para que aparezca en la lista inmediatamente
      if (data && data.length > 0) {
        setAlumnos(prev => [data[0] as Alumno, ...prev]);
      }
      
      // Limpiar solo nombre y apellido
      setFormData((prev) => ({
        ...prev,
        nombre: '',
        apellido: ''
      }));
    } catch (error) {
      console.error('Error insertando alumno:', error);
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar alumno?')) return;
    try {
      const { error } = await supabase.from('alumnos').delete().eq('id', id);
      if (error) throw error;
      setAlumnos((prev) => prev.filter(al => al.id !== id));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const handleOpenModal = (alumno: Alumno) => {
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
        }),
      });

      if (!response.ok) throw new Error('Error al enviar el correo');
      alert(`✅ Notificación enviada con éxito para ${alumnoModal.nombre}`);
    } catch (error) {
      console.error(error);
      alert('❌ Hubo un problema al enviar la notificación.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const alumnosFiltrados = alumnos.filter((a) => {
    if (!formData.escuela) return true;
    return a.escuela?.toLowerCase().includes(formData.escuela.toLowerCase());
  });

  if (!isReady) return null;
  if (!ctxEscuela || !ctxCurso || !ctxDivision) return <LockScreen />;

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Gestión de Alumnos</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Agregar Nuevo Alumno</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input name="escuela" type="text" placeholder="Escuela" value={formData.escuela} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg" required />
            <select name="curso" value={formData.curso} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg" required>
              {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c.toString()}>{c}° Año</option>)}
            </select>
            <select name="division" value={formData.division} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg" required>
              {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d.toString()}>{d}° División</option>)}
            </select>
            <select name="turno" value={formData.turno} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg" required>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
              <option value="Noche">Noche</option>
            </select>
            <input name="nombre" type="text" placeholder="Nombre" value={formData.nombre} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg" required />
            <input name="apellido" type="text" placeholder="Apellido" value={formData.apellido} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg" required />
          </div>
          <button type="submit" className="w-full md:w-auto self-end bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition font-semibold">
            Agregar Alumno
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">Lista de Alumnos</h2>
        {loading ? (
          <div className="flex justify-center p-20 text-gray-500 animate-pulse font-medium">Cargando alumnos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs">ALUMNO</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs text-center">CURSO/DIV</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs text-center">TURNO</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-xs text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnosFiltrados.map((alumno) => (
                  <tr key={alumno.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4 font-bold text-gray-800">{alumno.nombre} {alumno.apellido}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {alumno.curso}° {alumno.division}°
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-sm text-gray-500">{alumno.turno}</td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => handleEliminar(alumno.id)} className="text-red-400 hover:text-red-600 transition">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
