import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Resend API Key no configurada' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { nombre, apellido, curso, mensaje, evalOral, evalEscrita, evalCarpeta } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'Sistema Escolar <onboarding@resend.dev>',
      to: ['cecall78@gmail.com'], // Mail verificado de tu cuenta Resend
      subject: `Notificación Académica: ${nombre} ${apellido} (${curso})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #4f46e5; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Comunicado Escolar</h1>
          </div>
          <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
            <p>Estimados padres de <strong>${nombre} ${apellido}</strong>:</p>
            <p>Les informamos el desempeño reciente del alumno en el curso <strong>${curso}</strong>:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f8fafc;">
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0;">Evaluación</th>
                <th style="text-align: center; padding: 12px; border-bottom: 2px solid #e2e8f0;">Fecha</th>
                <th style="text-align: center; padding: 12px; border-bottom: 2px solid #e2e8f0;">Nota</th>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">Oral</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${evalOral.fecha || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: bold;">${evalOral.nota || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">Escrita</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${evalEscrita.fecha || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: bold;">${evalEscrita.nota || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">Carpeta</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${evalCarpeta.fecha || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: bold;">${evalCarpeta.nota || '-'}</td>
              </tr>
            </table>

            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 20px;">
              <h4 style="margin-top: 0; color: #4f46e5;">Mensaje del Docente:</h4>
              <p style="margin-bottom: 0; font-style: italic;">"${mensaje || 'Sin comentarios adicionales.'}"</p>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Este es un correo automático del Sistema de Gestión Docente.
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
