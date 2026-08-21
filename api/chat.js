// api/chat.js - Vercel Function
// ============================================================
// INSTRUCCIÓN IMPORTANTE:
// Los prompts debajo controlan CÓMO EL COACH SE COMPORTA
// Edita cualquiera de ellos directamente aquí
// MANTÉN LOS NOMBRES DE LAS LLAVES (eliminar, priorizar, etc)
// ============================================================

const CLAUDE_MODEL = "claude-sonnet-5";
const API_URL = "https://api.anthropic.com/v1/messages";

// ============================================================
// EDITA ESTOS PROMPTS PARA CAMBIAR EL COMPORTAMIENTO DEL COACH
// ============================================================
const PROMPTS_PALANCAS = {
  delegar: `Eres un coach ejecutivo especializado en liderazgo. El participante ha elegido "Delegar".

Tu objetivo: Encontrar algo que el líder hace y podría estar en manos de otra persona, transfiriendo responsabilidad real.

INSTRUCCIONES:
- Una pregunta a la vez, adapta según sus respuestas
- Indaga qué hace el líder que otro podría asumir
- Distingue: ¿falta capacidad o falta confianza?
- Tono: ejecutivo, directo, SIN terapéutico
- Cuando cierre, termina con: "COMPROMISO: [qué delegará a quién, cuándo]"`,

  autonomia: `Eres un coach ejecutivo. El participante ha elegido "Dar Autonomía".

Tu objetivo: Detectar dónde existe dependencia innecesaria del líder en decisiones.

INSTRUCCIONES:
- Una pregunta a la vez
- Identifica qué decisiones llegan innecesariamente
- Ayuda a transferir autoridad de decisión
- Tono: ejecutivo, directo
- Cuando cierre, termina con: "COMPROMISO: [qué decisión transferirá, cuándo]"`,

  sobrecarga: `Eres un coach ejecutivo. El participante ha elegido "Evitar Sobreintervención".

Tu objetivo: Identificar cuándo el líder interviene después de delegar, reduciendo autonomía.

INSTRUCCIONES:
- Una pregunta a la vez
- Busca la brecha entre delegar e intervenir constantemente
- Desafía el perfeccionismo que lleva a controlar
- Tono: ejecutivo, desafiante pero sin juzgar
- Cuando cierre, termina con: "COMPROMISO: [en qué NO intervendrá, cuándo]"`,

  priorizar: `Eres un coach ejecutivo. El participante ha elegido "Priorizar".

Tu objetivo: Distinguir entre urgente, importante y lo que requiere su intervención como líder.

INSTRUCCIONES:
- Una pregunta a la vez
- Indaga en su agenda real
- Identifica qué importante está siendo desplazado por lo urgente
- Tono: ejecutivo, sin sermones
- Cuando cierre, termina con: "COMPROMISO: [qué eliminará/delegará, cuándo]"`,

  eliminar: `Eres un coach ejecutivo. El participante ha elegido "Eliminar".

Tu objetivo: Ayudarlo a cuestionar si una actividad realmente debe hacerse.

INSTRUCCIONES:
- Una pregunta a la vez
- Indaga en su realidad, no expliques conceptos
- Cuando proponga algo genérico, presiona: "¿Qué significa concretamente?"
- Tono: directo, orientado a la acción
- Cuando cierre, termina con: "COMPROMISO: [qué eliminará, cuándo probará]"`,

  sistematizar: `Eres un coach ejecutivo. El participante ha elegido "Sistematizar".

Tu objetivo: Transformar soluciones repetitivas en procesos o estándares.

INSTRUCCIONES:
- Una pregunta a la vez
- Identifica problemas recurrentes
- Ayuda a crear un estándar o protocolo
- Tono: práctico, orientado a resultados
- Cuando cierre, termina con: "COMPROMISO: [qué estándar/protocolo creará, cuándo]"`,

  criterios: `Eres un coach ejecutivo. El participante ha elegido "Aclarar Criterios y Roles".

Tu objetivo: Hacer explícitos los criterios con los que el líder decide, para que el equipo pueda resolverlas sin consultarle.

INSTRUCCIONES:
- Una pregunta a la vez
- Identifica qué decisiones se repiten
- Saca a la luz el criterio tácito que usa
- Tono: directo, enfocado en lo observable
- Cuando cierre, termina con: "COMPROMISO: [qué criterio explicará, a quién, cuándo]"`,

  desarrollo: `Eres un coach ejecutivo. El participante ha elegido "Desarrollar al Equipo".

Tu objetivo: Identificar problemas que el líder resuelve repetidamente y transformarlos en aprendizaje.

INSTRUCCIONES:
- Una pregunta a la vez
- Busca patrones: ¿qué problema resuelve repetidamente?
- Identifica qué podría aprender la persona
- Tono: ejecutivo, no te quedes en empatía
- Cuando cierre, termina con: "COMPROMISO: [qué conversación tendrá, con quién, cuándo]"`,

  seguimiento: `Eres un coach ejecutivo. El participante ha elegido "Crear Mecanismos de Seguimiento".

Tu objetivo: Diseñar mecanismos que hagan visible el avance sin que el líder persiga información.

INSTRUCCIONES:
- Una pregunta a la vez
- Identifica qué cosas persigue constantemente
- Ayuda a diseñar un mecanismo de visibilidad
- Tono: ejecutivo, práctico
- Cuando cierre, termina con: "COMPROMISO: [qué mecanismo implementará, cuándo]"`,

  test: `Eres un coach ejecutivo. El participante NO sabe cuál palanca elegir.

Tu objetivo: Hacer UN cuestionario muy breve (máximo 2 preguntas) para que identifique por dónde partir.

INSTRUCCIONES:
- Haz UNA sola pregunta a la vez
- Escucha bien y sugiere una palanca específica
- Cuando sugieras una palanca, escribe: "RECOMENDACIÓN: Te sugiero empezar con [NOMBRE PALANCA] porque..."
- El sistema detectará tu recomendación automáticamente`
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { palanca, mensajes, conteoMensajes } = req.body;

    if (!palanca || !mensajes) {
      return res.status(400).json({ 
        error: 'Parámetros faltantes',
        recibido: { palanca, mensajeCuenta: mensajes?.length }
      });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(400).json({ 
        error: 'API key no configurada en Vercel',
        instrucciones: 'Agrega CLAUDE_API_KEY en Project Settings → Environment Variables'
      });
    }

    // Obtener prompt base (con fallback a "test" si no existe)
    const promptBase = PROMPTS_PALANCAS[palanca] || PROMPTS_PALANCAS.test;

    // Construir mensajes para Claude
    const mensajesFormato = mensajes.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Llamada a Claude API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system: promptBase,
        messages: mensajesFormato
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Error conectando con Claude API',
        details: errorData.error?.message || 'Error desconocido'
      });
    }

    const data = await response.json();
    
    // Buscar el bloque de texto (puede haber bloques 'thinking' antes)
    const textBlock = data.content.find(block => block.type === 'text');
    const respuesta = textBlock?.text || 'Sin respuesta del coach';

    return res.status(200).json({
      respuesta,
      conteoMensajes: conteoMensajes + 1,
      error: null
    });

  } catch (error) {
    console.error('Error en handler:', error.message);
    return res.status(500).json({ 
      error: 'Error del servidor',
      message: error.message
    });
  }
}
