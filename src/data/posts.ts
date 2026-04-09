import type { LocalizedText } from "./site";
import { books } from "./books";

export type Post = {
  id: string;
  title: LocalizedText;
  date: string;
  summary: LocalizedText;
  slug: LocalizedText;
  content: LocalizedText;
  bookId?: string;
  image?: string;
};

export const posts: Post[] = [
  {
    id: "primer-libro",
    image: "/images/blog/choosing-coloring-book.svg",
    title: {
      es: "Como elegir el primer libro de colorear para tu peque (sin desperdiciar dinero)",
      en: "How to choose your kid's first coloring book (without wasting money)"
    },
    date: "2026-03-28",
    summary: {
      es: "Compraste un libro de colorear y tu peque lo ignoro? El problema no fue el nino. Aqui esta la guia que necesitabas.",
      en: "Bought a coloring book your kid ignored? The problem was not the child. Here is the guide you needed."
    },
    slug: {
      es: "como-elegir-primer-libro-colorear",
      en: "how-to-choose-first-coloring-book"
    },
    content: {
      es: `
      <p>Compraste un libro de colorear que se veia perfecto en Amazon. Llego a casa, tu peque lo abrio… y lo dejo en 3 minutos. Ahora tienes un libro sin usar y la sensacion de haber tirado el dinero. <strong>No fue culpa de tu hijo — fue el libro equivocado.</strong></p>
      <h2>El error que todos cometemos</h2>
      <p>Elegimos por la portada, las resenas o el precio. Pero un libro de colorear es como zapatos: <strong>si no es la talla correcta, no importa lo bonito que sea</strong>. Un nino de 3 anos con paginas llenas de detalles diminutos se frustra. Un nino de 7 con trazos demasiado basicos se aburre. Y ambos cierran el libro para siempre.</p>
      <h2>Las 3 reglas que funcionan</h2>
      <p><strong>1. Nivel de detalle por edad:</strong> Para 2-4 anos, trazos gruesos y una figura por pagina. Para 5-7, algo mas de complejidad pero sin saturar. Para 8+, escenas mas ricas que reten sin frustrar.</p>
      <p><strong>2. El tema lo decide tu hijo:</strong> Animales, vehiculos, fantasia, moda — cuando el tema les gusta, la concentracion aparece sola. No elijas lo que <em>tu</em> crees que deberia gustarle.</p>
      <p><strong>3. Prueba antes de comprar:</strong> Busca siempre las paginas de muestra. Si tu peque puede identificar la imagen en 2 segundos, es el nivel correcto.</p>
      <h2>Hazlo ritual, no tarea</h2>
      <p>Reserva un bloque semanal sin pantallas cerca. Buena luz, mesa comoda y musica suave. Cuando colorear tiene su propio momento especial, <strong>se convierte en habito, no en obligacion</strong>.</p>
      <h2>Tu siguiente paso</h2>
      <p>Antes de abrir Amazon, observa a tu peque 5 minutos: ¿que temas le emocionan? ¿Cuanto tiempo se concentra normalmente? Con esas dos respuestas, el libro correcto se elige solo.</p>
    `,
      en: `
      <p>You bought a coloring book that looked perfect on Amazon. It arrived, your kid opened it… and abandoned it in 3 minutes. Now you have an unused book and the feeling that you wasted money. <strong>It was not your child's fault — it was the wrong book.</strong></p>
      <h2>The mistake we all make</h2>
      <p>We choose by cover, reviews, or price. But a coloring book is like shoes: <strong>if it is not the right size, it does not matter how pretty it is</strong>. A 3-year-old with tiny, detailed pages gets frustrated. A 7-year-old with overly basic shapes gets bored. And both close the book forever.</p>
      <h2>The 3 rules that work</h2>
      <p><strong>1. Detail level by age:</strong> For ages 2-4, bold outlines and one figure per page. For 5-7, more complexity without overwhelming. For 8+, richer scenes that challenge without frustrating.</p>
      <p><strong>2. Let your child pick the theme:</strong> Animals, vehicles, fantasy, fashion — when they care about the topic, focus comes naturally. Do not choose what <em>you</em> think they should like.</p>
      <p><strong>3. Preview before buying:</strong> Always look at sample pages. If your child can identify the image in 2 seconds, it is the right level.</p>
      <h2>Make it a ritual, not a task</h2>
      <p>Reserve a weekly block with no screens around. Good lighting, a comfortable table, and soft music. When coloring has its own special moment, <strong>it becomes a habit, not an obligation</strong>.</p>
      <h2>Your next step</h2>
      <p>Before opening Amazon, observe your child for 5 minutes: what topics excite them? How long do they usually focus? With those two answers, the right book picks itself.</p>
    `
    }
  },
  {
    id: "taller-creativo",
    image: "/images/blog/creative-workshop.svg",
    title: {
      es: "3 ideas para transformar una tarde aburrida en taller creativo (sin gastar un centavo)",
      en: "3 ways to turn a boring afternoon into a creative workshop (for free)"
    },
    date: "2026-03-12",
    summary: {
      es: "Tu peque dice 'estoy aburrido' cada tarde. Estas 3 dinamicas convierten lo que ya tienes en una experiencia creativa.",
      en: "Your kid says 'I am bored' every afternoon. These 3 setups turn what you already have into a creative experience."
    },
    slug: {
      es: "ideas-taller-creativo-en-casa",
      en: "creative-workshop-ideas-at-home"
    },
    content: {
      es: `
      <p>"Mama, estoy aburrido." Es martes a las 4pm, la tablet esta prohibida, la lluvia no deja salir y tu peque te mira como si fueras la directora de entretenimiento de un crucero. <strong>Necesitas un plan, y lo necesitas ya.</strong></p>
      <h2>Por que "ve a dibujar" no funciona</h2>
      <p>Poner una hoja en blanco frente a un nino aburrido es como darle un gimnasio a alguien sin motivacion — <strong>no sabra por donde empezar</strong>. Lo que necesitas es una dinamica con estructura y un poquito de emocion. No un estudio de arte, sino una excusa para crear.</p>
      <h2>1) Historias en cadena</h2>
      <p>Cada persona colorea un personaje (cualquiera) y le inventa un nombre. Despues, entre todos construyen una mini historia: "Mi unicornio conocio a tu dinosaurio en el parque y…" Esto <strong>activa imaginacion y lenguaje al mismo tiempo</strong>. Los mas timidos se sueltan cuando su personaje habla por ellos.</p>
      <h2>2) Paleta sorpresa: solo 4 colores</h2>
      <p>Mete todos los lapices en una bolsa y saca 4 al azar. Esos son los unicos colores permitidos durante 15 minutos. ¿Un arbol morado? ¿Un perro amarillo? Perfecto. <strong>Las limitaciones desbloquean creatividad</strong> — esta demostrado por la ciencia y por cualquier nino que lo haya probado.</p>
      <h2>3) Galeria familiar en la pared</h2>
      <p>Al terminar, peguen las paginas en una pared o puerta con cinta adhesiva. Dejenlas una semana. Ver su trabajo exhibido como arte real <strong>eleva su confianza de una forma que "que bonito" nunca lograra</strong>. Bonus: cuando vengan visitas, ellos explican su obra.</p>
      <h2>Tu siguiente paso</h2>
      <p>Hoy, elige UNA de estas tres ideas. Solo una. Pruebala esta semana sin expectativas. Si funciona (y va a funcionar), la proxima semana agregas otra.</p>
    `,
      en: `
      <p>"Mom, I am bored." It is Tuesday at 4pm, the tablet is off-limits, the rain is not letting anyone outside, and your kid is looking at you like you are the entertainment director of a cruise ship. <strong>You need a plan, and you need it now.</strong></p>
      <h2>Why "go draw something" does not work</h2>
      <p>Handing a blank sheet to a bored child is like giving a gym membership to someone with no motivation — <strong>they will not know where to start</strong>. What you need is an activity with structure and a little excitement. Not an art studio, just an excuse to create.</p>
      <h2>1) Story chain</h2>
      <p>Each person colors a character (any character) and gives it a name. Then together, everyone builds a mini story: "My unicorn met your dinosaur at the park and…" This <strong>activates imagination and language at the same time</strong>. Shy kids open up when their character speaks for them.</p>
      <h2>2) Surprise palette: only 4 colors</h2>
      <p>Put all pencils in a bag and pull out 4 at random. Those are the only colors allowed for 15 minutes. A purple tree? A yellow dog? Perfect. <strong>Constraints unlock creativity</strong> — this is backed by science and by every kid who has ever tried it.</p>
      <h2>3) Family gallery wall</h2>
      <p>When they finish, tape the pages to a wall or door. Leave them up for a week. Seeing their work displayed like real art <strong>builds confidence in a way that "looks nice" never will</strong>. Bonus: when guests come over, they get to explain their masterpiece.</p>
      <h2>Your next step</h2>
      <p>Today, pick ONE of these three ideas. Just one. Try it this week with zero expectations. If it works (and it will), add another one next week.</p>
    `
    }
  },
  {
    id: "concentracion",
    image: "/images/blog/focus-concentration.svg",
    title: {
      es: "Tu hijo no se concentra? Colorear podria ser la solucion que no esperabas",
      en: "Your kid cannot focus? Coloring might be the solution you did not expect"
    },
    date: "2026-02-25",
    summary: {
      es: "Antes de buscar diagnosticos, prueba esto: 15 minutos de color pueden cambiar el juego.",
      en: "Before chasing diagnoses, try this: 15 minutes of coloring might change the game."
    },
    slug: {
      es: "beneficios-colorear-concentracion-infantil",
      en: "benefits-of-coloring-for-focus"
    },
    content: {
      es: `
      <p>"No se queda quieto." "No termina nada." "En la escuela dicen que se distrae." Si alguna de estas frases te suena, probablemente ya buscaste en Google y terminaste asustado con siglas como TDAH. <strong>Antes de correr al especialista, lee esto.</strong></p>
      <h2>La concentracion no es magia — es musculo</h2>
      <p>Esperamos que los ninos se concentren 45 minutos en clase, pero <strong>nunca les ensenamos a concentrarse</strong>. Es como esperar que corran un maraton sin haber caminado al parque. La atencion sostenida se entrena, y necesita actividades con la dificultad justa: ni tan faciles que aburran, ni tan dificiles que frustren.</p>
      <h2>Por que colorear funciona (y las pantallas no)</h2>
      <p>Un videojuego cambia estimulos cada 2 segundos — el cerebro no necesita concentrarse, solo reaccionar. Colorear es lo opuesto: <strong>una tarea continua, con meta clara y feedback visual inmediato</strong>. Seguir lineas, elegir intensidad, respetar bordes — cada micro-decision mantiene al cerebro activo sin sobreestimularlo.</p>
      <h2>El efecto dominó</h2>
      <p>Las habilidades motoras finas que se entrenan coloreando (agarre del lapiz, coordinacion ojo-mano, presion controlada) son <strong>exactamente las mismas que necesita para escribir</strong>. Y la regulacion emocional que viene de la actividad repetitiva y tranquila reduce el sobreestimulo. Muchas familias la usan como puente entre juego activo y rutina de descanso.</p>
      <h2>Como empezar hoy</h2>
      <p>Pon un temporizador de 10 minutos. Sin presion, sin meta. Solo colorear con musica suave de fondo. La primera semana seran 10 minutos. La segunda, 15. Para la tercera, <strong>te va a pedir el a ti que saquen los colores</strong>.</p>
      <h2>Tu siguiente paso</h2>
      <p>La proxima vez que no se concentre, en vez de regañar, di: "¿Quieres colorear 10 minutos?" Es mas barato que un terapeuta y podria ser todo lo que necesita.</p>
    `,
      en: `
      <p>"He will not sit still." "She never finishes anything." "The school says he gets distracted." If any of these sound familiar, you have probably Googled it and ended up scared by acronyms like ADHD. <strong>Before rushing to a specialist, read this.</strong></p>
      <h2>Focus is not magic — it is a muscle</h2>
      <p>We expect kids to focus for 45 minutes in class, but <strong>we never teach them how to focus</strong>. That is like expecting them to run a marathon without ever walking to the park. Sustained attention is trained, and it needs activities with the right difficulty: not so easy they bore, not so hard they frustrate.</p>
      <h2>Why coloring works (and screens do not)</h2>
      <p>A video game changes stimuli every 2 seconds — the brain does not need to focus, just react. Coloring is the opposite: <strong>a continuous task with a clear goal and immediate visual feedback</strong>. Following outlines, choosing intensity, staying inside the lines — every micro-decision keeps the brain active without overstimulating it.</p>
      <h2>The domino effect</h2>
      <p>The fine motor skills trained by coloring (pencil grip, hand-eye coordination, controlled pressure) are <strong>exactly the same skills needed for writing</strong>. And the emotional regulation that comes from repetitive, calm activity reduces overstimulation. Many families use it as a bridge between active play and bedtime routines.</p>
      <h2>How to start today</h2>
      <p>Set a 10-minute timer. No pressure, no goal. Just coloring with soft background music. The first week it will be 10 minutes. The second, 15. By the third week, <strong>they will be the one asking you to bring out the colors</strong>.</p>
      <h2>Your next step</h2>
      <p>Next time they cannot focus, instead of scolding, say: "Want to color for 10 minutes?" It is cheaper than a therapist, and it might be all they need.</p>
    `
    }
  },
  {
    id: "materiales",
    image: "/images/blog/coloring-supplies.svg",
    title: {
      es: "La guia definitiva de materiales para colorear (sin arruinar tu sofa)",
      en: "The ultimate guide to coloring supplies (without ruining your couch)"
    },
    date: "2026-01-30",
    summary: {
      es: "Crayones en las paredes, marcadores destapados y lapices rotos. Aqui esta como elegir materiales que sobrevivan a tus hijos.",
      en: "Crayons on walls, uncapped markers, and broken pencils. Here is how to pick supplies that survive your kids."
    },
    slug: {
      es: "materiales-recomendados-colorear-casa",
      en: "best-coloring-supplies-for-home"
    },
    content: {
      es: `
      <p>Compraste la caja de 64 crayones porque se veia increible. Dos dias despues: 8 rotos, 3 en el sofa, 1 derretido quien-sabe-donde, y tu hijo solo usa el azul. <strong>Suena familiar?</strong></p>
      <h2>El problema no son los ninos — es comprar sin estrategia</h2>
      <p>El pasillo de arte para ninos es una trampa de marketing. Cajas enormes, colores "especiales", glitter que <strong>nunca sale de la alfombra</strong>. La realidad es que el mejor kit no es el mas grande ni el mas caro — es el que tu familia realmente usa sin que termines limpiando una hora despues.</p>
      <h2>Lo que realmente necesitas (por edad)</h2>
      <p><strong>2-3 anos: Crayones gruesos lavables.</strong> Son indestructibles, faciles de agarrar y se limpian de paredes con una toallita humeda. Punto. No necesitas nada mas a esta edad.</p>
      <p><strong>4-6 anos: Lapices triangulares.</strong> Se sujetan mejor en manos pequeñas, no ruedan de la mesa y duran mucho mas que los redondos. Compra un set de 12 colores basicos — los ninos no necesitan 64 tonos de verde.</p>
      <p><strong>7+ anos: Marcadores de punta fina lavables.</strong> Para ninos que ya controlan la presion. Asegurate de que sean cap-snap (la tapa suena al cerrar) para evitar secar markers destapados.</p>
      <h2>El secreto: organizacion simple</h2>
      <p>Un estuche o vaso separado por tipo (lapices juntos, crayones juntos) <strong>reduce el caos en un 80%</strong>. Si guardar toma mas de 30 segundos, tu hijo no lo hara. Hazlo tan facil que no tenga excusa.</p>
      <h2>Lo que NO deberias comprar</h2>
      <p>Pinturas de dedo (a menos que ames limpiar), acuarelas sueltas (se destapan y secan), sets "profesionales" con 120 piezas (abruman y terminan en el piso). <strong>Menos es mas, especialmente con ninos menores de 6.</strong></p>
      <h2>Tu siguiente paso</h2>
      <p>Revisa lo que ya tienes. Tira lo seco y lo roto. Organiza lo que sirve en un solo contenedor. Eso es todo — ya tienes el kit perfecto.</p>
    `,
      en: `
      <p>You bought the 64-crayon box because it looked amazing. Two days later: 8 broken, 3 on the couch, 1 melted somewhere unknown, and your kid only uses the blue one. <strong>Sound familiar?</strong></p>
      <h2>The problem is not the kids — it is buying without a strategy</h2>
      <p>The children's art aisle is a marketing trap. Giant boxes, "special" colors, glitter that <strong>never comes out of the carpet</strong>. The truth is the best kit is not the biggest or the most expensive — it is the one your family actually uses without you spending an hour cleaning up afterward.</p>
      <h2>What you actually need (by age)</h2>
      <p><strong>Ages 2-3: Thick washable crayons.</strong> They are indestructible, easy to grip, and wipe off walls with a damp cloth. Period. You do not need anything else at this age.</p>
      <p><strong>Ages 4-6: Triangular pencils.</strong> They are easier for small hands to hold, do not roll off the table, and last much longer than round ones. Buy a set of 12 basic colors — kids do not need 64 shades of green.</p>
      <p><strong>Ages 7+: Fine-tip washable markers.</strong> For kids who already control pressure. Make sure they are cap-snap (the cap clicks shut) to avoid dried-out uncapped markers.</p>
      <h2>The secret: simple organization</h2>
      <p>A case or cup separated by type (pencils together, crayons together) <strong>reduces chaos by 80%</strong>. If putting things away takes more than 30 seconds, your kid will not do it. Make it so easy they have no excuse.</p>
      <h2>What you should NOT buy</h2>
      <p>Finger paints (unless you love cleaning), loose watercolors (they dry out), "professional" sets with 120 pieces (overwhelming and end up on the floor). <strong>Less is more, especially with kids under 6.</strong></p>
      <h2>Your next step</h2>
      <p>Go through what you already own. Toss what is dried out or broken. Organize what works into one container. That is it — you already have the perfect kit.</p>
    `
    }
  },
  // ── Book-specific posts (P.A.S. formula) ──────────────────
  {
    id: "fantasia-imaginacion",
    bookId: "magical-creatures",
    image: "/images/blog/fantasy-coloring.svg",
    title: {
      es: "Como colorear criaturas fantasticas despierta la imaginacion infantil",
      en: "How fantasy coloring sparks imagination and problem-solving in kids"
    },
    date: "2026-04-05",
    summary: {
      es: "Unicornios, dragones y sirenas no son solo diversion: entrenan el pensamiento creativo de tu peque.",
      en: "Unicorns, dragons, and mermaids are not just fun — they train your child's creative thinking."
    },
    slug: {
      es: "colorear-fantasia-imaginacion-infantil",
      en: "fantasy-coloring-sparks-imagination"
    },
    content: {
      es: `
      <p>Tu peque pasa horas frente a una pantalla y cuando la apagas... no sabe que hacer. La creatividad necesita un empujon, y los mundos fantasticos son el trampolín perfecto.</p>
      <h2>La fantasia no es perder el tiempo</h2>
      <p>Estudios en desarrollo infantil muestran que <strong>inventar escenarios imposibles</strong> fortalece el pensamiento abstracto. Cuando un niño decide de que color es un dragon, esta tomando decisiones sin miedo a equivocarse.</p>
      <h2>Del papel a la resolucion de problemas</h2>
      <p>Colorear una sirena bajo el mar obliga a pensar: ¿que colores tiene el agua profunda? ¿Y las escamas? Esas micro-decisiones entrenan la misma parte del cerebro que resuelve problemas en la escuela.</p>
      <h2>Como aprovecharlo al maximo</h2>
      <p>Mientras colorean, pregunta: "¿Donde vive este dragon? ¿Que come?". Convertir la pagina en una historia multiplica el beneficio creativo. <strong>Magical Creatures</strong> esta disenado exactamente para eso: unicornios, sirenas y dragones en paginas amplias que invitan a imaginar.</p>
      <h2>Tu siguiente paso</h2>
      <p>Apaga la pantalla, abre una pagina de fantasia y deja que la imaginacion haga el resto. A veces el mejor juguete es un lapiz de color.</p>
    `,
      en: `
      <p>Your kid spends hours glued to a screen, and when you turn it off… they have no idea what to do. Creativity needs a nudge, and fantasy worlds are the perfect launchpad.</p>
      <h2>Fantasy is not wasting time</h2>
      <p>Child development research shows that <strong>inventing impossible scenarios</strong> strengthens abstract thinking. When a child decides what color a dragon should be, they are making decisions without fear of being wrong.</p>
      <h2>From paper to problem-solving</h2>
      <p>Coloring a mermaid underwater forces real thinking: what color is deep water? What about scales? Those micro-decisions train the same part of the brain that solves problems at school.</p>
      <h2>How to maximize the benefit</h2>
      <p>While they color, ask: "Where does this dragon live? What does it eat?" Turning the page into a story multiplies the creative payoff. <strong>Magical Creatures</strong> is designed exactly for this: unicorns, mermaids, and dragons on spacious pages that invite imagination.</p>
      <h2>Your next step</h2>
      <p>Turn off the screen, open a fantasy page, and let imagination do the rest. Sometimes the best toy is a colored pencil.</p>
    `
    }
  },
  {
    id: "moda-teens",
    bookId: "chic-styles",
    image: "/images/blog/fashion-teens.svg",
    title: {
      es: "Por que colorear moda es el escape creativo perfecto para adolescentes",
      en: "Why fashion coloring is the perfect creative outlet for teens"
    },
    date: "2026-03-22",
    summary: {
      es: "Los teens necesitan expresarse sin presion: la moda sobre papel es terapia creativa disfrazada.",
      en: "Teens need pressure-free self-expression: fashion on paper is creative therapy in disguise."
    },
    slug: {
      es: "colorear-moda-escape-creativo-teens",
      en: "fashion-coloring-creative-outlet-teens"
    },
    content: {
      es: `
      <p>Tu adolescente esta estresado, pegado al telefono y "aburrido de todo". ¿Suena familiar? El problema no es falta de actividades, es falta de una salida creativa sin juicio.</p>
      <h2>El estres adolescente es real</h2>
      <p>Presion escolar, redes sociales, comparacion constante. Sin una valvula de escape, la ansiedad se acumula. Colorear no es "de ninitos" — es <strong>meditacion activa</strong> que baja el cortisol sin que se den cuenta.</p>
      <h2>La moda como lenguaje personal</h2>
      <p>Elegir colores para un outfit es tomar decisiones esteticas sin consecuencias. ¿Rosa neon con verde lima? Perfecto. Aqui no hay errores, solo estilo propio.</p>
      <h2>Una actividad que no da verguenza</h2>
      <p><strong>Chic Styles</strong> tiene disenos sofisticados que un adolescente no sentiria infantiles: looks modernos, vintage y combinaciones que invitan a experimentar. Es el tipo de libro que dejan abierto sobre la mesa, no escondido.</p>
      <h2>Tu siguiente paso</h2>
      <p>Deja el libro donde lo vean. Sin presion, sin instrucciones. La curiosidad hara el resto.</p>
    `,
      en: `
      <p>Your teenager is stressed, glued to their phone, and "bored of everything." Sound familiar? The problem is not a lack of activities — it is a lack of judgment-free creative expression.</p>
      <h2>Teen stress is real</h2>
      <p>School pressure, social media, constant comparison. Without an outlet, anxiety builds up. Coloring is not "for little kids" — it is <strong>active meditation</strong> that lowers cortisol without them even noticing.</p>
      <h2>Fashion as a personal language</h2>
      <p>Choosing colors for an outfit means making aesthetic decisions with zero consequences. Neon pink with lime green? Go for it. No mistakes here, only personal style.</p>
      <h2>An activity that does not feel embarrassing</h2>
      <p><strong>Chic Styles</strong> features sophisticated designs a teenager would not find childish: modern looks, vintage vibes, and combinations that invite experimentation. It is the kind of book they leave open on the table, not hidden away.</p>
      <h2>Your next step</h2>
      <p>Leave the book where they can see it. No pressure, no instructions. Curiosity will do the rest.</p>
    `
    }
  },
  {
    id: "vestir-confianza",
    bookId: "dresses-and-dolls",
    image: "/images/blog/dress-confidence.svg",
    title: {
      es: "Como colorear vestidos y munecas fortalece la confianza de las ninas",
      en: "How dress-up coloring builds confidence and self-expression"
    },
    date: "2026-03-15",
    summary: {
      es: "Disenar outfits sobre papel entrena la toma de decisiones y refuerza la autoestima.",
      en: "Designing outfits on paper trains decision-making and builds self-esteem in young girls."
    },
    slug: {
      es: "colorear-vestidos-confianza-ninas",
      en: "dress-up-coloring-builds-confidence"
    },
    content: {
      es: `
      <p>Tu hija quiere elegir su propia ropa pero termina frustrada porque "nada combina". Esa frustracion es normal — solo le falta un espacio seguro para experimentar.</p>
      <h2>La moda empieza en el papel</h2>
      <p>Antes de abrir el closet, pueden explorar combinaciones sin limite. <strong>Colorear vestidos y accesorios</strong> permite probar ideas locas sin gastar dinero ni discutir en la manana.</p>
      <h2>Decisiones pequenas, confianza grande</h2>
      <p>Cada vez que elige un color para un vestido, esta practicando tomar decisiones y defender su gusto. Esas micro-victorias se acumulan y se notan fuera del papel.</p>
      <h2>De la pagina al mundo real</h2>
      <p><strong>Dresses and Dolls</strong> tiene munecas y vestidos disenados para que las ninas creen sus propias combinaciones. El resultado siempre es "correcto" porque lo decidieron ellas.</p>
      <h2>Tu siguiente paso</h2>
      <p>Sientate a colorear juntas. Pregunta: "¿Por que elegiste esos colores?" Esa conversacion vale oro.</p>
    `,
      en: `
      <p>Your daughter wants to pick her own outfits but ends up frustrated because "nothing matches." That frustration is normal — she just needs a safe space to experiment.</p>
      <h2>Fashion starts on paper</h2>
      <p>Before opening the closet, she can explore unlimited combinations. <strong>Coloring dresses and accessories</strong> lets her try wild ideas without spending money or arguing in the morning.</p>
      <h2>Small decisions, big confidence</h2>
      <p>Every time she picks a color for a dress, she is practicing decision-making and owning her taste. Those micro-wins add up and show outside the page.</p>
      <h2>From the page to the real world</h2>
      <p><strong>Dresses and Dolls</strong> features dolls and dresses designed for girls to create their own combinations. The result is always "right" because they decided it.</p>
      <h2>Your next step</h2>
      <p>Sit down and color together. Ask: "Why did you choose those colors?" That conversation is worth gold.</p>
    `
    }
  },
  {
    id: "moda-historia",
    bookId: "style-time-machine",
    image: "/images/blog/fashion-history.svg",
    title: {
      es: "Una leccion de historia divertida a traves de la moda y el color",
      en: "A fun history lesson through fashion: coloring across decades"
    },
    date: "2026-03-05",
    summary: {
      es: "Vestidos victorianos junto a sneakers modernos: aprender historia sin aburrirse es posible.",
      en: "Victorian dresses next to modern sneakers: learning history without boredom is possible."
    },
    slug: {
      es: "leccion-historia-moda-colorear",
      en: "fashion-history-coloring-activity"
    },
    content: {
      es: `
      <p>"La historia es aburrida." Si tu peque ha dicho eso, no es culpa suya — es culpa de como se la presentan. ¿Que tal si la historia entrara por los colores en vez de por los textos?</p>
      <h2>La ropa cuenta la historia de cada epoca</h2>
      <p>Los vestidos largos, los sombreros enormes, los jeans rotos: <strong>cada estilo refleja como vivia la gente</strong>. Cuando un nino colorea un outfit de otra decada, absorbe contexto cultural sin darse cuenta.</p>
      <h2>Comparar epocas sin examen</h2>
      <p>Pon una pagina de estilo clasico junto a una moderna y pregunta: "¿Cual te gusta mas? ¿Por que crees que vestian asi?" Esa conversacion casual enseña mas que una hora de clase.</p>
      <h2>El libro perfecto para este viaje</h2>
      <p><strong>Style Time Machine</strong> mezcla looks de diferentes epocas en un formato que funciona para ninos, teens y hasta adultos. Es como un museo de moda que puedes colorear.</p>
      <h2>Tu siguiente paso</h2>
      <p>Elige una decada, coloreen juntos y busquen en internet como se vestia la gente en esa epoca. Historia + arte + tecnologia en 30 minutos.</p>
    `,
      en: `
      <p>"History is boring." If your kid has said that, it is not their fault — it is how history is presented. What if it came through colors instead of textbooks?</p>
      <h2>Clothing tells the story of every era</h2>
      <p>Long dresses, oversized hats, ripped jeans: <strong>every style reflects how people lived</strong>. When a child colors an outfit from another decade, they absorb cultural context without even realizing it.</p>
      <h2>Comparing eras without a test</h2>
      <p>Place a classic-style page next to a modern one and ask: "Which do you like better? Why do you think people dressed that way?" That casual conversation teaches more than an hour of class.</p>
      <h2>The perfect book for this journey</h2>
      <p><strong>Style Time Machine</strong> blends looks from different eras in a format that works for kids, teens, and even adults. Think of it as a fashion museum you can color.</p>
      <h2>Your next step</h2>
      <p>Pick a decade, color together, and search online how people dressed back then. History + art + technology in 30 minutes.</p>
    `
    }
  },
  {
    id: "rincon-calma",
    bookId: "cozy-kids-club",
    image: "/images/blog/calm-corner.svg",
    title: {
      es: "Como crear un rincon de calma con colorear para ninos ansiosos",
      en: "How to create a calm-down corner with coloring for anxious kids"
    },
    date: "2026-02-20",
    summary: {
      es: "Un espacio tranquilo + paginas sencillas = la herramienta anti-ansiedad que no sabias que necesitabas.",
      en: "A quiet space + simple pages = the anti-anxiety tool you did not know you needed."
    },
    slug: {
      es: "rincon-calma-colorear-ninos-ansiosos",
      en: "calm-down-corner-coloring-anxious-kids"
    },
    content: {
      es: `
      <p>Tu peque tiene rabietas, se frustra rapido o le cuesta calmarse despues de una emocion fuerte. No estas solo — y no necesitas un terapeuta para dar el primer paso.</p>
      <h2>¿Por que un rincon de calma funciona?</h2>
      <p>Los ninos necesitan un <strong>lugar fisico</strong> asociado con tranquilidad. Sin ese espacio, "calmate" es solo una palabra vacia. Un cojin, buena luz y un libro de colorear transforman un rincon en una herramienta real.</p>
      <h2>Paginas simples = menos frustracion</h2>
      <p>Cuando un nino esta agitado, una pagina muy detallada empeora las cosas. Necesitas trazos gruesos, figuras claras y espacios amplios que den sensacion de logro rapido.</p>
      <h2>Armalo en 5 minutos</h2>
      <p>Cojin en el piso, lapices en un vaso y <strong>The Cozy Kids' Club</strong> abierto en cualquier pagina. Sus ilustraciones tiernas y faciles estan pensadas para momentos tranquilos, no para frustrar. Cuando tu peque se altere, solo di: "¿Quieres ir a tu rincon?"</p>
      <h2>Tu siguiente paso</h2>
      <p>Elige un rincon de la casa hoy. No tiene que ser perfecto — solo consistente. El habito se construye con repeticion, no con decoracion.</p>
    `,
      en: `
      <p>Your child has meltdowns, gets frustrated quickly, or struggles to calm down after big emotions. You are not alone — and you do not need a therapist to take the first step.</p>
      <h2>Why does a calm-down corner work?</h2>
      <p>Kids need a <strong>physical space</strong> linked to feeling calm. Without it, "calm down" is just an empty phrase. A cushion, good lighting, and a coloring book turn a corner into a real tool.</p>
      <h2>Simple pages = less frustration</h2>
      <p>When a child is agitated, a super-detailed page makes things worse. You need bold outlines, clear shapes, and large spaces that give a quick sense of accomplishment.</p>
      <h2>Set it up in 5 minutes</h2>
      <p>Cushion on the floor, pencils in a cup, and <strong>The Cozy Kids' Club</strong> open to any page. Its cute and easy illustrations are made for calm moments, not for frustration. When your kid gets upset, just say: "Want to go to your corner?"</p>
      <h2>Your next step</h2>
      <p>Pick a corner of your home today. It does not have to be perfect — just consistent. The habit is built through repetition, not decoration.</p>
    `
    }
  },
  {
    id: "sin-pantallas-ninos",
    bookId: "awesome-boys",
    image: "/images/blog/screen-free.svg",
    title: {
      es: "Actividades sin pantalla que los ninos realmente disfrutan (y no son deportes)",
      en: "Screen-free activities boys actually love (that are not sports)"
    },
    date: "2026-02-12",
    summary: {
      es: "No todos los ninos quieren correr: aqui hay opciones creativas que realmente los enganchan.",
      en: "Not every boy wants to run around: here are creative options that actually hook them."
    },
    slug: {
      es: "actividades-sin-pantalla-ninos-creativos",
      en: "screen-free-activities-boys-love"
    },
    content: {
      es: `
      <p>"Apaga la tablet." Lo dices, empieza el drama, y al final cedes porque no tienes una alternativa que realmente le interese. El problema no es la pantalla — es que no ha encontrado algo mejor.</p>
      <h2>El error: creer que "sin pantalla" = deportes</h2>
      <p>No todos los ninos son deportistas, y esta bien. Pero si la unica alternativa que ofreces es salir a correr, <strong>el telefono siempre ganara</strong>.</p>
      <h2>Actividades que funcionan de verdad</h2>
      <p><strong>Colorear con temas que les gustan:</strong> naves, monstruos, personajes con actitud. Si la pagina parece "de bebe", la rechazaran en 3 segundos. Necesitas ilustraciones dinamicas, con accion y personalidad.</p>
      <p><strong>Construir + colorear:</strong> colorea un vehiculo, recortalo, pega en carton. Ahora tiene un juguete que el mismo creo.</p>
      <h2>El libro que no parece "de colorear"</h2>
      <p><strong>Awesome Boys Coloring Book</strong> tiene ilustraciones pensadas para ninos que quieren accion, no flores. Escenas llamativas y personajes con energia que los mantienen interesados.</p>
      <h2>Tu siguiente paso</h2>
      <p>Hoy, en vez de decir "apaga eso", pon los colores sobre la mesa sin decir nada. La curiosidad es mas poderosa que cualquier regla.</p>
    `,
      en: `
      <p>"Turn off the tablet." You say it, the drama starts, and you give in because you have no alternative that actually interests them. The problem is not the screen — it is that they have not found something better.</p>
      <h2>The mistake: thinking screen-free = sports</h2>
      <p>Not every boy is an athlete, and that is fine. But if the only alternative you offer is "go run outside," <strong>the phone will always win</strong>.</p>
      <h2>Activities that actually work</h2>
      <p><strong>Coloring with themes they care about:</strong> spaceships, monsters, characters with attitude. If the page looks "babyish," they will reject it in 3 seconds. You need dynamic, action-packed illustrations.</p>
      <p><strong>Build + color:</strong> color a vehicle, cut it out, glue it on cardboard. Now they have a toy they created themselves.</p>
      <h2>The book that does not look like "a coloring book"</h2>
      <p><strong>Awesome Boys Coloring Book</strong> has illustrations designed for boys who want action, not flowers. Bold scenes and energetic characters that keep them engaged.</p>
      <h2>Your next step</h2>
      <p>Today, instead of saying "turn that off," place the colors on the table without a word. Curiosity is more powerful than any rule.</p>
    `
    }
  },
  {
    id: "pascua-familia",
    bookId: "enchanted-easter",
    image: "/images/blog/easter-family.svg",
    title: {
      es: "5 actividades de Pascua con colorear que toda la familia disfrutara",
      en: "5 Easter coloring activities the whole family can enjoy"
    },
    date: "2026-02-05",
    summary: {
      es: "Transforma la Pascua en algo mas que chocolate: ideas creativas para hacer juntos.",
      en: "Turn Easter into more than chocolate: creative ideas the whole family can do together."
    },
    slug: {
      es: "actividades-pascua-colorear-familia",
      en: "easter-coloring-activities-family"
    },
    content: {
      es: `
      <p>Otro ano, otra Pascua donde los ninos comen chocolate, buscan huevos y en 20 minutos "ya se aburrieron". ¿Y si este ano la celebracion durara toda la tarde?</p>
      <h2>1. Huevos de papel personalizados</h2>
      <p>Cada miembro de la familia colorea un huevo con su propio estilo. Recortenlos y armen una guirnalda. <strong>Decoracion casera en 15 minutos.</strong></p>
      <h2>2. Busqueda de colores</h2>
      <p>Esconde paginas de colorear por la casa. Quien encuentre una, la colorea antes de buscar la siguiente. Combina movimiento + creatividad.</p>
      <h2>3. Concurso del conejito mas loco</h2>
      <p>Todos colorean el mismo conejo con los colores mas inesperados. Voten por el mas creativo. Sin perdedores, solo risas.</p>
      <h2>4. Tarjetas de Pascua hechas a mano</h2>
      <p>Coloreen una pagina, doblenla y escriban un mensaje adentro. Regalarla a un abuelo o vecino ensena generosidad sin discursos.</p>
      <h2>5. El libro ideal para todo esto</h2>
      <p><strong>Enchanted Easter</strong> tiene conejitos, huevos decorados y escenas primaverales disenadas para disfrutar en familia. Perfecto para todas estas actividades.</p>
      <h2>Tu siguiente paso</h2>
      <p>Elige una actividad, solo una, y pruebala esta Pascua. Si funciona, el proximo ano tendras cinco.</p>
    `,
      en: `
      <p>Another year, another Easter where kids eat chocolate, hunt for eggs, and get bored in 20 minutes. What if this year the celebration lasted all afternoon?</p>
      <h2>1. Custom paper eggs</h2>
      <p>Each family member colors an egg with their own style. Cut them out and make a garland. <strong>Homemade decoration in 15 minutes.</strong></p>
      <h2>2. Color scavenger hunt</h2>
      <p>Hide coloring pages around the house. Whoever finds one must color it before searching for the next. Movement + creativity combined.</p>
      <h2>3. Wildest bunny contest</h2>
      <p>Everyone colors the same bunny with the most unexpected colors. Vote for the most creative. No losers, only laughs.</p>
      <h2>4. Handmade Easter cards</h2>
      <p>Color a page, fold it, and write a message inside. Giving it to a grandparent or neighbor teaches generosity without lectures.</p>
      <h2>5. The ideal book for all of this</h2>
      <p><strong>Enchanted Easter</strong> has bunnies, decorated eggs, and spring scenes designed for family enjoyment. Perfect for all these activities.</p>
      <h2>Your next step</h2>
      <p>Pick one activity, just one, and try it this Easter. If it works, next year you will have all five.</p>
    `
    }
  },
  {
    id: "nombrar-emociones",
    bookId: "coloring-emotions",
    image: "/images/blog/naming-feelings.svg",
    title: {
      es: "Ensenar a los ninos a nombrar sus emociones (sin charlas incomodas)",
      en: "Teaching kids to name their feelings (without awkward talks)"
    },
    date: "2026-01-25",
    summary: {
      es: "Cuando un nino no puede nombrar lo que siente, lo expresa de formas que no entendemos.",
      en: "When a child cannot name what they feel, they express it in ways we do not understand."
    },
    slug: {
      es: "ensenar-ninos-nombrar-emociones-colorear",
      en: "teaching-kids-name-feelings-coloring"
    },
    content: {
      es: `
      <p>Tu peque llora "sin razon", tiene explosiones de ira o se cierra y no habla. No es que no sienta — es que <strong>no tiene palabras para lo que siente</strong>. Y eso es frustrante para todos.</p>
      <h2>El vocabulario emocional se entrena</h2>
      <p>Los adultos decimos "estoy ansioso" o "me siento abrumado". Un nino de 5 anos no tiene esas palabras. Sin vocabulario, las emociones salen como gritos, golpes o silencio.</p>
      <h2>El color como traductor</h2>
      <p>Preguntale: "¿De que color se siente tu enojo?" Eso es mas facil que "explícame que sientes". El color es un <strong>puente entre la emocion y la palabra</strong>.</p>
      <h2>Un libro disenado para esto</h2>
      <p><strong>Coloring Emotions</strong> tiene actividades especificas para identificar y expresar sentimientos. No es un libro de colorear comun: cada pagina es una herramienta de inteligencia emocional disfrazada de diversion.</p>
      <h2>Tu siguiente paso</h2>
      <p>Esta noche, pregunta: "¿Como te sientes hoy? ¿De que color seria?" Escucha la respuesta. Ese es el primer paso.</p>
    `,
      en: `
      <p>Your child cries "for no reason," has angry outbursts, or shuts down completely. It is not that they do not feel — it is that <strong>they do not have words for what they feel</strong>. And that is frustrating for everyone.</p>
      <h2>Emotional vocabulary is trained</h2>
      <p>Adults say "I feel anxious" or "I am overwhelmed." A 5-year-old does not have those words. Without vocabulary, emotions come out as screaming, hitting, or silence.</p>
      <h2>Color as a translator</h2>
      <p>Ask them: "What color does your anger feel like?" That is easier than "explain what you feel." Color is a <strong>bridge between emotion and language</strong>.</p>
      <h2>A book designed for this</h2>
      <p><strong>Coloring Emotions</strong> has specific activities for identifying and expressing feelings. It is not a regular coloring book: every page is an emotional intelligence tool disguised as fun.</p>
      <h2>Your next step</h2>
      <p>Tonight, ask: "How are you feeling today? What color would it be?" Listen to the answer. That is the first step.</p>
    `
    }
  },
  {
    id: "comida-creatividad",
    bookId: "pizza-sweet-treats",
    image: "/images/blog/food-picky-eaters.svg",
    title: {
      es: "Como las paginas de comida para colorear hacen a los ninos menos exigentes con la comida",
      en: "How food coloring pages make picky eaters more adventurous"
    },
    date: "2026-01-15",
    summary: {
      es: "Si tu peque rechaza todo lo que no sean nuggets, el problema puede empezar en lo visual.",
      en: "If your child rejects everything that is not nuggets, the issue might start with how food looks."
    },
    slug: {
      es: "paginas-comida-colorear-ninos-exigentes",
      en: "food-coloring-pages-picky-eaters"
    },
    content: {
      es: `
      <p>Otro plato rechazado. "No me gusta." Ni siquiera lo probo. Si la batalla de la cena te suena, no estas solo. Pero ¿y si el problema no es el sabor sino la <strong>falta de familiaridad visual</strong>?</p>
      <h2>Los ninos comen con los ojos primero</h2>
      <p>Estudios de nutricion infantil muestran que los ninos aceptan mejor alimentos que ya han <strong>visto y manipulado</strong> fuera del plato. Colorear comida cuenta como exposicion positiva.</p>
      <h2>De la pagina al plato</h2>
      <p>Cuando tu peque colorea una pizza sonriente o un helado divertido, esa comida deja de ser "desconocida". La proxima vez que la vea en el plato, el cerebro dice: "Ah, eso ya lo conozco."</p>
      <h2>Actividad extra: menu del dia</h2>
      <p>Deja que coloree su comida favorita y la pegue en la nevera como "menu del dia". Cuando participan en la decision, comen mejor. <strong>Pizza & Sweet Treats</strong> tiene paginas perfectas para esto: pizzas, postres, frutas y helados que los peques querran "probar" despues.</p>
      <h2>Tu siguiente paso</h2>
      <p>Esta semana, coloreen juntos una comida que tu peque normalmente rechaza. Despues, ofrecela en la cena. Sin presion, solo exposicion.</p>
    `,
      en: `
      <p>Another plate rejected. "I do not like it." They did not even try it. If dinnertime battles sound familiar, you are not alone. But what if the problem is not taste but a <strong>lack of visual familiarity</strong>?</p>
      <h2>Kids eat with their eyes first</h2>
      <p>Child nutrition research shows that kids accept foods better when they have <strong>seen and interacted with them</strong> outside the plate. Coloring food counts as positive exposure.</p>
      <h2>From the page to the plate</h2>
      <p>When your child colors a smiling pizza or a fun ice cream cone, that food stops being "unknown." The next time they see it on a plate, the brain says: "Oh, I know that."</p>
      <h2>Bonus activity: menu of the day</h2>
      <p>Let them color their favorite food and stick it on the fridge as the "daily menu." When they participate in the decision, they eat better. <strong>Pizza & Sweet Treats</strong> has perfect pages for this: pizzas, cupcakes, fruits, and ice cream that kids will want to "try" afterward.</p>
      <h2>Your next step</h2>
      <p>This week, color a food your child usually rejects. Then offer it at dinner. No pressure, just exposure.</p>
    `
    }
  },
  {
    id: "ninas-confianza",
    bookId: "awesome-girls",
    image: "/images/blog/confident-girls.svg",
    title: {
      es: "Criar ninas seguras: como el juego creativo construye autoestima",
      en: "Raising confident girls: how creative play builds self-esteem"
    },
    date: "2026-01-05",
    summary: {
      es: "La confianza no se ensena con discursos: se construye con experiencias donde ellas deciden.",
      en: "Confidence is not taught through speeches: it is built through experiences where they decide."
    },
    slug: {
      es: "criar-ninas-seguras-juego-creativo",
      en: "creative-play-builds-confidence-girls"
    },
    content: {
      es: `
      <p>"No me sale bien." Si tu hija dice eso cada vez que intenta algo nuevo, no es falta de talento. Es falta de <strong>experiencias donde no exista "mal" o "bien"</strong>.</p>
      <h2>El perfeccionismo infantil es una trampa</h2>
      <p>Las ninas, en promedio, reciben mas mensajes de "se buena" y "hazlo bien" que los ninos. Eso puede crear un miedo invisible a equivocarse que frena creatividad y autoestima.</p>
      <h2>El antidoto: actividades sin nota</h2>
      <p>Colorear es un espacio donde <strong>no hay respuesta correcta</strong>. Un gato morado, un cielo rosa, una flor negra: todo vale. Esa libertad reprograma la relacion con el error.</p>
      <h2>Temas que refuerzan identidad</h2>
      <p><strong>Awesome Girls</strong> muestra personajes femeninos fuertes, animales adorables y escenas que inspiran confianza. No es "colorear por colorear" — cada pagina dice: "Tu decides como se ve el mundo."</p>
      <h2>Tu siguiente paso</h2>
      <p>Cuando termine una pagina, no digas "que bonito" — pregunta: "¿Que decidiste aqui?" Eso celebra el proceso, no el resultado.</p>
    `,
      en: `
      <p>"It does not look right." If your daughter says that every time she tries something new, it is not a lack of talent. It is a lack of <strong>experiences where there is no "wrong" or "right."</strong></p>
      <h2>Childhood perfectionism is a trap</h2>
      <p>Girls, on average, receive more messages of "be good" and "do it right" than boys. This can create an invisible fear of mistakes that blocks creativity and self-esteem.</p>
      <h2>The antidote: activities without grades</h2>
      <p>Coloring is a space where <strong>there is no correct answer</strong>. A purple cat, a pink sky, a black flower: everything goes. That freedom rewires the relationship with mistakes.</p>
      <h2>Themes that strengthen identity</h2>
      <p><strong>Awesome Girls</strong> features strong female characters, adorable animals, and scenes that inspire confidence. It is not "coloring for the sake of coloring" — every page says: "You decide how the world looks."</p>
      <h2>Your next step</h2>
      <p>When she finishes a page, do not say "that is pretty" — ask: "What did you decide here?" That celebrates the process, not the result.</p>
    `
    }
  },
  {
    id: "espacio-stem",
    bookId: "blast-off-space",
    image: "/images/blog/space-stem.svg",
    title: {
      es: "Como colorear el espacio convierte la curiosidad en una base STEM",
      en: "How space coloring turns curiosity into a STEM foundation"
    },
    date: "2025-12-28",
    summary: {
      es: "Ese nino que pregunta '¿por que brilla la luna?' esta listo para aprender ciencia sin saberlo.",
      en: "That kid who asks 'why does the moon glow?' is ready to learn science without knowing it."
    },
    slug: {
      es: "colorear-espacio-curiosidad-stem-ninos",
      en: "space-coloring-stem-curiosity-kids"
    },
    content: {
      es: `
      <p>"¿Por que las estrellas no se caen?" Si tu peque hace este tipo de preguntas, tiene <strong>curiosidad cientifica natural</strong>. El peor error es desperdiciarla con un "porque si" o dejarla morir frente a una pantalla.</p>
      <h2>El espacio es la puerta a la ciencia</h2>
      <p>Planetas, cohetes, gravedad: el espacio exterior fascina a casi todos los ninos. Esa fascinacion es el combustible perfecto para introducir conceptos STEM sin que suene a tarea.</p>
      <h2>Colorear + conversar = aprender</h2>
      <p>Mientras colorea un planeta, pregunta: "¿Cuantos planetas crees que hay?" Busquen la respuesta juntos. <strong>Cada pagina se convierte en un mini proyecto de ciencia.</strong></p>
      <h2>Paginas que invitan a explorar</h2>
      <p><strong>Blast Off!</strong> tiene cohetes, planetas, astronautas y aliens amistosos en paginas disenadas para peques curiosos. No es un libro de ciencias, pero puede ser el inicio de un cientifico.</p>
      <h2>Tu siguiente paso</h2>
      <p>La proxima vez que pregunte algo del cielo, no busques la respuesta tu solo: coloreen algo del espacio y investiguen juntos.</p>
    `,
      en: `
      <p>"Why don't stars fall down?" If your kid asks these kinds of questions, they have <strong>natural scientific curiosity</strong>. The worst mistake is wasting it with a "just because" or letting it die in front of a screen.</p>
      <h2>Space is the gateway to science</h2>
      <p>Planets, rockets, gravity: outer space fascinates almost every kid. That fascination is the perfect fuel to introduce STEM concepts without making it feel like homework.</p>
      <h2>Coloring + conversation = learning</h2>
      <p>While they color a planet, ask: "How many planets do you think there are?" Look up the answer together. <strong>Every page becomes a mini science project.</strong></p>
      <h2>Pages that invite exploration</h2>
      <p><strong>Blast Off!</strong> features rockets, planets, astronauts, and friendly aliens on pages designed for curious kids. It is not a science textbook, but it could be the start of a scientist.</p>
      <h2>Your next step</h2>
      <p>Next time they ask something about the sky, do not look up the answer alone: color something space-themed and explore it together.</p>
    `
    }
  },
  {
    id: "camiones-habilidades",
    bookId: "mighty-machines",
    image: "/images/blog/trucks-skills.svg",
    title: {
      es: "Por que los ninos obsesionados con camiones estan desarrollando habilidades reales",
      en: "Why kids obsessed with trucks and diggers are building real skills"
    },
    date: "2025-12-18",
    summary: {
      es: "Esa obsesion con las excavadoras no es random: esta entrenando su cerebro de ingeniero.",
      en: "That excavator obsession is not random: it is training their engineering brain."
    },
    slug: {
      es: "ninos-obsesion-camiones-habilidades-reales",
      en: "truck-obsessed-kids-building-skills"
    },
    content: {
      es: `
      <p>Tu hijo no para de hablar de excavadoras. Tiene 47 camiones de juguete. Cada vez que pasan por una obra se queda hipnotizado. ¿Deberia preocuparte? <strong>Todo lo contrario.</strong></p>
      <h2>Las obsesiones infantiles son senales de inteligencia</h2>
      <p>Los expertos las llaman "intereses intensos". Los ninos que se enganchan profundamente con un tema desarrollan <strong>mejor memoria, mayor capacidad de atencion</strong> y pensamiento categorico mas avanzado.</p>
      <h2>Camiones = ingenieria en miniatura</h2>
      <p>Cuando un nino observa como una grua levanta algo pesado, esta procesando fisica basica: peso, palancas, equilibrio. Colorear esas maquinas refuerza la observacion de detalles que la vida real no permite.</p>
      <h2>Alimenta la obsesion de forma constructiva</h2>
      <p><strong>Mighty Machines</strong> tiene excavadoras, camiones, gruas y escenas de obra disenadas para ninos de 3 a 8 anos. Mientras colorean, puedes preguntar: "¿Para que crees que se usa esta maquina?" Esa conversacion convierte una actividad simple en una clase de ingenieria.</p>
      <h2>Tu siguiente paso</h2>
      <p>La proxima vez que diga "¡mira esa excavadora!", no lo apures. Detente, observen juntos, y despues coloreen una en casa.</p>
    `,
      en: `
      <p>Your son will not stop talking about excavators. He owns 47 toy trucks. Every time you pass a construction site, he freezes. Should you be worried? <strong>Quite the opposite.</strong></p>
      <h2>Childhood obsessions are signs of intelligence</h2>
      <p>Experts call them "intense interests." Kids who dive deeply into a topic develop <strong>better memory, longer attention spans</strong>, and more advanced categorical thinking.</p>
      <h2>Trucks = miniature engineering</h2>
      <p>When a child watches a crane lift something heavy, they are processing basic physics: weight, levers, balance. Coloring those machines reinforces detail observation that real life does not always allow.</p>
      <h2>Feed the obsession constructively</h2>
      <p><strong>Mighty Machines</strong> features excavators, trucks, cranes, and worksite scenes designed for kids ages 3 to 8. While they color, ask: "What do you think this machine is used for?" That conversation turns a simple activity into an engineering lesson.</p>
      <h2>Your next step</h2>
      <p>Next time they say "Look at that excavator!" do not rush them. Stop, watch together, and then color one at home.</p>
    `
    }
  },
  {
    id: "primer-cuaderno-peque",
    bookId: "easy-animals",
    image: "/images/blog/first-coloring-book.svg",
    title: {
      es: "El primer libro de colorear para tu bebe: que buscar (y que evitar)",
      en: "Your toddler's first coloring book: what to look for and what to avoid"
    },
    date: "2025-12-10",
    summary: {
      es: "No todos los libros de colorear son para todas las edades. Aqui esta la guia que nadie te dio.",
      en: "Not every coloring book works for every age. Here is the guide nobody gave you."
    },
    slug: {
      es: "primer-libro-colorear-bebe-guia",
      en: "toddler-first-coloring-book-guide"
    },
    content: {
      es: `
      <p>Compraste un libro de colorear "para ninos" y tu peque de 3 anos se frustro a los 2 minutos. Las figuras eran demasiado pequenas, los detalles demasiados, y el libro termino en el piso. <strong>No fue culpa suya.</strong></p>
      <h2>Que buscar en un primer libro</h2>
      <p><strong>Trazos gruesos:</strong> lineas anchas que perdonen si el crayon se sale. <strong>Figuras reconocibles:</strong> animales, caras, objetos cotidianos. <strong>Una imagen por pagina:</strong> sin exceso visual que abrume.</p>
      <h2>Que evitar a toda costa</h2>
      <p>Paginas con patron geometrico complejo, fondos llenos de detalle y figuras que requieran precision. Si un adulto lo veria dificil, un nino de 3 anos lo vera imposible.</p>
      <h2>El libro que si funciona para los mas peques</h2>
      <p><strong>Easy Animals Coloring Book</strong> tiene 50 ilustraciones simples y adorables: animales con trazos amplios, expresiones tiernas y espacios generosos. Esta disenado para que la experiencia sea exito, no frustracion.</p>
      <h2>Tu siguiente paso</h2>
      <p>Antes de comprar, mira las paginas de muestra. Si tu peque puede identificar la figura en 2 segundos, el libro es correcto para su edad.</p>
    `,
      en: `
      <p>You bought a "children's" coloring book and your 3-year-old got frustrated in 2 minutes. The shapes were too small, the details too many, and the book ended up on the floor. <strong>It was not their fault.</strong></p>
      <h2>What to look for in a first book</h2>
      <p><strong>Bold outlines:</strong> thick lines that forgive when the crayon goes outside. <strong>Recognizable shapes:</strong> animals, faces, everyday objects. <strong>One image per page:</strong> no visual overload.</p>
      <h2>What to avoid at all costs</h2>
      <p>Pages with complex geometric patterns, busy backgrounds, and shapes that require precision. If an adult would find it tricky, a 3-year-old will find it impossible.</p>
      <h2>The book that actually works for the littlest ones</h2>
      <p><strong>Easy Animals Coloring Book</strong> has 50 simple, adorable illustrations: animals with bold outlines, sweet expressions, and generous spaces. It is designed so the experience feels like success, not frustration.</p>
      <h2>Your next step</h2>
      <p>Before buying, look at the sample pages. If your toddler can identify the shape in 2 seconds, the book is right for their age.</p>
    `
    }
  },
  {
    id: "aviones-mundo",
    bookId: "awesome-airplanes",
    image: "/images/blog/airplanes-world.svg",
    title: {
      es: "Como colorear aviones le ensena a tu hijo sobre el mundo",
      en: "How airplane coloring teaches kids about the world"
    },
    date: "2025-12-02",
    summary: {
      es: "Cada avion va a algun lugar: colorear es el primer paso para despertar la curiosidad geografica.",
      en: "Every airplane goes somewhere: coloring is the first step to sparking geographic curiosity."
    },
    slug: {
      es: "colorear-aviones-ensenanza-mundo-ninos",
      en: "airplane-coloring-teaches-kids-world"
    },
    content: {
      es: `
      <p>"¿A donde va ese avion?" Esa pregunta simple esconde una oportunidad enorme. Tu peque quiere conocer el mundo pero su universo se limita a la escuela y la casa. <strong>El papel puede abrir la puerta.</strong></p>
      <h2>Aviones = geografía sin mapa aburrido</h2>
      <p>Mientras colorea un avion, pregunta: "¿A donde crees que va?" Saca un mapa o un globo y senalen el destino juntos. Ahora aprendio donde esta Japan sin sentir que "estudio".</p>
      <h2>Tipos de aviones, tipos de preguntas</h2>
      <p>Un helicoptero de rescate lleva a hablar de heroes. Un avion comercial, de viajes familiares. Cada tipo de aeronave dispara una <strong>conversacion diferente sobre el mundo real</strong>.</p>
      <h2>40 oportunidades para explorar</h2>
      <p><strong>Awesome Airplanes</strong> tiene 40 aviones y helicopteros distintos, cada uno con su propia personalidad. No es solo colorear: es una invitacion a imaginar destinos, aventuras y posibilidades.</p>
      <h2>Tu siguiente paso</h2>
      <p>Coloreen un avion juntos y elijan un pais al que "volarian". Busquen una foto del lugar. Ahora tu peque tiene un motivo real para querer saber mas del mundo.</p>
    `,
      en: `
      <p>"Where is that plane going?" That simple question hides a huge opportunity. Your child wants to explore the world, but their universe is limited to school and home. <strong>Paper can open the door.</strong></p>
      <h2>Airplanes = geography without boring maps</h2>
      <p>While they color a plane, ask: "Where do you think it is going?" Pull up a map or a globe and point to the destination together. They just learned where Japan is without feeling like they "studied."</p>
      <h2>Types of planes, types of questions</h2>
      <p>A rescue helicopter leads to conversations about heroes. A commercial jet, about family trips. Each aircraft type sparks a <strong>different conversation about the real world</strong>.</p>
      <h2>40 opportunities to explore</h2>
      <p><strong>Awesome Airplanes</strong> features 40 unique airplanes and helicopters, each with its own personality. It is not just coloring: it is an invitation to imagine destinations, adventures, and possibilities.</p>
      <h2>Your next step</h2>
      <p>Color a plane together and choose a country you would "fly to." Look up a photo of that place. Now your child has a real reason to want to know more about the world.</p>
    `
    }
  },
  {
    id: "letras-preescolar",
    bookId: "alphabet-coloring-book",
    image: "/images/blog/letters-preschool.svg",
    title: {
      es: "La forma mas astuta de ensenar letras antes de que empiece preescolar",
      en: "The sneaky way to teach letters before preschool starts"
    },
    date: "2025-11-25",
    summary: {
      es: "Tu peque puede aprender el alfabeto sin fichas, sin repeticion y sin aburrirse.",
      en: "Your child can learn the alphabet without flashcards, without drills, and without boredom."
    },
    slug: {
      es: "ensenar-letras-antes-preescolar-colorear",
      en: "teach-letters-before-preschool-coloring"
    },
    content: {
      es: `
      <p>Quieres que tu peque llegue a preescolar sabiendo algunas letras, pero cada vez que intentas con fichas o apps, <strong>pierde interes en 60 segundos</strong>. El problema no es el nino — es el metodo.</p>
      <h2>Por que las fichas no funcionan a los 3-4 anos</h2>
      <p>El cerebro preescolar aprende a traves del <strong>juego y la experiencia sensorial</strong>, no de la repeticion abstracta. Mostrar una tarjeta con la letra "A" no conecta con nada real en su mundo.</p>
      <h2>Colorear letras es diferente</h2>
      <p>Cuando un nino colorea una "A" grande junto a un dibujo de un "avion", tres cosas pasan al mismo tiempo: reconoce la forma, asocia el sonido, y usa sus manos. Eso es <strong>aprendizaje multisensorial</strong> y es mucho mas pegajoso que una ficha.</p>
      <h2>Un libro que hace el trabajo por ti</h2>
      <p><strong>Alphabet Coloring Book</strong> tiene paginas disenadas para conectar cada letra con una imagen divertida. Trazos gruesos para manos pequenas, y suficiente espacio para que colorear se sienta como logro, no como tarea.</p>
      <h2>Tu siguiente paso</h2>
      <p>Empieza por la inicial de su nombre. Coloreen esa letra juntos y pegarla en la puerta de su cuarto. Manana, otra letra. Sin prisa, sin fichas, sin drama.</p>
    `,
      en: `
      <p>You want your child to start preschool knowing some letters, but every time you try with flashcards or apps, <strong>they lose interest in 60 seconds</strong>. The problem is not the child — it is the method.</p>
      <h2>Why flashcards do not work at age 3-4</h2>
      <p>The preschool brain learns through <strong>play and sensory experience</strong>, not abstract repetition. Showing a card with the letter "A" does not connect to anything real in their world.</p>
      <h2>Coloring letters is different</h2>
      <p>When a child colors a big "A" next to a drawing of an "airplane," three things happen at once: they recognize the shape, associate the sound, and use their hands. That is <strong>multisensory learning</strong>, and it sticks far better than a flashcard.</p>
      <h2>A book that does the work for you</h2>
      <p><strong>Alphabet Coloring Book</strong> has pages designed to connect each letter with a fun image. Bold outlines for small hands, and enough space so coloring feels like an accomplishment, not homework.</p>
      <h2>Your next step</h2>
      <p>Start with the first letter of their name. Color that letter together and stick it on their bedroom door. Tomorrow, another letter. No rush, no flashcards, no drama.</p>
    `
    }
  }
];

export const postsSorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));

export function getPostBook(post: Post) {
  if (!post.bookId) return null;
  return books.find((b) => b.id === post.bookId) ?? null;
}
