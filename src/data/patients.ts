import type { ConversationTopic, DialogueOption, Patient } from '../types'

export const patients: Patient[] = [
  { id: 'luna', name: 'Luna Marín', age: 9, personality: 'Curiosa y conversadora', reason: 'Una molestia ficticia en la rodilla al jugar.', procedure: 'Aventura de la rodilla brillante', difficulty: 'Fácil', emotion: 'nervioso', skin: '#d99c78', hair: '#382a24', uniform: '#edb4c8', expression: '🌼', hairStyle: 'long', accessory: 'gorra' },
  { id: 'tomas', name: 'Tomás Ríos', age: 12, personality: 'Ingenioso y un poco tímido', reason: 'Un pequeño bulto imaginario que quiere revisar.', procedure: 'Misión de la estrella escondida', difficulty: 'Normal', emotion: 'preocupado', skin: '#bd8065', hair: '#251e1c', uniform: '#9db9e1', expression: '🚀', hairStyle: 'short' },
  { id: 'alma', name: 'Alma Vega', age: 7, personality: 'Alegre y amante de los cuentos', reason: 'Una piedrita de fantasía que le causa cosquillas.', procedure: 'Expedición de la piedrita lunar', difficulty: 'Fácil', emotion: 'animado', skin: '#f2c6a5', hair: '#b97843', uniform: '#b9a5dc', expression: '🦋', hairStyle: 'curly', accessory: 'headband' },
  { id: 'bruno', name: 'Bruno Sol', age: 11, personality: 'Tranquilo y muy observador', reason: 'Una molestia ficticia en la barriga después de una aventura.', procedure: 'Viaje al valle de las burbujas', difficulty: 'Desafiante', emotion: 'tranquilo', skin: '#895b49', hair: '#47302c', uniform: '#91cbb9', expression: '🧩', hairStyle: 'short', accessory: 'glasses' },
  { id: 'ines', name: 'Inés Cruz', age: 10, personality: 'Creativa y llena de preguntas', reason: 'Una pequeña marca imaginaria que desea entender.', procedure: 'Misión de la nube viajera', difficulty: 'Normal', emotion: 'nervioso', skin: '#f2c6a5', hair: '#b85b62', uniform: '#edc18f', expression: '🎨', hairStyle: 'bun' },
]

type TopicQuestion = {
  id: string
  topic: ConversationTopic | 'risk-clarification'
  title: string
  prompt: string
  concern: string
  options: DialogueOption[]
}

const makeOptions = (
  prefix: string,
  topic: ConversationTopic | 'risk-clarification',
  responses: Array<{ text: string; trust: number; calm: number; quality: DialogueOption['quality']; comprehension: number; feedback: string }>,
): DialogueOption[] => responses.map((response, index) => ({
  ...response,
  id: `${prefix}-${index + 1}`,
  concepts: response.quality === 'empathetic' ? [topic === 'risk-clarification' ? 'risks' : topic] : [],
})) as (DialogueOption & { concepts: ConversationTopic[] })[]

export const dialogueQuestions: TopicQuestion[] = [
  {
    id: 'introduction', topic: 'introduction', title: '¿Quién estará conmigo?',
    prompt: 'Antes de empezar, quiero saber quién estará a mi lado.',
    concern: 'Preséntate y ofrece escuchar sus dudas, sin apresurar su decisión.',
    options: makeOptions('intro', 'introduction', [
      { text: 'Soy parte de tu equipo. Te escucharé y puedes preguntarme lo que necesites.', trust: 9, calm: 7, quality: 'empathetic', comprehension: 10, feedback: 'Te presentaste y abriste un espacio para preguntas.' },
      { text: 'Soy quien dirige todo. Ya veremos lo demás.', trust: 1, calm: 0, quality: 'incomplete', comprehension: 2, feedback: 'La presentación quedó incompleta; puedes explicar que también escucharás sus dudas.' },
      { text: 'No hace falta que sepas quién soy.', trust: -10, calm: -8, quality: 'inappropriate', comprehension: -2, feedback: 'La respuesta no reconoce su necesidad de saber quién le acompaña.' },
    ]),
  },
  {
    id: 'procedure', topic: 'procedure', title: '¿Qué va a pasar durante mi aventura?',
    prompt: '¿Me cuentas qué harán durante esta aventura?',
    concern: 'Explica el procedimiento de fantasía con palabras sencillas. No describas pasos médicos reales.',
    options: makeOptions('procedure', 'procedure', [
      { text: 'Te contaré cada parte de esta misión imaginaria y estaremos contigo todo el tiempo.', trust: 12, calm: 14, quality: 'empathetic', comprehension: 20, feedback: 'Explicaste la aventura y quién estará presente.' },
      { text: 'Será algo rápido. No tienes que preocuparte.', trust: 2, calm: 1, quality: 'incomplete', comprehension: 3, feedback: 'Aún no explicaste qué ocurrirá ni cómo te mantendrás a su lado.' },
      { text: 'No hagas preguntas, solo tienes que esperar.', trust: -12, calm: -10, quality: 'inappropriate', comprehension: -4, feedback: 'La respuesta cierra la conversación y no explica la aventura.' },
    ]),
  },
  {
    id: 'benefits', topic: 'benefits', title: '¿En qué me ayudará?',
    prompt: '¿Por qué hacemos esta misión? ¿Qué esperamos conseguir?',
    concern: 'Cuenta el objetivo ficticio con honestidad y sin prometer un resultado.',
    options: makeOptions('benefits', 'benefits', [
      { text: 'La misión busca ayudar con esa molestia. Te contaremos cómo va y no puedo prometer un resultado exacto.', trust: 10, calm: 8, quality: 'empathetic', comprehension: 18, feedback: 'Explicaste el objetivo y evitaste prometer un resultado.' },
      { text: 'Lo hacemos porque sí, pronto lo sabrás.', trust: 0, calm: 0, quality: 'incomplete', comprehension: 2, feedback: 'Falta explicar el objetivo de la aventura.' },
      { text: 'Seguro que después todo será perfecto.', trust: -4, calm: -2, quality: 'inappropriate', comprehension: -2, feedback: 'No es adecuado prometer que todo será perfecto.' },
    ]),
  },
  {
    id: 'risks', topic: 'risks', title: '¿Y si algo no sale como esperamos?',
    prompt: 'Me preocupa que pueda aparecer una sorpresa. ¿Qué pasaría?',
    concern: 'Habla con honestidad y sin alarmar. Esta aventura es ficticia; no ofrezcas consejos médicos.',
    options: makeOptions('risks', 'risks', [
      { text: 'A veces hay sorpresas pequeñas. El equipo estará atento, te contará qué ocurre y puede hacer una pausa.', trust: 12, calm: 10, quality: 'empathetic', comprehension: 22, feedback: 'Nombraste la posibilidad de una sorpresa y cómo se comunicará el equipo.' },
      { text: 'Todo suele salir bien, ya veremos si pasa algo.', trust: 1, calm: 0, quality: 'incomplete', comprehension: 3, feedback: 'Falta reconocer claramente que puede haber cambios o sorpresas.' },
      { text: 'No pienses en eso, no es asunto tuyo.', trust: -14, calm: -12, quality: 'inappropriate', comprehension: -5, feedback: 'No conviene ocultar sus dudas; necesita una explicación honesta.' },
    ]),
  },
  {
    id: 'recovery', topic: 'recovery', title: '¿Cómo será después?',
    prompt: '¿Qué pasará cuando termine la misión?',
    concern: 'Describe el descanso y el acompañamiento sin hacer promesas médicas.',
    options: makeOptions('recovery', 'recovery', [
      { text: 'Después podrás descansar con alguien del equipo cerca. Te contaremos qué sigue y responderemos tus dudas.', trust: 12, calm: 14, quality: 'empathetic', comprehension: 18, feedback: 'Explicaste el descanso y el acompañamiento sin asegurar resultados.' },
      { text: 'Pronto volverás a tus actividades, no te preocupes.', trust: 1, calm: 2, quality: 'incomplete', comprehension: 2, feedback: 'No podemos prometer cuándo volverá a sus actividades; explica el descanso y acompañamiento.' },
      { text: 'Eso no importa ahora, deja de preguntar.', trust: -12, calm: -10, quality: 'inappropriate', comprehension: -3, feedback: 'Su pregunta sobre después también merece una respuesta.' },
    ]),
  },
  {
    id: 'questions', topic: 'questions', title: '¿Qué más quieres preguntarme?',
    prompt: '¿Puedo hacer otra pregunta antes de decidir?',
    concern: 'Invítale a preguntar y confirma que puede pedir que se lo expliquen de nuevo.',
    options: makeOptions('questions', 'questions', [
      { text: 'Claro. ¿Qué duda tienes? Podemos repasar cualquier parte antes de que decidas.', trust: 12, calm: 10, quality: 'empathetic', comprehension: 12, feedback: 'Confirmaste que puede preguntar y volver a revisar la explicación.' },
      { text: 'Ya te expliqué lo importante.', trust: 0, calm: -1, quality: 'incomplete', comprehension: 1, feedback: 'Aún falta invitarle claramente a compartir sus dudas.' },
      { text: 'No hay tiempo para preguntas.', trust: -12, calm: -10, quality: 'inappropriate', comprehension: -3, feedback: 'La decisión requiere un espacio para preguntas, sin presión.' },
    ]),
  },
]

export const riskClarificationQuestion: TopicQuestion = {
  id: 'risk-clarification', topic: 'risk-clarification', title: '¿Me explicas otra vez las posibles sorpresas?',
  prompt: 'Sigo con dudas sobre las sorpresas. ¿Podemos hablarlo de nuevo?',
  concern: 'Puedes volver a explicar los cambios ficticios y cómo el equipo se los comunicará.',
  options: makeOptions('risk-clarification', 'risk-clarification', [
    { text: 'Sí. Podría surgir una sorpresa ficticia; el equipo te lo explicará y puede pausar para escucharte.', trust: 8, calm: 8, quality: 'empathetic', comprehension: 18, feedback: 'La explicación de riesgos ahora es más clara y permite hacer una pausa.' },
    { text: 'No te preocupes, no va a pasar nada.', trust: 0, calm: 0, quality: 'incomplete', comprehension: 1, feedback: 'No se pueden garantizar resultados; reconoce que puede haber cambios.' },
    { text: 'Ya hablamos de eso, no insistas.', trust: -8, calm: -7, quality: 'inappropriate', comprehension: -3, feedback: 'La duda sigue siendo importante; evita presionar al paciente.' },
  ]),
}
