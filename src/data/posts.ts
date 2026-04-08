import type { LocalizedText } from "./site";

export type Post = {
  id: string;
  title: LocalizedText;
  date: string;
  summary: LocalizedText;
  slug: LocalizedText;
  content: LocalizedText;
};

export const posts: Post[] = [
  {
    id: "primer-libro",
    title: {
      es: "Como elegir el primer libro de colorear para tu peque",
      en: "How to choose your kid's first coloring book"
    },
    date: "2026-03-28",
    summary: {
      es: "Una guia breve para escoger por edad, nivel de detalle y estilo de ilustracion sin complicarte.",
      en: "A quick guide to pick by age, detail level, and illustration style without overthinking it."
    },
    slug: {
      es: "como-elegir-primer-libro-colorear",
      en: "how-to-choose-first-coloring-book"
    },
    content: {
      es: `
      <p>Elegir un libro de colorear parece simple, pero cuando hay demasiadas opciones puede volverse abrumador. La mejor referencia siempre es la experiencia real del peque con lapices, crayones y tiempo de concentracion.</p>
      <h2>Empieza por el nivel de detalle</h2>
      <p>Si recien esta empezando, busca trazos gruesos, espacios amplios y figuras faciles de identificar. Evita paginas excesivamente cargadas para que la experiencia sea divertida y no frustrante.</p>
      <h2>Observa intereses naturales</h2>
      <p>Animales, vehiculos, oceano o fantasia: cuando el tema les gusta, el tiempo de atencion mejora de forma natural. Ese es el verdadero atajo para que quieran volver a colorear.</p>
      <h2>Hazlo ritual, no tarea</h2>
      <p>Reserva un pequeno bloque semanal, sin pantallas alrededor. Con buena luz, una mesa comoda y musica suave, el momento creativo se convierte en habito.</p>
    `,
      en: `
      <p>Choosing a coloring book sounds simple, but too many options can make the process overwhelming. The best reference is always your child's real experience with pencils, crayons, and attention span.</p>
      <h2>Start with the detail level</h2>
      <p>If they are just getting started, choose bold outlines, large areas, and familiar shapes. Avoid crowded pages so the process stays playful, not frustrating.</p>
      <h2>Follow natural interests</h2>
      <p>Animals, vehicles, ocean scenes, or fantasy themes: when they care about the topic, focus improves naturally.</p>
      <h2>Make it a ritual, not a task</h2>
      <p>Reserve a small weekly time block, away from screens. Good lighting, a comfortable table, and soft music can turn coloring into a lasting habit.</p>
    `
    }
  },
  {
    id: "taller-creativo",
    title: {
      es: "3 ideas para transformar una tarde comun en taller creativo",
      en: "3 ways to turn a regular afternoon into a creative studio"
    },
    date: "2026-03-12",
    summary: {
      es: "Recursos simples para que colorear sea una actividad con juego, historia y aprendizaje.",
      en: "Simple prompts to make coloring feel playful, meaningful, and educational."
    },
    slug: {
      es: "ideas-taller-creativo-en-casa",
      en: "creative-workshop-ideas-at-home"
    },
    content: {
      es: `
      <p>No hace falta montar un estudio de arte para tener una tarde memorable. Con pocos materiales puedes crear dinamicas que mezclen juego y expresion.</p>
      <h2>1) Historias en cadena</h2>
      <p>Cada persona colorea un personaje y luego inventan una mini historia conjunta. Esto activa imaginacion y lenguaje al mismo tiempo.</p>
      <h2>2) Paleta sorpresa</h2>
      <p>Elige 4 colores al azar y utilicen solo esos tonos durante 15 minutos. Las limitaciones ayudan mucho a desbloquear creatividad.</p>
      <h2>3) Galeria familiar</h2>
      <p>Al terminar, peguen las paginas en una pared o puerta por una semana. Ver su trabajo exhibido eleva confianza y motivacion.</p>
    `,
      en: `
      <p>You do not need a full art studio to create a memorable afternoon. With just a few tools, you can build activities that blend play and expression.</p>
      <h2>1) Story chain</h2>
      <p>Each person colors one character, then everyone builds a short story together. It supports imagination and language at the same time.</p>
      <h2>2) Surprise palette</h2>
      <p>Pick 4 random colors and use only those for 15 minutes. Healthy constraints often unlock creativity.</p>
      <h2>3) Family gallery wall</h2>
      <p>Display finished pages on a wall for one week. Seeing their work celebrated boosts confidence and motivation.</p>
    `
    }
  },
  {
    id: "concentracion",
    title: {
      es: "Por que colorear ayuda a la concentracion infantil",
      en: "Why coloring improves focus in children"
    },
    date: "2026-02-25",
    summary: {
      es: "Beneficios practicos del coloreado guiado para foco, paciencia y coordinacion fina.",
      en: "Practical benefits of guided coloring for focus, patience, and fine motor skills."
    },
    slug: {
      es: "beneficios-colorear-concentracion-infantil",
      en: "benefits-of-coloring-for-focus"
    },
    content: {
      es: `
      <p>Colorear combina repeticion, decision y control motor. Esa mezcla favorece la atencion sostenida de manera natural y sin presion academica.</p>
      <h2>Atencion con objetivo claro</h2>
      <p>Completar una ilustracion ofrece una meta visible. Esa estructura ayuda a que el peque permanezca enfocado por mas tiempo.</p>
      <h2>Coordinacion y precision</h2>
      <p>Seguir lineas, elegir intensidad y respetar bordes fortalece habilidades motoras finas que luego impactan escritura y autonomia diaria.</p>
      <h2>Regulacion emocional</h2>
      <p>La actividad repetitiva y tranquila reduce sobreestimulo. Muchas familias la usan como puente entre juego activo y rutina de descanso.</p>
    `,
      en: `
      <p>Coloring combines repetition, decision-making, and motor control. This mix encourages sustained attention in a natural, low-pressure way.</p>
      <h2>Goal-oriented focus</h2>
      <p>Finishing an illustration gives kids a visible goal. That simple structure helps them stay engaged for longer periods.</p>
      <h2>Coordination and precision</h2>
      <p>Following outlines and choosing color intensity supports fine motor development, which later helps writing and daily autonomy.</p>
      <h2>Emotional regulation</h2>
      <p>The repetitive rhythm of coloring can reduce overstimulation. Many families use it as a bridge between active play and bedtime routines.</p>
    `
    }
  },
  {
    id: "materiales",
    title: {
      es: "Materiales recomendados para colorear sin manchar todo",
      en: "Best coloring materials without the mess"
    },
    date: "2026-01-30",
    summary: {
      es: "Una lista practica de herramientas seguras, limpias y faciles de guardar.",
      en: "A practical list of safe, tidy, and easy-to-store coloring supplies for kids and families at home."
    },
    slug: {
      es: "materiales-recomendados-colorear-casa",
      en: "best-coloring-supplies-for-home"
    },
    content: {
      es: `
      <p>El mejor kit no es el mas caro, sino el que invita a usarlo seguido. Aqui tienes una base funcional para empezar hoy mismo.</p>
      <h2>Lapices triangulares</h2>
      <p>Se sujetan mejor en manos pequenas y ruedan menos sobre la mesa. Son un gran primer paso.</p>
      <h2>Crayones lavables</h2>
      <p>Ideales para peques de menor edad. Si priorizas tranquilidad, los lavables son indispensables.</p>
      <h2>Estuche por categorias</h2>
      <p>Separar por tipo y color acelera el orden al finalizar y evita perder materiales cada semana.</p>
    `,
      en: `
      <p>The best kit is not the most expensive one. It is the one your family actually uses often. Here is a practical setup to start right away.</p>
      <h2>Triangular pencils</h2>
      <p>They are easier for small hands to hold and less likely to roll off the table.</p>
      <h2>Washable crayons</h2>
      <p>Perfect for younger kids and much less stressful for parents.</p>
      <h2>Category-based storage</h2>
      <p>Sorting by type and color speeds up clean-up and helps materials last longer.</p>
    `
    }
  }
];

export const postsSorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
