import { Injectable } from '@nestjs/common';
import { User } from '../../../user/entities/user.entity';
import { WeeklyProgressMetricsDto } from '../../../user/dto/weekly-progress-metrics.dto';

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class ProgressEmailTemplateService {
  async generateWeeklyProgressEmail(
    user: User,
    metrics: WeeklyProgressMetricsDto,
    unsubscribeToken: string,
  ): Promise<EmailContent> {
    const language = user.language || 'en';
    const userName = user.metadata?.name || 'Focus Bear user';

    if (language === 'es') {
      return this.generateSpanishTemplate(userName, metrics, unsubscribeToken);
    }

    return this.generateEnglishTemplate(userName, metrics, unsubscribeToken);
  }

  async generateNoProgressEmail(user: User): Promise<EmailContent> {
    const language = user.language || 'en';
    const userName = user.metadata?.name || 'Focus Bear user';

    if (language === 'es') {
      return this.generateSpanishNoProgressTemplate(userName);
    }

    return this.generateEnglishNoProgressTemplate(userName);
  }

  async generateInactivityWarningEmail(user: User, daysUntilDeletion = 30): Promise<EmailContent> {
    const language = user.language || 'en';
    const userName = user.metadata?.name || 'Focus Bear user';

    if (language === 'es') {
      return this.generateSpanishInactivityWarningTemplate(userName, daysUntilDeletion);
    }

    return this.generateEnglishInactivityWarningTemplate(userName, daysUntilDeletion);
  }

  private generateEnglishTemplate(
    userName: string,
    metrics: WeeklyProgressMetricsDto,
    unsubscribeToken: string,
  ): EmailContent {
    const weekStart = new Date(metrics.week_start).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    const weekEnd = new Date(metrics.week_end).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    const subject = `🐻 Your Weekly Progress Report (${weekStart} - ${weekEnd})`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Weekly Progress Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4A90E2; color: white; text-align: center; padding: 20px; }
          .content { padding: 20px; }
          .metric-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .metric-title { font-weight: bold; color: #4A90E2; margin-bottom: 10px; }
          .metric-value { font-size: 18px; font-weight: bold; }
          .streak-badge { display: inline-block; background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
.footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding: 15px; }
          .unsubscribe { color: #999; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐻 Weekly Progress Report</h1>
          <p>Hi ${userName}! Here's how you did from ${weekStart} to ${weekEnd}</p>
        </div>
        
        <div class="content">
          <div class="metric-card">
            <div class="metric-title">🌅 Routines This Week</div>
            <p><strong>Morning:</strong> ${metrics.routines.morning.completed}/7 completed 
               <span class="streak-badge">${metrics.streaks.morning_routine} day streak</span></p>
            <p><strong>Evening:</strong> ${metrics.routines.evening.completed}/7 completed 
               <span class="streak-badge">${metrics.streaks.evening_routine} day streak</span></p>
            <p><strong>Micro-breaks:</strong> ${metrics.routines.micro_breaks.completed} completed</p>
          </div>

          <div class="metric-card">
            <div class="metric-title">🎯 Focus Sessions</div>
            <p><strong>Total Focus Time:</strong> <span class="metric-value">${
              metrics.focus_sessions.total_minutes
            } minutes</span></p>
            <p><strong>Sessions Completed:</strong> ${metrics.focus_sessions.sessions_count}</p>
            <p><strong>Longest Session:</strong> ${metrics.focus_sessions.longest_session} minutes</p>
            <p><strong>Focus Streak:</strong> <span class="streak-badge">${metrics.streaks.focus_mode} days</span></p>
          </div>

          <div class="metric-card">
            <div class="metric-title">✅ Tasks & Productivity</div>
            <p><strong>Tasks Completed:</strong> ${metrics.tasks.completed}</p>
            <p><strong>Completion Rate:</strong> ${Math.round(metrics.tasks.completion_rate * 100)}%</p>
          </div>


        </div>

        <div class="footer">
          <p>Keep up the great work! 🎉</p>
          <p class="unsubscribe">
            <a href="${process.env.API_URL}/user/email-preferences/unsubscribe?token=${unsubscribeToken}">
              Unsubscribe from these emails
            </a>
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Weekly Progress Report - ${weekStart} to ${weekEnd}
      
      Hi ${userName}!
      
      ROUTINES THIS WEEK:
      - Morning: ${metrics.routines.morning.completed}/7 completed (${metrics.streaks.morning_routine} day streak)
      - Evening: ${metrics.routines.evening.completed}/7 completed (${metrics.streaks.evening_routine} day streak)  
      - Micro-breaks: ${metrics.routines.micro_breaks.completed} completed
      
      FOCUS SESSIONS:
      - Total Focus Time: ${metrics.focus_sessions.total_minutes} minutes
      - Sessions Completed: ${metrics.focus_sessions.sessions_count}
      - Longest Session: ${metrics.focus_sessions.longest_session} minutes
      - Focus Streak: ${metrics.streaks.focus_mode} days
      
      TASKS & PRODUCTIVITY:
      - Tasks Completed: ${metrics.tasks.completed}
      - Completion Rate: ${Math.round(metrics.tasks.completion_rate * 100)}%
      
Keep up the great work!
      
      Unsubscribe: ${process.env.API_URL}/user/email-preferences/unsubscribe?token=${unsubscribeToken}
    `;

    return { subject, html, text };
  }

  private generateSpanishTemplate(
    userName: string,
    metrics: WeeklyProgressMetricsDto,
    unsubscribeToken: string,
  ): EmailContent {
    const weekStart = new Date(metrics.week_start).toLocaleDateString('es-ES', {
      month: 'long',
      day: 'numeric',
    });
    const weekEnd = new Date(metrics.week_end).toLocaleDateString('es-ES', {
      month: 'long',
      day: 'numeric',
    });

    const subject = `🐻 Tu Reporte de Progreso Semanal (${weekStart} - ${weekEnd})`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reporte de Progreso Semanal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4A90E2; color: white; text-align: center; padding: 20px; }
          .content { padding: 20px; }
          .metric-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .metric-title { font-weight: bold; color: #4A90E2; margin-bottom: 10px; }
          .metric-value { font-size: 18px; font-weight: bold; }
          .streak-badge { display: inline-block; background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
.footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding: 15px; }
          .unsubscribe { color: #999; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐻 Reporte de Progreso Semanal</h1>
          <p>¡Hola ${userName}! Así te fue del ${weekStart} al ${weekEnd}</p>
        </div>
        
        <div class="content">
          <div class="metric-card">
            <div class="metric-title">🌅 Rutinas Esta Semana</div>
            <p><strong>Mañana:</strong> ${metrics.routines.morning.completed}/7 completadas 
               <span class="streak-badge">${metrics.streaks.morning_routine} días seguidos</span></p>
            <p><strong>Noche:</strong> ${metrics.routines.evening.completed}/7 completadas 
               <span class="streak-badge">${metrics.streaks.evening_routine} días seguidos</span></p>
            <p><strong>Micro-descansos:</strong> ${metrics.routines.micro_breaks.completed} completados</p>
          </div>

          <div class="metric-card">
            <div class="metric-title">🎯 Sesiones de Enfoque</div>
            <p><strong>Tiempo Total de Enfoque:</strong> <span class="metric-value">${
              metrics.focus_sessions.total_minutes
            } minutos</span></p>
            <p><strong>Sesiones Completadas:</strong> ${metrics.focus_sessions.sessions_count}</p>
            <p><strong>Sesión Más Larga:</strong> ${metrics.focus_sessions.longest_session} minutos</p>
            <p><strong>Racha de Enfoque:</strong> <span class="streak-badge">${
              metrics.streaks.focus_mode
            } días</span></p>
          </div>

          <div class="metric-card">
            <div class="metric-title">✅ Tareas y Productividad</div>
            <p><strong>Tareas Completadas:</strong> ${metrics.tasks.completed}</p>
            <p><strong>Tasa de Finalización:</strong> ${Math.round(metrics.tasks.completion_rate * 100)}%</p>
          </div>


        </div>

        <div class="footer">
          <p>¡Sigue así con el gran trabajo! 🎉</p>
          <p class="unsubscribe">
            <a href="${process.env.API_URL}/user/email-preferences/unsubscribe?token=${unsubscribeToken}">
              Cancelar suscripción a estos correos
            </a>
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Reporte de Progreso Semanal - ${weekStart} al ${weekEnd}
      
      ¡Hola ${userName}!
      
      RUTINAS ESTA SEMANA:
      - Mañana: ${metrics.routines.morning.completed}/7 completadas (${metrics.streaks.morning_routine} días seguidos)
      - Noche: ${metrics.routines.evening.completed}/7 completadas (${metrics.streaks.evening_routine} días seguidos)
      - Micro-descansos: ${metrics.routines.micro_breaks.completed} completados
      
      SESIONES DE ENFOQUE:
      - Tiempo Total de Enfoque: ${metrics.focus_sessions.total_minutes} minutos
      - Sesiones Completadas: ${metrics.focus_sessions.sessions_count}
      - Sesión Más Larga: ${metrics.focus_sessions.longest_session} minutos
      - Racha de Enfoque: ${metrics.streaks.focus_mode} días
      
      TAREAS Y PRODUCTIVIDAD:
      - Tareas Completadas: ${metrics.tasks.completed}
      - Tasa de Finalización: ${Math.round(metrics.tasks.completion_rate * 100)}%
      
¡Sigue así con el gran trabajo!
      
      Cancelar suscripción: ${process.env.API_URL}/user/email-preferences/unsubscribe?token=${unsubscribeToken}
    `;

    return { subject, html, text };
  }

  private generateEnglishNoProgressTemplate(userName: string): EmailContent {
    const subject = '🐻 We miss you at FocusBear!';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>We Miss You!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4A90E2; color: white; text-align: center; padding: 20px; }
          .content { padding: 20px; }
          .message { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .cta-button { display: inline-block; background: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐻 We Miss You!</h1>
          <p>Hi ${userName}, it's been a while since your last FocusBear session</p>
        </div>
        
        <div class="content">
          <div class="message">
            <p>Hey ${userName},</p>
            <p>We noticed you haven't been active on FocusBear lately. Don't worry - we all have those times when life gets busy!</p>
            <p>Remember, even small steps count. Whether it's a 5-minute morning routine or a quick focus session, every bit of progress matters.</p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.DASHBOARD_URL}" class="cta-button">Get Back on Track</a>
          </div>

          <p>Need help getting started again? Try:</p>
          <ul>
            <li>Setting up a simple 5-minute morning routine</li>
            <li>Starting with short 15-minute focus sessions</li>
            <li>Using micro-breaks to build momentum</li>
          </ul>
        </div>

        <div class="footer">
          <p>We're here to support you! 🎯</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      We Miss You at FocusBear!
      
      Hi ${userName},
      
      We noticed you haven't been active on FocusBear lately. Don't worry - we all have those times when life gets busy!
      
      Remember, even small steps count. Whether it's a 5-minute morning routine or a quick focus session, every bit of progress matters.
      
      Get back on track: ${process.env.DASHBOARD_URL}
      
      Need help getting started again? Try:
      - Setting up a simple 5-minute morning routine
      - Starting with short 15-minute focus sessions  
      - Using micro-breaks to build momentum
      
      We're here to support you!
    `;

    return { subject, html, text };
  }

  private generateSpanishNoProgressTemplate(userName: string): EmailContent {
    const subject = '🐻 ¡Te extrañamos en FocusBear!';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>¡Te Extrañamos!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4A90E2; color: white; text-align: center; padding: 20px; }
          .content { padding: 20px; }
          .message { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .cta-button { display: inline-block; background: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐻 ¡Te Extrañamos!</h1>
          <p>Hola ${userName}, hace tiempo que no tienes una sesión en FocusBear</p>
        </div>
        
        <div class="content">
          <div class="message">
            <p>Hola ${userName},</p>
            <p>Hemos notado que no has estado activo en FocusBear últimamente. No te preocupes - todos tenemos esos momentos cuando la vida se pone ocupada.</p>
            <p>Recuerda, incluso los pasos pequeños cuentan. Ya sea una rutina matutina de 5 minutos o una sesión de enfoque rápida, cada poquito de progreso importa.</p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.DASHBOARD_URL}" class="cta-button">Volver al Camino</a>
          </div>

          <p>¿Necesitas ayuda para empezar de nuevo? Prueba:</p>
          <ul>
            <li>Configurar una rutina matutina simple de 5 minutos</li>
            <li>Empezar con sesiones de enfoque cortas de 15 minutos</li>
            <li>Usar micro-descansos para ganar impulso</li>
          </ul>
        </div>

        <div class="footer">
          <p>¡Estamos aquí para apoyarte! 🎯</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ¡Te Extrañamos en FocusBear!
      
      Hola ${userName},
      
      Hemos notado que no has estado activo en FocusBear últimamente. No te preocupes - todos tenemos esos momentos cuando la vida se pone ocupada.
      
      Recuerda, incluso los pasos pequeños cuentan. Ya sea una rutina matutina de 5 minutos o una sesión de enfoque rápida, cada poquito de progreso importa.
      
      Volver al camino: ${process.env.DASHBOARD_URL}
      
      ¿Necesitas ayuda para empezar de nuevo? Prueba:
      - Configurar una rutina matutina simple de 5 minutos
      - Empezar con sesiones de enfoque cortas de 15 minutos
      - Usar micro-descansos para ganar impulso
      
      ¡Estamos aquí para apoyarte!
    `;

    return { subject, html, text };
  }

  private generateEnglishInactivityWarningTemplate(userName: string, daysUntilDeletion: number): EmailContent {
    const subject = '⚠️ Important: Your FocusBear account will be deleted soon';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Account Deletion Warning</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #dc3545; color: white; text-align: center; padding: 20px; }
          .content { padding: 20px; }
          .warning-box { background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .warning-title { color: #856404; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; text-align: center; }
          .data-loss { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .contact-support { background: #e2e3e5; border-left: 4px solid #6c757d; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Account Deletion Warning</h1>
          <p>Hi ${userName}, your FocusBear account requires immediate attention</p>
        </div>
        
        <div class="content">
          <div class="warning-box">
            <div class="warning-title">Your account will be deleted in ${daysUntilDeletion} days</div>
            <p>We noticed you haven't been active on FocusBear for several months. As per our data retention policy, inactive accounts are automatically deleted after 6 months of inactivity.</p>
            <p><strong>Account deletion date:</strong> ${new Date(
              Date.now() + daysUntilDeletion * 24 * 60 * 60 * 1000,
            ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.DASHBOARD_URL}" class="cta-button">Reactivate My Account</a>
          </div>

          <div class="data-loss">
            <h3>What you'll lose if your account is deleted:</h3>
            <ul>
              <li>All your habit tracking data and streaks</li>
              <li>Custom routines and focus session settings</li>
              <li>Progress history and achievements</li>
              <li>Course progress and completed lessons</li>
            </ul>
          </div>

          <p><strong>To keep your account active:</strong></p>
          <ul>
            <li>Simply log into FocusBear and use any feature</li>
            <li>Complete a morning or evening routine</li>
            <li>Start a focus session</li>
            <li>Update your habits or tasks</li>
          </ul>

          <div class="contact-support">
            <p><strong>Need help?</strong> Our support team is here to assist you. Reply to this email or contact us at <a href="mailto:support@focusbear.io">support@focusbear.io</a></p>
          </div>
        </div>

        <div class="footer">
          <p>We hope to see you back soon! 🐻</p>
          <p style="font-size: 10px; color: #999;">This is an automated email. If you believe you received this in error, please contact support.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ⚠️ ACCOUNT DELETION WARNING
      
      Hi ${userName},
      
      Your FocusBear account will be deleted in ${daysUntilDeletion} days.
      
      We noticed you haven't been active on FocusBear for several months. As per our data retention policy, inactive accounts are automatically deleted after 6 months of inactivity.
      
      Account deletion date: ${new Date(Date.now() + daysUntilDeletion * 24 * 60 * 60 * 1000).toLocaleDateString(
        'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )}
      
      WHAT YOU'LL LOSE:
      - All your habit tracking data and streaks
      - Custom routines and focus session settings  
      - Progress history and achievements
      - Course progress and completed lessons
      
      TO KEEP YOUR ACCOUNT ACTIVE:
      - Log into FocusBear: ${process.env.DASHBOARD_URL}
      - Complete a morning or evening routine
      - Start a focus session
      - Update your habits or tasks
      
      Need help? Contact us at support@focusbear.io
      
      We hope to see you back soon!
    `;

    return { subject, html, text };
  }

  private generateSpanishInactivityWarningTemplate(userName: string, daysUntilDeletion: number): EmailContent {
    const subject = '⚠️ Importante: Tu cuenta de FocusBear será eliminada pronto';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Advertencia de Eliminación de Cuenta</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #dc3545; color: white; text-align: center; padding: 20px; }
          .content { padding: 20px; }
          .warning-box { background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .warning-title { color: #856404; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; text-align: center; }
          .data-loss { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .contact-support { background: #e2e3e5; border-left: 4px solid #6c757d; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Advertencia de Eliminación de Cuenta</h1>
          <p>Hola ${userName}, tu cuenta de FocusBear requiere atención inmediata</p>
        </div>
        
        <div class="content">
          <div class="warning-box">
            <div class="warning-title">Tu cuenta será eliminada en ${daysUntilDeletion} días</div>
            <p>Notamos que no has estado activo en FocusBear por varios meses. Según nuestra política de retención de datos, las cuentas inactivas se eliminan automáticamente después de 6 meses de inactividad.</p>
            <p><strong>Fecha de eliminación de cuenta:</strong> ${new Date(
              Date.now() + daysUntilDeletion * 24 * 60 * 60 * 1000,
            ).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.DASHBOARD_URL}" class="cta-button">Reactivar Mi Cuenta</a>
          </div>

          <div class="data-loss">
            <h3>Lo que perderás si tu cuenta es eliminada:</h3>
            <ul>
              <li>Todos tus datos de seguimiento de hábitos y rachas</li>
              <li>Rutinas personalizadas y configuraciones de sesiones de enfoque</li>
              <li>Historial de progreso y logros</li>
              <li>Progreso de cursos y lecciones completadas</li>
            </ul>
          </div>

          <p><strong>Para mantener tu cuenta activa:</strong></p>
          <ul>
            <li>Simplemente inicia sesión en FocusBear y usa cualquier función</li>
            <li>Completa una rutina matutina o nocturna</li>
            <li>Inicia una sesión de enfoque</li>
            <li>Actualiza tus hábitos o tareas</li>
          </ul>

          <div class="contact-support">
            <p><strong>¿Necesitas ayuda?</strong> Nuestro equipo de soporte está aquí para asistirte. Responde a este correo o contáctanos en <a href="mailto:support@focusbear.io">support@focusbear.io</a></p>
          </div>
        </div>

        <div class="footer">
          <p>¡Esperamos verte de vuelta pronto! 🐻</p>
          <p style="font-size: 10px; color: #999;">Este es un correo automatizado. Si crees que recibiste esto por error, por favor contacta a soporte.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ⚠️ ADVERTENCIA DE ELIMINACIÓN DE CUENTA
      
      Hola ${userName},
      
      Tu cuenta de FocusBear será eliminada en ${daysUntilDeletion} días.
      
      Notamos que no has estado activo en FocusBear por varios meses. Según nuestra política de retención de datos, las cuentas inactivas se eliminan automáticamente después de 6 meses de inactividad.
      
      Fecha de eliminación de cuenta: ${new Date(
        Date.now() + daysUntilDeletion * 24 * 60 * 60 * 1000,
      ).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
      
      LO QUE PERDERÁS:
      - Todos tus datos de seguimiento de hábitos y rachas
      - Rutinas personalizadas y configuraciones de sesiones de enfoque
      - Historial de progreso y logros
      - Progreso de cursos y lecciones completadas
      
      PARA MANTENER TU CUENTA ACTIVA:
      - Inicia sesión en FocusBear: ${process.env.DASHBOARD_URL}
      - Completa una rutina matutina o nocturna
      - Inicia una sesión de enfoque
      - Actualiza tus hábitos o tareas
      
      ¿Necesitas ayuda? Contáctanos en support@focusbear.io
      
      ¡Esperamos verte de vuelta pronto!
    `;

    return { subject, html, text };
  }
}
