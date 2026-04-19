import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const EN_DIR = join(process.cwd(), "src/content/blog/en");
const ES_DIR = join(process.cwd(), "src/content/blog/es");

// Existing: fun-fact-butterflies-taste-with-feet, fun-fact-honey-never-expires, fun-fact-octopus-three-hearts
// Starting date from 2026-04-18 going back
const START_DATE = new Date("2026-04-18");

const funFacts = [
  // ── Animals ──────────────────────────────────────
  {
    slug: "fun-fact-elephants-cant-jump",
    postId: "fun-fact-elephants-jump",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? Elephants Can't Jump!",
      summary: "Elephants are the only mammals that can't jump — but they can do something amazing instead!",
      body: `## Elephants Can't Jump! 🐘

Here's a surprising fact: **elephants are the only mammals on Earth that cannot jump!**

Their legs are designed to support their massive weight (up to 14,000 pounds!), but they're built more like pillars — strong and sturdy, not springy. But don't feel bad for them — elephants can **swim**, and they're surprisingly great at it! They've been spotted swimming for miles across rivers and lakes.

### Color & Discover 🎨

When coloring an elephant, try adding a river or lake in the background. Ask your kids: *"If elephants can't jump, how do you think they cross over things?"*

**Fun challenge:** Draw an elephant doing the thing it IS best at — maybe swimming, painting, or giving a mud bath! 🎨`
    },
    es: {
      title: "¿Sabías Que? ¡Los Elefantes No Pueden Saltar!",
      summary: "Los elefantes son los únicos mamíferos que no pueden saltar — ¡pero pueden hacer algo increíble en su lugar!",
      body: `## ¡Los Elefantes No Pueden Saltar! 🐘

Aquí tienes un dato sorprendente: **¡los elefantes son los únicos mamíferos en la Tierra que no pueden saltar!**

Sus patas están diseñadas para soportar su enorme peso (¡hasta 6,350 kilos!), pero están construidas como pilares — fuertes y resistentes, no elásticas. Pero no sientas pena por ellos — los elefantes pueden **nadar**, ¡y son sorprendentemente buenos! Los han visto nadando kilómetros a través de ríos y lagos.

### Colorea y Descubre 🎨

Cuando colorees un elefante, intenta añadir un río o lago en el fondo. Pregúntale a tus peques: *"Si los elefantes no pueden saltar, ¿cómo crees que cruzan las cosas?"*

**Reto divertido:** Dibuja un elefante haciendo lo que mejor sabe hacer — tal vez nadando, pintando, ¡o dándose un baño de barro! 🎨`
    }
  },
  {
    slug: "fun-fact-snail-sleep-three-years",
    postId: "fun-fact-snail-sleep",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? A Snail Can Sleep for 3 Years!",
      summary: "If the weather isn't right, a snail can take a nap that lasts up to three whole years!",
      body: `## A Snail Can Sleep for 3 Years! 🐌

Imagine sleeping for **three entire years** — that's what snails can do!

When the weather is too dry or too cold, snails go into a deep sleep called **estivation** (in heat) or **hibernation** (in cold). They seal themselves inside their shells with a layer of mucus that hardens like a door, protecting them until conditions improve. When the weather gets nice again, they wake up hungry and ready to munch on leaves!

### Slow & Steady Art Time 🎨

Color a snail hiding inside its shell during a rainstorm. Ask your kids: *"If you could sleep for 3 years, what's the first thing you'd do when you woke up?"*

**Fun fact bonus:** Snails have about 14,000 teeth! They're tiny and on their tongue! 🦷`
    },
    es: {
      title: "¿Sabías Que? ¡Un Caracol Puede Dormir 3 Años!",
      summary: "Si el clima no es el adecuado, un caracol puede tomar una siesta que dura ¡hasta tres años enteros!",
      body: `## ¡Un Caracol Puede Dormir 3 Años! 🐌

Imagínate dormir durante **tres años enteros** — ¡eso es lo que pueden hacer los caracoles!

Cuando el clima es demasiado seco o demasiado frío, los caracoles entran en un sueño profundo llamado **estivación** (con calor) o **hibernación** (con frío). Se sellan dentro de su caparazón con una capa de moco que se endurece como una puerta, protegiéndolos hasta que las condiciones mejoren. Cuando el clima vuelve a ser agradable, ¡se despiertan hambrientos y listos para comer hojas!

### Arte Lento y Seguro 🎨

Colorea un caracol escondido dentro de su caparazón durante una tormenta. Pregúntales a tus peques: *"Si pudieras dormir 3 años, ¿qué sería lo primero que harías al despertar?"*

**Dato extra:** ¡Los caracoles tienen unos 14,000 dientes! Son diminutos y están en su lengua 🦷`
    }
  },
  {
    slug: "fun-fact-dolphins-sleep-one-eye-open",
    postId: "fun-fact-dolphins-sleep",
    tags: '["fun-fact", "animals", "ocean"]',
    en: {
      title: "Did You Know? Dolphins Sleep With One Eye Open!",
      summary: "Dolphins can rest half their brain while the other half stays awake — so they literally sleep with one eye open!",
      body: `## Dolphins Sleep With One Eye Open! 🐬

This is wild: **dolphins never fully fall asleep!**

They use something called **unihemispheric sleep** — one half of their brain sleeps while the other half stays awake. This means one eye stays open to watch for danger and to remember to come up to the surface to breathe! After a while, the two halves swap. Pretty clever, right?

### Ocean Art Time 🎨

When coloring a dolphin, draw one eye closed and one open — and explain why! Ask your kids: *"What would it be like to only sleep half your brain at a time?"*

**Fun fact bonus:** Dolphins call each other by name! Each dolphin has a unique whistle, and they respond when they hear theirs. 🎶`
    },
    es: {
      title: "¿Sabías Que? ¡Los Delfines Duermen Con un Ojo Abierto!",
      summary: "Los delfines pueden descansar la mitad de su cerebro mientras la otra mitad sigue despierta — ¡literalmente duermen con un ojo abierto!",
      body: `## ¡Los Delfines Duermen Con un Ojo Abierto! 🐬

Esto es increíble: **¡los delfines nunca se duermen por completo!**

Usan algo llamado **sueño unihemisférico** — una mitad de su cerebro duerme mientras la otra mitad permanece despierta. ¡Esto significa que un ojo se queda abierto para vigilar peligros y recordar subir a la superficie a respirar! Después de un rato, las dos mitades se intercambian. Bastante listo, ¿verdad?

### Arte Oceánico 🎨

Cuando colorees un delfín, dibuja un ojo cerrado y uno abierto — ¡y explica por qué! Pregúntales a tus peques: *"¿Cómo sería dormir solo la mitad de tu cerebro a la vez?"*

**Dato extra:** ¡Los delfines se llaman entre sí por su nombre! Cada delfín tiene un silbido único y responde cuando escucha el suyo. 🎶`
    }
  },
  {
    slug: "fun-fact-flamingos-born-white",
    postId: "fun-fact-flamingos-white",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? Flamingos Are Born White!",
      summary: "Baby flamingos are fluffy and white — they turn pink because of what they eat!",
      body: `## Flamingos Are Born White! 🦩

That gorgeous pink color? **Flamingos aren't born with it!**

Baby flamingos hatch with fluffy gray or white feathers. They get their famous pink color from the food they eat — tiny shrimp and algae that contain a natural pigment called **carotenoids**. The more they eat, the pinker they get! If they stopped eating those foods, they would actually turn white again.

### Color Experiment 🎨

Try coloring a baby flamingo in white or gray next to a bright pink adult flamingo! Ask your kids: *"What color would YOU turn if you ate only one food?"*

**Fun fact bonus:** A group of flamingos is called a **"flamboyance"** — the most fabulous group name in the animal kingdom! 💅`
    },
    es: {
      title: "¿Sabías Que? ¡Los Flamencos Nacen Blancos!",
      summary: "Los bebés flamencos son esponjosos y blancos — ¡se vuelven rosas por lo que comen!",
      body: `## ¡Los Flamencos Nacen Blancos! 🦩

¿Ese color rosa precioso? **¡Los flamencos no nacen con él!**

Los bebés flamencos nacen con plumas esponjosas grises o blancas. Obtienen su famoso color rosa de la comida que comen — camarones diminutos y algas que contienen un pigmento natural llamado **carotenoides**. ¡Cuanto más comen, más rosas se ponen! Si dejaran de comer esos alimentos, en realidad volverían a ser blancos.

### Experimento de Color 🎨

¡Intenta colorear un flamenco bebé en blanco o gris al lado de un flamenco adulto rosa brillante! Pregúntales a tus peques: *"¿De qué color te pondrías TÚ si solo comieras un alimento?"*

**Dato extra:** Un grupo de flamencos se llama **"flamboyance"** (extravagancia) — ¡el nombre de grupo más fabuloso del reino animal! 💅`
    }
  },
  {
    slug: "fun-fact-cats-sleep-seventy-percent",
    postId: "fun-fact-cats-sleep",
    tags: '["fun-fact", "animals", "pets"]',
    en: {
      title: "Did You Know? Cats Spend 70% of Their Lives Sleeping!",
      summary: "Your kitty sleeps about 13–16 hours a day — that's more than any other pet!",
      body: `## Cats Sleep 70% of Their Lives! 🐱

If your cat seems like a professional napper, that's because **they are!**

Cats sleep an average of **13 to 16 hours a day**. That means a cat that lives for 9 years has been asleep for about 6 of them! They inherited this sleep schedule from their wild ancestors, who needed to save energy for hunting. Even though your house cat hunts nothing but toy mice, the sleepy instinct stays!

### Cozy Art Time 🎨

Color a cat curled up in the silliest sleeping position you can imagine — on a bookshelf, in a shoe, or on someone's head! Ask your kids: *"Where is the funniest place you've seen a cat sleep?"*

**Fun fact bonus:** Cats can rotate their ears 180 degrees — they have 32 muscles in each ear! 👂`
    },
    es: {
      title: "¿Sabías Que? ¡Los Gatos Pasan el 70% de Su Vida Durmiendo!",
      summary: "Tu gatito duerme unas 13–16 horas al día — ¡más que cualquier otra mascota!",
      body: `## ¡Los Gatos Duermen el 70% de Su Vida! 🐱

Si tu gato parece un profesional de la siesta, ¡es porque **lo es**!

Los gatos duermen un promedio de **13 a 16 horas al día**. ¡Eso significa que un gato que vive 9 años ha dormido unos 6 de ellos! Heredaron este horario de sueño de sus ancestros salvajes, que necesitaban ahorrar energía para cazar. Aunque tu gato de casa no caza más que ratones de juguete, ¡el instinto dormilón sigue ahí!

### Arte Acogedor 🎨

Colorea un gato acurrucado en la posición más graciosa que puedas imaginar — ¡en una estantería, en un zapato o en la cabeza de alguien! Pregúntales a tus peques: *"¿Cuál es el lugar más gracioso donde has visto dormir a un gato?"*

**Dato extra:** Los gatos pueden rotar sus orejas 180 grados — ¡tienen 32 músculos en cada oreja! 👂`
    }
  },
  {
    slug: "fun-fact-cows-have-best-friends",
    postId: "fun-fact-cows-friends",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? Cows Have Best Friends!",
      summary: "Studies show that cows get stressed when separated from their best friend — they really do have BFFs!",
      body: `## Cows Have Best Friends! 🐄

This might be the sweetest animal fact ever: **cows have best friends!**

Scientists at Northampton University discovered that cows have strong bonds with certain other cows. When they're with their best friend, their heart rate is lower and they feel calmer. When they're separated, they actually get **stressed and anxious**. Just like us!

### Farm Art Time 🎨

Draw or color two cows standing side by side in a sunny meadow — best friends forever! Ask your kids: *"Who is YOUR best friend, and what do you love doing together?"*

**Fun fact bonus:** Cows can smell things up to 6 miles away! That's one powerful nose! 👃`
    },
    es: {
      title: "¿Sabías Que? ¡Las Vacas Tienen Mejores Amigos!",
      summary: "Los estudios muestran que las vacas se estresan cuando las separan de su mejor amiga — ¡realmente tienen BFFs!",
      body: `## ¡Las Vacas Tienen Mejores Amigos! 🐄

Este podría ser el dato animal más tierno de todos: **¡las vacas tienen mejores amigos!**

Científicos de la Universidad de Northampton descubrieron que las vacas forman lazos fuertes con ciertas otras vacas. Cuando están con su mejor amiga, su ritmo cardíaco es más bajo y se sienten más tranquilas. Cuando las separan, ¡se ponen **estresadas y ansiosas**! Igual que nosotros.

### Arte de Granja 🎨

Dibuja o colorea dos vacas juntas en un prado soleado — ¡mejores amigas para siempre! Pregúntales a tus peques: *"¿Quién es TU mejor amigo/a y qué les gusta hacer juntos?"*

**Dato extra:** ¡Las vacas pueden oler cosas hasta a 10 kilómetros de distancia! ¡Eso sí que es una nariz poderosa! 👃`
    }
  },
  {
    slug: "fun-fact-penguins-propose-with-pebbles",
    postId: "fun-fact-penguins-pebbles",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? Penguins Propose With Pebbles!",
      summary: "When a male penguin falls in love, he searches the whole beach for the perfect pebble to give his partner!",
      body: `## Penguins Propose With Pebbles! 🐧

This is possibly the most romantic thing in the animal kingdom: **male penguins propose with pebbles!**

When a male Gentoo penguin finds a partner he likes, he searches the entire beach for the **smoothest, most perfect pebble** he can find. Then he waddles over and places it in front of her. If she accepts the pebble, they become partners! They use pebbles to build their nest together.

### Arctic Art Time 🎨

Color a penguin holding a shiny pebble with a heart in the background! Ask your kids: *"If you were a penguin, what would you give to your best friend?"*

**Fun fact bonus:** Emperor penguins can dive deeper than 1,800 feet — that's deeper than most submarines go! 🌊`
    },
    es: {
      title: "¿Sabías Que? ¡Los Pingüinos Se Declaran Con Piedras!",
      summary: "Cuando un pingüino macho se enamora, ¡busca en toda la playa la piedra perfecta para dársela a su pareja!",
      body: `## ¡Los Pingüinos Se Declaran Con Piedras! 🐧

Esto es posiblemente lo más romántico del reino animal: **¡los pingüinos macho se declaran con piedras!**

Cuando un pingüino Gentoo macho encuentra una pareja que le gusta, busca en toda la playa la **piedra más lisa y perfecta** que pueda encontrar. Luego camina con su andar gracioso y la coloca frente a ella. Si ella acepta la piedra, ¡se convierten en pareja! Usan las piedras para construir su nido juntos.

### Arte Ártico 🎨

¡Colorea un pingüino sosteniendo una piedra brillante con un corazón de fondo! Pregúntales a tus peques: *"Si fueras un pingüino, ¿qué le regalarías a tu mejor amigo/a?"*

**Dato extra:** ¡Los pingüinos emperador pueden bucear a más de 550 metros de profundidad — eso es más profundo que la mayoría de los submarinos! 🌊`
    }
  },
  {
    slug: "fun-fact-giraffe-neck-bones",
    postId: "fun-fact-giraffe-neck",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? Giraffes Have the Same Number of Neck Bones as You!",
      summary: "Despite their super-long necks, giraffes have exactly 7 neck vertebrae — the same as humans!",
      body: `## Giraffes Have 7 Neck Bones — Just Like You! 🦒

Look at that loooong neck! You'd think giraffes would have hundreds of neck bones, right? **Nope — they have exactly 7, just like humans!**

The difference is that each of their vertebrae can be over **10 inches long** (25 cm), while ours are tiny. This is actually true for almost all mammals — from mice to whales to giraffes — we all share the same number of neck bones!

### Tall Art Time 🎨

Color a giraffe stretching to reach the tallest tree. Try to draw 7 sections on its neck! Ask your kids: *"If YOUR neck was as long as a giraffe's, what's the first thing you'd reach for?"*

**Fun fact bonus:** A giraffe's tongue is about 18 inches long and it's purple-black to protect it from sunburn! 👅`
    },
    es: {
      title: "¿Sabías Que? ¡Las Jirafas Tienen el Mismo Número de Huesos en el Cuello Que Tú!",
      summary: "A pesar de sus cuellos súper largos, las jirafas tienen exactamente 7 vértebras cervicales — ¡igual que los humanos!",
      body: `## ¡Las Jirafas Tienen 7 Huesos en el Cuello — Igual Que Tú! 🦒

¡Mira ese cuello laaaaargo! Pensarías que las jirafas tendrían cientos de huesos en el cuello, ¿verdad? **¡Pues no — tienen exactamente 7, igual que los humanos!**

La diferencia es que cada una de sus vértebras puede medir más de **25 centímetros de largo**, mientras que las nuestras son diminutas. Esto es cierto para casi todos los mamíferos — desde ratones hasta ballenas y jirafas — ¡todos compartimos el mismo número de huesos en el cuello!

### Arte Alto 🎨

Colorea una jirafa estirándose para alcanzar el árbol más alto. ¡Intenta dibujar 7 secciones en su cuello! Pregúntales a tus peques: *"Si TU cuello fuera tan largo como el de una jirafa, ¿qué es lo primero que alcanzarías?"*

**Dato extra:** ¡La lengua de una jirafa mide unos 45 centímetros y es de color morado-negro para protegerse de las quemaduras del sol! 👅`
    }
  },
  {
    slug: "fun-fact-sharks-older-than-trees",
    postId: "fun-fact-sharks-trees",
    tags: '["fun-fact", "animals", "ocean"]',
    en: {
      title: "Did You Know? Sharks Are Older Than Trees!",
      summary: "Sharks have been swimming in the oceans for over 400 million years — trees have only existed for about 350 million!",
      body: `## Sharks Are Older Than Trees! 🦈

Here's a mind-blowing fact: **sharks have been around for over 400 million years!**

That means sharks were swimming in the oceans about **50 million years BEFORE the first trees** even appeared on land. They also lived before dinosaurs! Sharks have survived five massive extinctions and are one of the most successful animals in Earth's history.

### Prehistoric Art Time 🎨

Color an underwater scene with a shark swimming past ancient underwater plants — no trees in sight! Ask your kids: *"What do you think the ocean looked like 400 million years ago?"*

**Fun fact bonus:** Some sharks can glow in the dark! Certain deep-sea species produce their own light. 🌟`
    },
    es: {
      title: "¿Sabías Que? ¡Los Tiburones Son Más Antiguos Que los Árboles!",
      summary: "Los tiburones llevan nadando en los océanos más de 400 millones de años — ¡los árboles solo existen desde hace unos 350 millones!",
      body: `## ¡Los Tiburones Son Más Antiguos Que los Árboles! 🦈

Aquí tienes un dato alucinante: **¡los tiburones llevan existiendo más de 400 millones de años!**

Eso significa que los tiburones nadaban en los océanos unos **50 millones de años ANTES de que aparecieran los primeros árboles** en la tierra. ¡También vivieron antes que los dinosaurios! Los tiburones han sobrevivido cinco extinciones masivas y son uno de los animales más exitosos de la historia de la Tierra.

### Arte Prehistórico 🎨

Colorea una escena submarina con un tiburón nadando entre plantas acuáticas antiguas — ¡sin árboles a la vista! Pregúntales a tus peques: *"¿Cómo crees que era el océano hace 400 millones de años?"*

**Dato extra:** ¡Algunos tiburones brillan en la oscuridad! Ciertas especies de aguas profundas producen su propia luz. 🌟`
    }
  },
  {
    slug: "fun-fact-crocodile-cant-stick-tongue",
    postId: "fun-fact-crocodile-tongue",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? A Crocodile Can't Stick Out Its Tongue!",
      summary: "A crocodile's tongue is attached to the roof of its mouth — so it can never stick it out!",
      body: `## A Crocodile Can't Stick Out Its Tongue! 🐊

Try sticking out your tongue right now. Easy, right? Well, **a crocodile can NEVER do that!**

A crocodile's tongue is held in place by a membrane attached to the roof of its mouth. This actually helps them eat — it seals their throat so water doesn't rush in when they catch prey underwater. Pretty smart design for an underwater hunter!

### Reptile Art Time 🎨

Color a crocodile with its mouth wide open — but no tongue sticking out! Ask your kids: *"What would be harder if you couldn't move your tongue?"*

**Fun fact bonus:** Crocodiles swallow small stones on purpose — the stones help them digest food and stay balanced when swimming! 🪨`
    },
    es: {
      title: "¿Sabías Que? ¡Un Cocodrilo No Puede Sacar la Lengua!",
      summary: "La lengua del cocodrilo está pegada al paladar — ¡así que nunca puede sacarla!",
      body: `## ¡Un Cocodrilo No Puede Sacar la Lengua! 🐊

Intenta sacar la lengua ahora mismo. Fácil, ¿verdad? Pues, **¡un cocodrilo NUNCA puede hacer eso!**

La lengua del cocodrilo está sujeta por una membrana pegada al paladar. Esto en realidad les ayuda a comer — sella su garganta para que no entre agua cuando atrapan presas bajo el agua. ¡Un diseño bastante inteligente para un cazador acuático!

### Arte Reptil 🎨

Colorea un cocodrilo con la boca bien abierta — ¡pero sin lengua afuera! Pregúntales a tus peques: *"¿Qué sería más difícil si no pudieras mover la lengua?"*

**Dato extra:** ¡Los cocodrilos tragan pequeñas piedras a propósito — las piedras les ayudan a digerir la comida y mantener el equilibrio al nadar! 🪨`
    }
  },
  {
    slug: "fun-fact-sloths-hold-breath",
    postId: "fun-fact-sloths-breath",
    tags: '["fun-fact", "animals", "nature"]',
    en: {
      title: "Did You Know? Sloths Can Hold Their Breath Longer Than Dolphins!",
      summary: "Sloths can hold their breath for up to 40 minutes — dolphins can only manage about 10!",
      body: `## Sloths Can Hold Their Breath Longer Than Dolphins! 🦥

You might think of sloths as the sleepiest, slowest animals — but they have a hidden superpower: **sloths can hold their breath for up to 40 minutes!**

That's almost four times longer than dolphins! Sloths can slow their heart rate to one-third of its normal speed, which helps them use less oxygen. They're actually excellent swimmers too — they drop from trees into rivers and paddle along just fine.

### Slow-Mo Art Time 🎨

Color a sloth hanging upside down from a tree branch with a big sleepy smile. Ask your kids: *"How long can YOU hold your breath? Let's try!"*

**Fun fact bonus:** Sloths are so slow that algae grows on their fur, turning them slightly green — free camouflage! 🌿`
    },
    es: {
      title: "¿Sabías Que? ¡Los Perezosos Aguantan la Respiración Más Que los Delfines!",
      summary: "Los perezosos pueden aguantar la respiración hasta 40 minutos — ¡los delfines solo pueden unos 10!",
      body: `## ¡Los Perezosos Aguantan la Respiración Más Que los Delfines! 🦥

Quizás pienses que los perezosos son los animales más dormilones y lentos — pero tienen un superpoder oculto: **¡los perezosos pueden aguantar la respiración hasta 40 minutos!**

¡Eso es casi cuatro veces más que los delfines! Los perezosos pueden reducir su ritmo cardíaco a un tercio de su velocidad normal, lo que les ayuda a usar menos oxígeno. También son excelentes nadadores — se dejan caer de los árboles a los ríos y nadan perfectamente.

### Arte en Cámara Lenta 🎨

Colorea un perezoso colgando boca abajo de una rama con una gran sonrisa dormilona. Pregúntales a tus peques: *"¿Cuánto tiempo puedes TÚ aguantar la respiración? ¡Vamos a intentarlo!"*

**Dato extra:** ¡Los perezosos son tan lentos que les crece alga en el pelo, poniéndolos un poco verdes — camuflaje gratis! 🌿`
    }
  },
  {
    slug: "fun-fact-dogs-nose-unique",
    postId: "fun-fact-dogs-nose",
    tags: '["fun-fact", "animals", "pets"]',
    en: {
      title: "Did You Know? A Dog's Nose Print Is Unique — Like a Fingerprint!",
      summary: "Every dog has a completely unique nose print — no two dogs in the world have the same one!",
      body: `## A Dog's Nose Print Is Unique! 🐕

Just like humans have unique fingerprints, **every dog has a completely unique nose print!**

The bumps, ridges, and patterns on a dog's nose are so unique that they can actually be used to identify individual dogs — just like police use fingerprints for people. Some countries even use nose prints to register dogs!

### Puppy Art Time 🎨

Color a big, close-up dog nose with all its little bumps and patterns. Ask your kids: *"Can you draw what YOUR dog's nose looks like up close?"*

**Fun fact bonus:** Dogs can smell about 10,000 to 100,000 times better than humans. Their noses have about 300 million scent receptors compared to our measly 6 million! 👃`
    },
    es: {
      title: "¿Sabías Que? ¡La Huella de la Nariz de un Perro Es Única — Como una Huella Dactilar!",
      summary: "Cada perro tiene una huella nasal completamente única — ¡no hay dos perros en el mundo con la misma!",
      body: `## ¡La Huella Nasal de un Perro Es Única! 🐕

Igual que los humanos tienen huellas dactilares únicas, **¡cada perro tiene una huella nasal completamente única!**

Los bultitos, surcos y patrones en la nariz de un perro son tan únicos que pueden usarse para identificar perros individuales — igual que la policía usa huellas dactilares para las personas. ¡Algunos países incluso usan huellas nasales para registrar perros!

### Arte Perruno 🎨

Colorea una nariz de perro grande y de cerca con todos sus bultitos y patrones. Pregúntales a tus peques: *"¿Puedes dibujar cómo se ve la nariz de TU perro de cerca?"*

**Dato extra:** Los perros pueden oler entre 10,000 y 100,000 veces mejor que los humanos. ¡Su nariz tiene unos 300 millones de receptores olfativos comparados con nuestros escasos 6 millones! 👃`
    }
  },
  // ── Food & Nature ──────────────────────────────────
  {
    slug: "fun-fact-bananas-are-berries",
    postId: "fun-fact-bananas-berries",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Bananas Are Berries, But Strawberries Aren't!",
      summary: "Botanically speaking, bananas qualify as berries — but strawberries, raspberries, and blackberries don't!",
      body: `## Bananas Are Berries! 🍌

Get ready for this: **bananas are technically berries, but strawberries aren't!**

In botany (plant science), a berry is a fruit that comes from a single flower with one ovary and has seeds inside. Bananas, grapes, and even avocados meet this definition! But strawberries, raspberries, and blackberries actually grow from flowers with multiple ovaries, so scientists don't count them as true berries.

### Fruit Coloring Time 🎨

Color a pile of "real" berries — bananas, grapes, and watermelons — with a sign that says "True Berries"! Ask your kids: *"If a banana is a berry, what OTHER foods do you think might be berries?"*

**Fun fact bonus:** Bananas are naturally slightly radioactive because they contain potassium! But don't worry — you'd have to eat 10 million bananas at once for it to be dangerous. 🍌`
    },
    es: {
      title: "¿Sabías Que? ¡Los Plátanos Son Bayas, Pero las Fresas No!",
      summary: "Botánicamente hablando, los plátanos califican como bayas — ¡pero las fresas, frambuesas y moras no!",
      body: `## ¡Los Plátanos Son Bayas! 🍌

Prepárate para esto: **¡los plátanos técnicamente son bayas, pero las fresas no!**

En botánica (la ciencia de las plantas), una baya es una fruta que viene de una sola flor con un ovario y tiene semillas dentro. ¡Los plátanos, las uvas e incluso los aguacates cumplen esta definición! Pero las fresas, frambuesas y moras crecen de flores con múltiples ovarios, así que los científicos no las cuentan como bayas verdaderas.

### Hora de Colorear Frutas 🎨

Colorea una pila de "bayas verdaderas" — plátanos, uvas y sandías — ¡con un cartel que diga "Bayas de Verdad"! Pregúntales a tus peques: *"Si el plátano es una baya, ¿qué OTROS alimentos crees que podrían ser bayas?"*

**Dato extra:** ¡Los plátanos son ligeramente radioactivos de forma natural porque contienen potasio! Pero no te preocupes — tendrías que comerte 10 millones de plátanos a la vez para que fuera peligroso. 🍌`
    }
  },
  {
    slug: "fun-fact-carrots-were-purple",
    postId: "fun-fact-carrots-purple",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Carrots Were Originally Purple!",
      summary: "Before the 17th century, most carrots were purple, white, or yellow — orange carrots were created by Dutch farmers!",
      body: `## Carrots Were Originally Purple! 🥕

The orange carrot you know and love? **It didn't always exist!**

For thousands of years, carrots were mostly **purple, white, red, or yellow**. The orange carrot was developed by Dutch farmers in the 17th century, possibly to honor William of Orange, the Dutch king. The orange variety turned out to be sweeter and less bitter, so it became the most popular!

### Rainbow Carrot Art 🎨

Color a bunch of carrots in ALL their original colors — purple, white, yellow, red, AND orange! Ask your kids: *"Which color carrot would you want to eat?"*

**Fun fact bonus:** You CAN still find purple carrots in some grocery stores today — and they're just as yummy! 💜`
    },
    es: {
      title: "¿Sabías Que? ¡Las Zanahorias Originalmente Eran Moradas!",
      summary: "Antes del siglo XVII, la mayoría de las zanahorias eran moradas, blancas o amarillas — ¡las zanahorias naranjas fueron creadas por granjeros holandeses!",
      body: `## ¡Las Zanahorias Originalmente Eran Moradas! 🥕

¿La zanahoria naranja que conoces y te encanta? **¡No siempre existió!**

Durante miles de años, las zanahorias eran principalmente **moradas, blancas, rojas o amarillas**. La zanahoria naranja fue desarrollada por granjeros holandeses en el siglo XVII, posiblemente para honrar a Guillermo de Orange, el rey holandés. ¡La variedad naranja resultó ser más dulce y menos amarga, así que se convirtió en la más popular!

### Arte de Zanahorias Arcoíris 🎨

¡Colorea un montón de zanahorias en TODOS sus colores originales — morado, blanco, amarillo, rojo Y naranja! Pregúntales a tus peques: *"¿Qué color de zanahoria querrías comer?"*

**Dato extra:** ¡AÚN puedes encontrar zanahorias moradas en algunas tiendas hoy en día — y son igual de ricas! 💜`
    }
  },
  {
    slug: "fun-fact-pineapples-take-two-years",
    postId: "fun-fact-pineapples-grow",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Pineapples Take 2 Years to Grow!",
      summary: "A single pineapple takes about 2 to 3 years to grow from a plant — patience pays off!",
      body: `## Pineapples Take 2 Years to Grow! 🍍

Next time you eat a pineapple, appreciate it a little more: **each pineapple takes about 2 to 3 years to grow!**

A pineapple plant produces just ONE fruit at a time. The plant grows from a crown (the leafy top), slowly develops, flowers, and then the fruit forms over many months. Each pineapple is actually made up of many small berries that fuse together!

### Tropical Art Time 🎨

Color a pineapple wearing sunglasses on a beach! Ask your kids: *"If YOU took 2 years to make something, what would it be?"*

**Fun fact bonus:** You can grow your own pineapple at home! Just twist off the leafy top, put it in water until roots grow, then plant it in soil. 🌱`
    },
    es: {
      title: "¿Sabías Que? ¡Las Piñas Tardan 2 Años en Crecer!",
      summary: "Una sola piña tarda entre 2 y 3 años en crecer desde la planta — ¡la paciencia tiene recompensa!",
      body: `## ¡Las Piñas Tardan 2 Años en Crecer! 🍍

La próxima vez que comas una piña, aprecia un poco más: **¡cada piña tarda entre 2 y 3 años en crecer!**

Una planta de piña produce solo UNA fruta a la vez. La planta crece desde la corona (la parte frondosa de arriba), se desarrolla lentamente, florece y luego la fruta se forma a lo largo de muchos meses. ¡Cada piña está formada por muchas pequeñas bayas que se fusionan!

### Arte Tropical 🎨

¡Colorea una piña con gafas de sol en la playa! Pregúntales a tus peques: *"Si TÚ tardaras 2 años en hacer algo, ¿qué sería?"*

**Dato extra:** ¡Puedes cultivar tu propia piña en casa! Solo tuerce la parte de arriba con hojas, ponla en agua hasta que le salgan raíces, y luego plántala en tierra. 🌱`
    }
  },
  {
    slug: "fun-fact-watermelons-ninety-two-percent-water",
    postId: "fun-fact-watermelons-water",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Watermelons Are 92% Water!",
      summary: "Watermelons are basically nature's water bottle — they're 92% water!",
      body: `## Watermelons Are 92% Water! 🍉

That refreshing feeling when you bite into a watermelon? There's a reason for that: **watermelons are 92% water!**

That's almost as much water as a glass of actual water! This is why watermelons are the perfect summer snack — they help you stay hydrated while being delicious. The name really says it all: WATER-melon!

### Juicy Art Time 🎨

Color the biggest, juiciest watermelon slice you can imagine — with seeds flying everywhere! Ask your kids: *"If watermelons are mostly water, what do you think is the second ingredient?"*

**Fun fact bonus:** Japan grows square watermelons! Farmers put them in glass boxes while they grow so they become cube-shaped for easy storage. But they cost about $100 each! 📦`
    },
    es: {
      title: "¿Sabías Que? ¡Las Sandías Son 92% Agua!",
      summary: "Las sandías son básicamente la botella de agua de la naturaleza — ¡son 92% agua!",
      body: `## ¡Las Sandías Son 92% Agua! 🍉

¿Esa sensación refrescante cuando muerdes una sandía? Hay una razón: **¡las sandías son 92% agua!**

¡Eso es casi tanta agua como un vaso de agua real! Por eso las sandías son el snack perfecto de verano — te ayudan a mantenerte hidratado mientras son deliciosas. ¡El nombre en inglés lo dice todo: WATER-melon (melón de agua)!

### Arte Jugoso 🎨

Colorea la rebanada de sandía más grande y jugosa que puedas imaginar — ¡con semillas volando por todos lados! Pregúntales a tus peques: *"Si las sandías son casi todo agua, ¿cuál crees que es el segundo ingrediente?"*

**Dato extra:** ¡En Japón cultivan sandías cuadradas! Los granjeros las ponen en cajas de vidrio mientras crecen para que tengan forma de cubo y sean fáciles de guardar. ¡Pero cuestan unos 100 dólares cada una! 📦`
    }
  },
  {
    slug: "fun-fact-broccoli-is-a-flower",
    postId: "fun-fact-broccoli-flower",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Broccoli Is Actually a Flower!",
      summary: "When you eat broccoli, you're eating thousands of tiny flower buds before they bloom!",
      body: `## Broccoli Is a Flower! 🥦

Here's something to think about at dinner: **broccoli is a flower!**

What you eat is actually a cluster of **hundreds of tiny flower buds** that haven't opened yet. If you leave broccoli in the ground long enough, those green buds bloom into small yellow flowers! So next time you eat broccoli, you can say you're eating a bouquet.

### Veggie Art Time 🎨

Color broccoli two ways: the regular green version AND a version where it's blooming with tiny yellow flowers! Ask your kids: *"Now that you know broccoli is a flower, does it taste better?"*

**Fun fact bonus:** Cauliflower, Brussels sprouts, kale, and cabbage are all the same plant species — just bred to grow differently! 🌱`
    },
    es: {
      title: "¿Sabías Que? ¡El Brócoli En Realidad Es una Flor!",
      summary: "Cuando comes brócoli, ¡estás comiendo miles de diminutos capullos de flores antes de que florezcan!",
      body: `## ¡El Brócoli Es una Flor! 🥦

Aquí tienes algo para pensar durante la cena: **¡el brócoli es una flor!**

Lo que comes en realidad es un racimo de **cientos de diminutos capullos de flores** que aún no se han abierto. Si dejas el brócoli en la tierra el tiempo suficiente, ¡esos capullos verdes florecen en pequeñas flores amarillas! Así que la próxima vez que comas brócoli, puedes decir que estás comiendo un ramo.

### Arte de Verduras 🎨

Colorea el brócoli de dos formas: ¡la versión verde normal Y una versión donde florece con pequeñas flores amarillas! Pregúntales a tus peques: *"Ahora que sabes que el brócoli es una flor, ¿te sabe mejor?"*

**Dato extra:** ¡La coliflor, las coles de Bruselas, la col rizada y el repollo son todos la misma especie de planta — solo criados para crecer de forma diferente! 🌱`
    }
  },
  {
    slug: "fun-fact-apples-float-in-water",
    postId: "fun-fact-apples-float",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Apples Float Because They're 25% Air!",
      summary: "Apples are about 25% air, which is why they bob on water — and why apple bobbing is a thing!",
      body: `## Apples Float Because They're 25% Air! 🍎

Ever wonder why apples float when you put them in water? It's because **apples are about 25% air!**

Tiny air pockets inside the apple make it less dense than water, so it floats perfectly. That's exactly why the game "apple bobbing" works — try it with a pear or a peach, and they'll sink right to the bottom!

### Science Art Time 🎨

Draw a big tub of water with apples floating on top and other fruits sinking below! Ask your kids: *"What other fruits do you think would float?"*

**Fun fact bonus:** There are over 7,500 varieties of apples in the world. If you ate a different one every day, it would take over 20 years to try them all! 🍏`
    },
    es: {
      title: "¿Sabías Que? ¡Las Manzanas Flotan Porque Son 25% Aire!",
      summary: "Las manzanas son aproximadamente un 25% aire, por eso flotan en el agua — ¡y por eso existe el juego de pescar manzanas!",
      body: `## ¡Las Manzanas Flotan Porque Son 25% Aire! 🍎

¿Alguna vez te has preguntado por qué las manzanas flotan cuando las pones en agua? ¡Es porque **las manzanas son aproximadamente un 25% aire!**

Pequeñas bolsas de aire dentro de la manzana la hacen menos densa que el agua, así que flota perfectamente. Por eso funciona el juego de "pescar manzanas con la boca" — ¡intenta con una pera o un melocotón, y se hundirán hasta el fondo!

### Arte Científico 🎨

¡Dibuja una gran tina de agua con manzanas flotando arriba y otras frutas hundiéndose abajo! Pregúntales a tus peques: *"¿Qué otras frutas crees que flotarían?"*

**Dato extra:** Hay más de 7,500 variedades de manzanas en el mundo. ¡Si comieras una diferente cada día, tardarías más de 20 años en probarlas todas! 🍏`
    }
  },
  {
    slug: "fun-fact-avocados-are-fruits",
    postId: "fun-fact-avocados-fruit",
    tags: '["fun-fact", "food", "nature"]',
    en: {
      title: "Did You Know? Avocados Are Fruits, Not Vegetables!",
      summary: "Avocados are technically single-seeded berries — making them a fruit!",
      body: `## Avocados Are Fruits! 🥑

Guacamole fans, listen up: **avocados are technically fruits — and more specifically, they're berries!**

A fruit is any part of a plant that develops from a flower and contains seeds. Since avocados grow from a flower and have a big seed (the pit) inside, they're definitely fruits. In fact, they're classified as a single-seeded berry!

### Silly Science Art 🎨

Color an avocado in a fruit basket, hanging out with bananas, grapes, and watermelons — all fellow berries! Ask your kids: *"What's your favorite way to eat this sneaky fruit?"*

**Fun fact bonus:** Avocados don't ripen on the tree! Farmers pick them and they only start to soften after being harvested. 🌳`
    },
    es: {
      title: "¿Sabías Que? ¡Los Aguacates Son Frutas, No Verduras!",
      summary: "Los aguacates son técnicamente bayas de una sola semilla — ¡lo que los convierte en frutas!",
      body: `## ¡Los Aguacates Son Frutas! 🥑

Fans del guacamole, atención: **¡los aguacates técnicamente son frutas — y más específicamente, son bayas!**

Una fruta es cualquier parte de una planta que se desarrolla a partir de una flor y contiene semillas. Como los aguacates crecen de una flor y tienen una gran semilla (el hueso) dentro, definitivamente son frutas. De hecho, ¡están clasificados como bayas de una sola semilla!

### Arte Científico Divertido 🎨

Colorea un aguacate en una cesta de frutas, pasando el rato con plátanos, uvas y sandías — ¡todas bayas compañeras! Pregúntales a tus peques: *"¿Cuál es tu forma favorita de comer esta fruta traviesa?"*

**Dato extra:** ¡Los aguacates no maduran en el árbol! Los granjeros los recogen y solo empiezan a ablandarse después de ser cosechados. 🌳`
    }
  },
  {
    slug: "fun-fact-popcorn-pops-three-feet",
    postId: "fun-fact-popcorn-pops",
    tags: '["fun-fact", "food", "science"]',
    en: {
      title: "Did You Know? Popcorn Can Pop Up to 3 Feet High!",
      summary: "When popcorn kernels pop, they can shoot up to 3 feet in the air — that's almost as tall as a 5-year-old!",
      body: `## Popcorn Can Pop 3 Feet High! 🍿

Movie night just got more interesting: **popcorn kernels can pop up to 3 feet (1 meter) into the air!**

Inside each kernel is a tiny drop of water surrounded by starch. When the kernel heats up, the water turns to steam, building pressure until — POP! — the kernel explodes inside out. The steam's force can launch the popcorn up to 3 feet high. That's why you always use a lid!

### Poppin' Art Time 🎨

Color a popcorn machine or pot with kernels flying everywhere — some going really high! Ask your kids: *"What would happen if your whole kitchen was filled with popping corn?"*

**Fun fact bonus:** Americans eat about 15 billion quarts of popcorn every year — enough to fill the Empire State Building 18 times! 🏙️`
    },
    es: {
      title: "¿Sabías Que? ¡Las Palomitas Pueden Saltar Hasta 1 Metro de Alto!",
      summary: "Cuando explotan los granos de maíz, ¡pueden saltar hasta 1 metro en el aire — casi tan alto como un niño de 5 años!",
      body: `## ¡Las Palomitas Pueden Saltar 1 Metro! 🍿

La noche de película se pone más interesante: **¡los granos de maíz pueden saltar hasta 1 metro en el aire cuando explotan!**

Dentro de cada grano hay una gotita de agua rodeada de almidón. Cuando el grano se calienta, el agua se convierte en vapor, creando presión hasta que — ¡POP! — el grano explota por dentro hacia fuera. La fuerza del vapor puede lanzar la palomita hasta 1 metro de alto. ¡Por eso siempre usamos tapa!

### Arte Explosivo 🎨

Colorea una máquina o olla de palomitas con granos volando por todos lados — ¡algunos muy alto! Pregúntales a tus peques: *"¿Qué pasaría si toda tu cocina se llenara de palomitas explotando?"*

**Dato extra:** ¡Los estadounidenses comen unos 15 mil millones de litros de palomitas al año — suficientes para llenar el Empire State Building 18 veces! 🏙️`
    }
  },
  {
    slug: "fun-fact-lemons-float-limes-sink",
    postId: "fun-fact-lemons-limes",
    tags: '["fun-fact", "food", "science"]',
    en: {
      title: "Did You Know? Lemons Float But Limes Sink!",
      summary: "Even though they look similar, lemons float in water while limes sink — it's all about density!",
      body: `## Lemons Float But Limes Sink! 🍋

Here's a fun experiment to try at home: **put a lemon and a lime in water — the lemon floats and the lime sinks!**

Even though they look almost the same, limes are slightly denser than lemons. Lemons have a thicker, spongier rind full of tiny air pockets that help them float, while limes have a thinner rind and denser flesh. It's a tiny difference, but enough to change everything!

### Kitchen Science Art 🎨

Draw a glass of water with a lemon floating on top and a lime sitting at the bottom! Ask your kids: *"What other foods do you think float or sink? Let's test!"*

**Fun fact bonus:** The largest lemon ever grown weighed over 11 pounds — that's heavier than a newborn baby! 🍋`
    },
    es: {
      title: "¿Sabías Que? ¡Los Limones Flotan Pero las Limas Se Hunden!",
      summary: "Aunque se parecen mucho, los limones flotan en el agua mientras las limas se hunden — ¡todo es cuestión de densidad!",
      body: `## ¡Los Limones Flotan Pero las Limas Se Hunden! 🍋

Aquí tienes un experimento divertido para hacer en casa: **¡pon un limón y una lima en agua — el limón flota y la lima se hunde!**

Aunque se parecen casi iguales, las limas son ligeramente más densas que los limones. Los limones tienen una cáscara más gruesa y esponjosa llena de pequeñas bolsas de aire que les ayudan a flotar, mientras que las limas tienen una cáscara más fina y la pulpa más densa. ¡Es una diferencia pequeña, pero suficiente para cambiarlo todo!

### Arte de Ciencia en la Cocina 🎨

¡Dibuja un vaso de agua con un limón flotando arriba y una lima en el fondo! Pregúntales a tus peques: *"¿Qué otros alimentos crees que flotan o se hunden? ¡Vamos a probarlo!"*

**Dato extra:** ¡El limón más grande jamás cultivado pesó más de 5 kilos — eso es más pesado que un bebé recién nacido! 🍋`
    }
  },
  // ── Space ──────────────────────────────────────
  {
    slug: "fun-fact-venus-day-longer-than-year",
    postId: "fun-fact-venus-day",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? A Day on Venus Is Longer Than Its Year!",
      summary: "Venus spins so slowly that one day on Venus is actually longer than one Venus year!",
      body: `## A Day on Venus Is Longer Than Its Year! 🪐

This will twist your brain: **one day on Venus lasts longer than one year on Venus!**

Venus takes 243 Earth days to spin once on its axis (one Venusian day), but only 225 Earth days to orbit the Sun (one Venusian year). So a "day" on Venus is actually 18 Earth days LONGER than its "year." And here's another twist — Venus spins backwards compared to most planets!

### Space Art Time 🎨

Color Venus with a big confused clock on it! Ask your kids: *"If your birthday came before you even woke up, would that be awesome or confusing?"*

**Fun fact bonus:** Venus is often called Earth's "twin" because they're almost the same size, but Venus's surface is hot enough to melt lead — about 900°F (475°C)! 🌡️`
    },
    es: {
      title: "¿Sabías Que? ¡Un Día en Venus Es Más Largo Que Su Año!",
      summary: "Venus gira tan lentamente que un día en Venus es en realidad más largo que un año venusiano.",
      body: `## ¡Un Día en Venus Es Más Largo Que Su Año! 🪐

Esto te va a dar vueltas la cabeza: **¡un día en Venus dura más que un año en Venus!**

Venus tarda 243 días terrestres en girar una vez sobre su eje (un día venusiano), pero solo 225 días terrestres en orbitar alrededor del Sol (un año venusiano). Así que un "día" en Venus es en realidad 18 días terrestres MÁS LARGO que su "año". Y aquí hay otro giro — ¡Venus gira al revés comparado con la mayoría de los planetas!

### Arte Espacial 🎨

¡Colorea Venus con un gran reloj confundido encima! Pregúntales a tus peques: *"Si tu cumpleaños llegara antes de que te despertaras, ¿sería genial o confuso?"*

**Dato extra:** A Venus a menudo la llaman la "gemela" de la Tierra porque son casi del mismo tamaño, ¡pero la superficie de Venus está tan caliente que puede derretir el plomo — unos 475°C! 🌡️`
    }
  },
  {
    slug: "fun-fact-sun-fits-million-earths",
    postId: "fun-fact-sun-earths",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? The Sun Could Fit 1.3 Million Earths Inside It!",
      summary: "The Sun is so massive that you could fit about 1.3 million Earths inside it!",
      body: `## 1.3 Million Earths Fit Inside the Sun! ☀️

The Sun is REALLY big: **you could fit approximately 1.3 million Earths inside it!**

The Sun's diameter is about 864,000 miles — that's 109 times wider than Earth. And it accounts for 99.86% of all the mass in our entire solar system. Everything else — all the planets, moons, asteroids, and comets combined — makes up just 0.14%!

### Cosmic Art Time 🎨

Try drawing a giant Sun with tiny Earths inside it to show the scale! Ask your kids: *"If the Sun is a beach ball, Earth would be about the size of a pea — can you imagine that?"*

**Fun fact bonus:** Light from the Sun takes about 8 minutes and 20 seconds to reach Earth. So when you see the Sun, you're actually seeing it as it was 8 minutes ago! ⏱️`
    },
    es: {
      title: "¿Sabías Que? ¡El Sol Podría Contener 1,3 Millones de Tierras Dentro!",
      summary: "El Sol es tan enorme que podrías meter aproximadamente 1,3 millones de Tierras dentro de él.",
      body: `## ¡1,3 Millones de Tierras Caben Dentro del Sol! ☀️

El Sol es REALMENTE grande: **¡podrías meter aproximadamente 1,3 millones de Tierras dentro de él!**

El diámetro del Sol es de unos 1,4 millones de kilómetros — eso es 109 veces más ancho que la Tierra. Y representa el 99,86% de toda la masa de nuestro sistema solar. Todo lo demás — todos los planetas, lunas, asteroides y cometas juntos — ¡solo forman el 0,14%!

### Arte Cósmico 🎨

¡Intenta dibujar un Sol gigante con pequeñas Tierras dentro para mostrar la escala! Pregúntales a tus peques: *"Si el Sol fuera una pelota de playa, la Tierra sería del tamaño de un guisante — ¿te lo puedes imaginar?"*

**Dato extra:** La luz del Sol tarda unos 8 minutos y 20 segundos en llegar a la Tierra. ¡Así que cuando ves el Sol, en realidad lo estás viendo como era hace 8 minutos! ⏱️`
    }
  },
  {
    slug: "fun-fact-more-stars-than-sand",
    postId: "fun-fact-stars-sand",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? There Are More Stars Than Grains of Sand on Earth!",
      summary: "Scientists estimate there are more stars in the universe than grains of sand on all of Earth's beaches!",
      body: `## More Stars Than Grains of Sand! ⭐

Next time you're at the beach, grab a handful of sand and think about this: **there are more stars in the universe than grains of sand on ALL of Earth's beaches!**

Scientists estimate there are about 100 to 400 billion stars in our galaxy alone, and there are at least 2 trillion galaxies in the observable universe. That adds up to roughly 700 sextillion stars (that's a 7 followed by 23 zeros!). Meanwhile, there are "only" about 7.5 quintillion grains of sand on Earth.

### Starry Art Time 🎨

Fill an entire page with stars — as many as you can draw! Ask your kids: *"How many stars do you think you can see with just your eyes at night?"* (The answer: about 2,500!)

**Fun fact bonus:** Many of the stars you see at night might not exist anymore — their light has been traveling for so long that the star may have already died! 🌌`
    },
    es: {
      title: "¿Sabías Que? ¡Hay Más Estrellas Que Granos de Arena en la Tierra!",
      summary: "Los científicos estiman que hay más estrellas en el universo que granos de arena en todas las playas de la Tierra.",
      body: `## ¡Más Estrellas Que Granos de Arena! ⭐

La próxima vez que estés en la playa, agarra un puñado de arena y piensa en esto: **¡hay más estrellas en el universo que granos de arena en TODAS las playas de la Tierra!**

Los científicos estiman que hay entre 100 y 400 mil millones de estrellas solo en nuestra galaxia, y hay al menos 2 billones de galaxias en el universo observable. Eso suma aproximadamente 700 sextillones de estrellas. Mientras tanto, solo hay unos 7,5 trillones de granos de arena en la Tierra.

### Arte Estrellado 🎨

¡Llena una página entera con estrellas — tantas como puedas dibujar! Pregúntales a tus peques: *"¿Cuántas estrellas crees que puedes ver solo con tus ojos por la noche?"* (La respuesta: ¡unas 2,500!)

**Dato extra:** Muchas de las estrellas que ves por la noche quizás ya no existen — ¡su luz ha viajado tanto tiempo que la estrella puede haber muerto ya! 🌌`
    }
  },
  {
    slug: "fun-fact-moon-footprints-last-forever",
    postId: "fun-fact-moon-footprints",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? Footprints on the Moon Last Forever!",
      summary: "Since there's no wind or water on the Moon, astronaut footprints from 1969 are still perfectly preserved!",
      body: `## Footprints on the Moon Last Forever! 🌙

Here's an amazing thought: **the footprints that astronauts left on the Moon in 1969 are STILL there!**

On Earth, footprints in sand disappear quickly because of wind, rain, and waves. But the Moon has no atmosphere — that means no wind, no rain, and no weather of any kind. Those footprints could potentially last for **millions of years** unless a meteorite happens to hit that exact spot!

### Moon Art Time 🎨

Draw a big Moon surface with bootprints all over it! Ask your kids: *"If you could leave YOUR footprint on the Moon forever, what kind of shoes would you wear?"*

**Fun fact bonus:** The Moon is slowly moving away from Earth — about 1.5 inches (3.8 cm) per year. In billions of years, it will be much farther away! 🚀`
    },
    es: {
      title: "¿Sabías Que? ¡Las Huellas en la Luna Duran Para Siempre!",
      summary: "Como no hay viento ni agua en la Luna, ¡las huellas de los astronautas de 1969 siguen perfectamente conservadas!",
      body: `## ¡Las Huellas en la Luna Duran Para Siempre! 🌙

Aquí tienes un pensamiento increíble: **¡las huellas que los astronautas dejaron en la Luna en 1969 SIGUEN ahí!**

En la Tierra, las huellas en la arena desaparecen rápido por el viento, la lluvia y las olas. Pero la Luna no tiene atmósfera — eso significa que no hay viento, ni lluvia, ni clima de ningún tipo. Esas huellas podrían durar potencialmente **millones de años** ¡a menos que un meteorito caiga justo en ese punto!

### Arte Lunar 🎨

¡Dibuja una gran superficie lunar con huellas de botas por todas partes! Pregúntales a tus peques: *"Si pudieras dejar TU huella en la Luna para siempre, ¿qué zapatos llevarías?"*

**Dato extra:** La Luna se está alejando lentamente de la Tierra — unos 3,8 cm por año. ¡En miles de millones de años, estará mucho más lejos! 🚀`
    }
  },
  {
    slug: "fun-fact-saturn-floats-in-water",
    postId: "fun-fact-saturn-floats",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? Saturn Could Float in a Giant Bathtub!",
      summary: "Saturn is less dense than water — if you had a bathtub big enough, it would actually float!",
      body: `## Saturn Could Float in Water! 🪐

This is one of the most mind-blowing space facts: **Saturn is so light for its size that it would float in water!**

Even though Saturn is the second-largest planet (764 Earths could fit inside!), it's mostly made of hydrogen and helium gas. This makes it less dense than water — about 0.687 g/cm³ compared to water's 1 g/cm³. Of course, you'd need a bathtub about 75,000 miles wide!

### Silly Space Art 🎨

Draw Saturn sitting in a giant bathtub with its rings poking out! Ask your kids: *"What other silly things would you put in a space-sized bathtub?"*

**Fun fact bonus:** Saturn's rings are incredibly thin — if Saturn were as big as a gymnasium, its rings would be thinner than a sheet of paper! 📄`
    },
    es: {
      title: "¿Sabías Que? ¡Saturno Podría Flotar en una Bañera Gigante!",
      summary: "Saturno es menos denso que el agua — ¡si tuvieras una bañera lo suficientemente grande, realmente flotaría!",
      body: `## ¡Saturno Podría Flotar en el Agua! 🪐

Este es uno de los datos espaciales más alucinantes: **¡Saturno es tan ligero para su tamaño que flotaría en el agua!**

Aunque Saturno es el segundo planeta más grande (¡764 Tierras cabrían dentro!), está hecho principalmente de gas hidrógeno y helio. Esto lo hace menos denso que el agua — unos 0,687 g/cm³ comparado con el 1 g/cm³ del agua. ¡Claro, necesitarías una bañera de unos 120,000 kilómetros de ancho!

### Arte Espacial Divertido 🎨

¡Dibuja Saturno sentado en una bañera gigante con sus anillos saliendo por los lados! Pregúntales a tus peques: *"¿Qué otras cosas locas pondrías en una bañera del tamaño del espacio?"*

**Dato extra:** Los anillos de Saturno son increíblemente finos — ¡si Saturno fuera tan grande como un gimnasio, sus anillos serían más finos que una hoja de papel! 📄`
    }
  },
  {
    slug: "fun-fact-spacesuit-costs-millions",
    postId: "fun-fact-spacesuit-cost",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? A Spacesuit Costs About 12 Million Dollars!",
      summary: "NASA spacesuits cost approximately $12 million each — they're basically wearable spaceships!",
      body: `## A Spacesuit Costs $12 Million! 🧑‍🚀

Think your favorite outfit is expensive? **A NASA spacesuit costs about $12 million!**

That's because a spacesuit isn't just clothing — it's basically a tiny, wearable spaceship. It has to provide oxygen, remove CO2, maintain the right pressure and temperature, protect against radiation, and withstand micrometeoroids — all while letting the astronaut move and work. The gloves alone take 5 months to make!

### Astronaut Art Time 🎨

Design and color your own dream spacesuit! What special features would yours have? Ask your kids: *"If you could add anything to a spacesuit, what would it be?"*

**Fun fact bonus:** Astronauts wear diapers inside their spacesuits during spacewalks — they're called Maximum Absorbency Garments (MAGs)! 👶`
    },
    es: {
      title: "¿Sabías Que? ¡Un Traje Espacial Cuesta Unos 12 Millones de Dólares!",
      summary: "Los trajes espaciales de la NASA cuestan aproximadamente 12 millones cada uno — ¡son básicamente naves espaciales que se llevan puestas!",
      body: `## ¡Un Traje Espacial Cuesta 12 Millones! 🧑‍🚀

¿Crees que tu ropa favorita es cara? **¡Un traje espacial de la NASA cuesta unos 12 millones de dólares!**

Eso es porque un traje espacial no es solo ropa — es básicamente una nave espacial diminuta que te pones. Tiene que proporcionar oxígeno, eliminar CO2, mantener la presión y temperatura correctas, proteger contra la radiación y resistir micrometeoritos — todo mientras permite al astronauta moverse y trabajar. ¡Solo los guantes tardan 5 meses en fabricarse!

### Arte de Astronauta 🎨

¡Diseña y colorea tu propio traje espacial soñado! ¿Qué características especiales tendría el tuyo? Pregúntales a tus peques: *"Si pudieras añadir cualquier cosa a un traje espacial, ¿qué sería?"*

**Dato extra:** ¡Los astronautas llevan pañales dentro de sus trajes espaciales durante los paseos espaciales — se llaman Prendas de Máxima Absorbencia! 👶`
    }
  },
  {
    slug: "fun-fact-diamond-rain-jupiter",
    postId: "fun-fact-diamond-rain",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? It Rains Diamonds on Jupiter and Saturn!",
      summary: "The extreme pressure and temperature on Jupiter and Saturn can turn carbon into diamonds that fall like rain!",
      body: `## It Rains Diamonds on Jupiter and Saturn! 💎

This sounds like a fairy tale, but it's real: **it actually rains diamonds on Jupiter and Saturn!**

Lightning storms in the atmosphere turn methane gas into carbon. As the carbon falls deeper into the planet, the extreme pressure and heat compress it first into graphite, then into solid **diamonds**. Scientists estimate that about 1,000 tons of diamonds rain down on Saturn every year!

### Magical Space Art 🎨

Draw a beautiful rain of sparkly diamonds falling through colorful gas clouds on Saturn! Ask your kids: *"If it rained diamonds in your backyard, what would you build with them?"*

**Fun fact bonus:** The largest known diamond in space is a star called "Lucy" — it's a 10-billion-trillion-trillion-carat diamond, about 2,500 miles across! Named after the Beatles song "Lucy in the Sky with Diamonds." 🎵`
    },
    es: {
      title: "¿Sabías Que? ¡Llueven Diamantes en Júpiter y Saturno!",
      summary: "La presión y temperatura extremas en Júpiter y Saturno pueden convertir el carbono en diamantes que caen como lluvia.",
      body: `## ¡Llueven Diamantes en Júpiter y Saturno! 💎

Esto suena como un cuento de hadas, pero es real: **¡en Júpiter y Saturno realmente llueven diamantes!**

Las tormentas eléctricas en la atmósfera convierten el gas metano en carbono. A medida que el carbono cae más profundo en el planeta, la presión y el calor extremos lo comprimen primero en grafito y luego en **diamantes** sólidos. ¡Los científicos estiman que unas 1,000 toneladas de diamantes llueven sobre Saturno cada año!

### Arte Espacial Mágico 🎨

¡Dibuja una hermosa lluvia de diamantes brillantes cayendo a través de nubes de gas coloridas en Saturno! Pregúntales a tus peques: *"Si llovieran diamantes en tu jardín, ¿qué construirías con ellos?"*

**Dato extra:** El diamante más grande conocido en el espacio es una estrella llamada "Lucy" — ¡es un diamante de 10 mil millones de billones de billones de quilates, de unos 4,000 km de ancho! Nombrada por la canción de los Beatles "Lucy in the Sky with Diamonds." 🎵`
    }
  },
  {
    slug: "fun-fact-milky-way-smells-like-rum",
    postId: "fun-fact-milky-way-smell",
    tags: '["fun-fact", "space", "science"]',
    en: {
      title: "Did You Know? The Milky Way Smells Like Rum and Raspberries!",
      summary: "Scientists found a chemical in the center of our galaxy that smells like rum and tastes like raspberries!",
      body: `## The Milky Way Smells Like Rum! 🫐

This is one of the strangest space facts ever: **the center of our Milky Way galaxy contains a chemical called ethyl formate, which smells like rum and tastes like raspberries!**

Astronomers using the IRAM telescope in Spain discovered billions of these molecules floating in a giant dust cloud called Sagittarius B2, near the center of our galaxy. Of course, you couldn't actually smell it because, well, space!

### Galaxy Art Time 🎨

Draw a swirling Milky Way with tiny raspberries and rum bottles floating through it! Ask your kids: *"If outer space had a flavor, what would you want it to taste like?"*

**Fun fact bonus:** Our galaxy is called the "Milky Way" because ancient Greeks thought it looked like spilled milk across the sky. In Spanish, it's "Vía Láctea" — milky road! 🥛`
    },
    es: {
      title: "¿Sabías Que? ¡La Vía Láctea Huele a Ron y Sabe a Frambuesas!",
      summary: "Los científicos encontraron un químico en el centro de nuestra galaxia que huele a ron y sabe a frambuesas.",
      body: `## ¡La Vía Láctea Huele a Ron! 🫐

Este es uno de los datos espaciales más raros de todos: **¡el centro de nuestra galaxia Vía Láctea contiene un químico llamado formiato de etilo, que huele a ron y sabe a frambuesas!**

Astrónomos usando el telescopio IRAM en España descubrieron miles de millones de estas moléculas flotando en una nube de polvo gigante llamada Sagitario B2, cerca del centro de nuestra galaxia. Por supuesto, no podrías olerlo porque, bueno, ¡es el espacio!

### Arte Galáctico 🎨

¡Dibuja una Vía Láctea girando con pequeñas frambuesas y botellas de ron flotando! Pregúntales a tus peques: *"Si el espacio exterior tuviera un sabor, ¿a qué querrías que supiera?"*

**Dato extra:** Nuestra galaxia se llama "Vía Láctea" porque los antiguos griegos pensaban que parecía leche derramada por el cielo. ¡En inglés se llama "Milky Way" — camino de leche! 🥛`
    }
  },
  // ── Machines & Vehicles ──────────────────────────
  {
    slug: "fun-fact-first-car-slower-than-bicycle",
    postId: "fun-fact-first-car-slow",
    tags: '["fun-fact", "machines", "history"]',
    en: {
      title: "Did You Know? The First Car Was Slower Than a Bicycle!",
      summary: "The Benz Patent-Motorwagen from 1886 had a top speed of about 10 mph — a bicycle can go 15 mph!",
      body: `## The First Car Was Slower Than a Bicycle! 🚗

Next time you ride your bike, know this: **you're going faster than the very first car ever made!**

Karl Benz invented the first real automobile in 1886 — the Benz Patent-Motorwagen. It had a tiny engine and a top speed of about **10 mph (16 km/h)**. A regular bicycle can easily go 15 mph. The first car also had only three wheels and no roof!

### Vehicle Art Time 🎨

Color the first-ever car side by side with a modern race car — look at the difference! Ask your kids: *"What do you think cars will look like 100 years from now?"*

**Fun fact bonus:** The first speeding ticket was given in 1896 to a man going 8 mph (13 km/h) in a 2 mph (3 km/h) zone! 🎫`
    },
    es: {
      title: "¿Sabías Que? ¡El Primer Coche Era Más Lento Que una Bicicleta!",
      summary: "El Benz Patent-Motorwagen de 1886 tenía una velocidad máxima de unos 16 km/h — ¡una bicicleta puede ir a 24 km/h!",
      body: `## ¡El Primer Coche Era Más Lento Que una Bicicleta! 🚗

La próxima vez que montes en bici, recuerda esto: **¡vas más rápido que el primer coche jamás fabricado!**

Karl Benz inventó el primer automóvil real en 1886 — el Benz Patent-Motorwagen. Tenía un motor diminuto y una velocidad máxima de unos **16 km/h**. Una bicicleta normal puede ir fácilmente a 24 km/h. ¡El primer coche además solo tenía tres ruedas y no tenía techo!

### Arte de Vehículos 🎨

Colorea el primer coche de la historia junto a un coche de carreras moderno — ¡mira la diferencia! Pregúntales a tus peques: *"¿Cómo crees que serán los coches dentro de 100 años?"*

**Dato extra:** ¡La primera multa por exceso de velocidad se puso en 1896 a un hombre que iba a 13 km/h en una zona de 5 km/h! 🎫`
    }
  },
  {
    slug: "fun-fact-fire-trucks-pulled-by-horses",
    postId: "fun-fact-fire-trucks-horses",
    tags: '["fun-fact", "machines", "history"]',
    en: {
      title: "Did You Know? Fire Trucks Used to Be Pulled by Horses!",
      summary: "Before engines, fire trucks were horse-drawn wagons — and the horses were specially trained heroes!",
      body: `## Fire Trucks Were Pulled by Horses! 🐴🚒

Before motorized fire trucks existed, **fire engines were pulled by teams of strong horses!**

These weren't just any horses — they were specially trained to respond to the fire bell. When the alarm sounded, the horses would run to their positions, the harnesses would drop down onto them, and they'd gallop to the fire at full speed. The horses were treated like heroes and were so loved that when fire departments switched to motorized trucks around 1920, many firefighters were sad to see them go!

### Heroic Art Time 🎨

Color a team of brave horses pulling a shiny red fire wagon through town! Ask your kids: *"If you were a fire horse, what would your name be?"*

**Fun fact bonus:** Dalmatians became fire station dogs because they got along great with horses and would run ahead of the wagon to clear the road! 🐕‍🦺`
    },
    es: {
      title: "¿Sabías Que? ¡Los Camiones de Bomberos Los Tiraban Caballos!",
      summary: "Antes de los motores, los camiones de bomberos eran carros tirados por caballos — ¡y los caballos eran héroes especialmente entrenados!",
      body: `## ¡Los Camiones de Bomberos Los Tiraban Caballos! 🐴🚒

Antes de que existieran los camiones de bomberos con motor, **¡los coches de bomberos eran tirados por equipos de fuertes caballos!**

No eran caballos cualquiera — estaban especialmente entrenados para responder a la campana de incendios. Cuando sonaba la alarma, los caballos corrían a sus posiciones, los arneses caían sobre ellos y galopaban hacia el fuego a toda velocidad. Los caballos eran tratados como héroes y eran tan queridos que cuando los departamentos de bomberos cambiaron a camiones motorizados alrededor de 1920, ¡muchos bomberos se entristecieron al verlos partir!

### Arte Heroico 🎨

¡Colorea un equipo de valientes caballos tirando un brillante carro de bomberos rojo por la ciudad! Pregúntales a tus peques: *"Si fueras un caballo de bomberos, ¿cómo te llamarías?"*

**Dato extra:** ¡Los dálmatas se convirtieron en perros de estación de bomberos porque se llevaban genial con los caballos y corrían delante del carro para despejar el camino! 🐕‍🦺`
    }
  },
  {
    slug: "fun-fact-tallest-crane-eiffel-tower",
    postId: "fun-fact-tallest-crane",
    tags: '["fun-fact", "machines", "construction"]',
    en: {
      title: "Did You Know? The Tallest Crane Ever Was Taller Than the Eiffel Tower!",
      summary: "The world's tallest crane reached over 820 feet — taller than the Eiffel Tower's observation deck!",
      body: `## The Tallest Crane Was Taller Than the Eiffel Tower! 🏗️

Construction fans, this one's for you: **the world's tallest crane ever built reached about 820 feet (250 meters) high!**

That's taller than the Eiffel Tower's main observation deck! These massive cranes are used to build supertall skyscrapers and wind turbines. The biggest cranes can lift over 20,000 tons — that's as heavy as about 4,000 elephants!

### Construction Art Time 🎨

Draw the biggest, tallest crane you can imagine reaching up into the clouds! Ask your kids: *"What would YOU build if you had the world's biggest crane?"*

**Fun fact bonus:** Tower cranes are built by smaller cranes, which are built by even smaller cranes — it's like Russian nesting dolls of construction equipment! 🪆`
    },
    es: {
      title: "¿Sabías Que? ¡La Grúa Más Alta del Mundo Era Más Alta Que la Torre Eiffel!",
      summary: "La grúa más alta del mundo alcanzó más de 250 metros — ¡más alta que el mirador de la Torre Eiffel!",
      body: `## ¡La Grúa Más Alta Era Más Alta Que la Torre Eiffel! 🏗️

Fans de la construcción, esto es para ustedes: **¡la grúa más alta jamás construida alcanzó unos 250 metros de alto!**

¡Eso es más alto que el mirador principal de la Torre Eiffel! Estas grúas masivas se usan para construir rascacielos superaltos y turbinas eólicas. ¡Las grúas más grandes pueden levantar más de 20,000 toneladas — eso pesa tanto como unos 4,000 elefantes!

### Arte de Construcción 🎨

¡Dibuja la grúa más grande y alta que puedas imaginar llegando hasta las nubes! Pregúntales a tus peques: *"¿Qué construirías TÚ si tuvieras la grúa más grande del mundo?"*

**Dato extra:** Las grúas torre las construyen grúas más pequeñas, que a su vez las construyen grúas aún más pequeñas — ¡son como muñecas rusas de equipos de construcción! 🪆`
    }
  },
  {
    slug: "fun-fact-airplanes-struck-by-lightning",
    postId: "fun-fact-planes-lightning",
    tags: '["fun-fact", "machines", "airplanes"]',
    en: {
      title: "Did You Know? Airplanes Get Struck by Lightning — And It's Totally Fine!",
      summary: "Commercial airplanes get hit by lightning about once or twice a year, but they're designed to handle it perfectly!",
      body: `## Airplanes Get Struck by Lightning! ✈️⚡

Afraid of flying in a storm? Don't be: **every commercial airplane gets hit by lightning about once or twice a year, and it's completely safe!**

Airplanes are designed so that lightning enters one point (usually the nose or wingtip), travels along the outside of the metal body, and exits from another point — without ever entering the cabin or damaging anything important. The last lightning-caused accident on a US commercial flight was in 1967, and planes have been redesigned since then.

### Sky-High Art Time 🎨

Draw an airplane flying through a cool thunderstorm with lightning bolts bouncing off it! Ask your kids: *"If you could fly through any kind of weather, what would you choose?"*

**Fun fact bonus:** Pilots sometimes trigger lightning strikes! When a plane flies through charged clouds, it can cause the lightning bolt itself. ⚡`
    },
    es: {
      title: "¿Sabías Que? ¡A los Aviones Les Cae un Rayo — Y Están Perfectamente Bien!",
      summary: "A los aviones comerciales les cae un rayo una o dos veces al año, ¡pero están diseñados para manejarlo perfectamente!",
      body: `## ¡A los Aviones Les Cae un Rayo! ✈️⚡

¿Te da miedo volar con tormenta? No debería: **¡a cada avión comercial le cae un rayo una o dos veces al año, y es completamente seguro!**

Los aviones están diseñados para que el rayo entre por un punto (generalmente la nariz o la punta del ala), viaje por el exterior del cuerpo metálico y salga por otro punto — sin entrar jamás en la cabina ni dañar nada importante. El último accidente causado por un rayo en un vuelo comercial en EE.UU. fue en 1967, y los aviones han sido rediseñados desde entonces.

### Arte a Gran Altura 🎨

¡Dibuja un avión volando a través de una tormenta genial con rayos rebotando en él! Pregúntales a tus peques: *"Si pudieras volar a través de cualquier tipo de clima, ¿cuál elegirías?"*

**Dato extra:** ¡A veces los pilotos provocan los rayos! Cuando un avión vuela a través de nubes cargadas, puede causar el rayo. ⚡`
    }
  },
  {
    slug: "fun-fact-school-bus-yellow",
    postId: "fun-fact-bus-yellow",
    tags: '["fun-fact", "machines", "colors"]',
    en: {
      title: "Did You Know? School Buses Are Yellow Because It's the Easiest Color to See!",
      summary: "School buses are painted 'National School Bus Glossy Yellow' — a color chosen because humans see it fastest, even in the dark!",
      body: `## School Buses Are Yellow for a Scientific Reason! 🚌

Ever wonder why ALL school buses are the same yellow color? **It's because yellow is the color that humans can see fastest, even in their peripheral vision!**

In 1939, educator Frank Cyr organized a conference that standardized the school bus color to "National School Bus Glossy Yellow." This specific yellow was chosen because people notice it 1.24 times faster than red — which is important for keeping kids safe. It's also highly visible in dawn, dusk, rain, and fog.

### Color Science Art 🎨

Color a school bus in its special yellow, then try drawing it in other colors to see which stands out most! Ask your kids: *"If you could change the school bus to any color, what would you pick?"*

**Fun fact bonus:** There are about 480,000 school buses in the United States — they carry 26 million children every day, making it the largest mass transit system in the country! 🎒`
    },
    es: {
      title: "¿Sabías Que? ¡Los Autobuses Escolares Son Amarillos Porque Es el Color Más Fácil de Ver!",
      summary: "Los autobuses escolares se pintan de un amarillo especial — un color elegido porque los humanos lo ven más rápido, ¡incluso en la oscuridad!",
      body: `## ¡Los Autobuses Escolares Son Amarillos Por una Razón Científica! 🚌

¿Alguna vez te has preguntado por qué TODOS los autobuses escolares son del mismo color amarillo? **¡Es porque el amarillo es el color que los humanos pueden ver más rápido, incluso con la visión periférica!**

En 1939, el educador Frank Cyr organizó una conferencia que estandarizó el color del autobús escolar como "Amarillo Brillante Nacional de Autobús Escolar." Este amarillo específico fue elegido porque las personas lo notan 1,24 veces más rápido que el rojo — lo cual es importante para mantener seguros a los niños. También es muy visible al amanecer, al atardecer, con lluvia y con niebla.

### Arte de Ciencia del Color 🎨

Colorea un autobús escolar en su amarillo especial, ¡luego intenta dibujarlo en otros colores para ver cuál destaca más! Pregúntales a tus peques: *"Si pudieras cambiar el autobús escolar a cualquier color, ¿cuál elegirías?"*

**Dato extra:** ¡Hay unos 480,000 autobuses escolares en Estados Unidos — transportan a 26 millones de niños cada día, convirtiéndolos en el sistema de transporte masivo más grande del país! 🎒`
    }
  },
  // ── Colors & Art ──────────────────────────────────
  {
    slug: "fun-fact-blue-rarest-color-nature",
    postId: "fun-fact-blue-rare",
    tags: '["fun-fact", "colors", "nature"]',
    en: {
      title: "Did You Know? Blue Is the Rarest Color in Nature!",
      summary: "True blue is extremely rare in plants and animals — most 'blue' things in nature are actually playing tricks with light!",
      body: `## Blue Is the Rarest Color in Nature! 💙

Look around you — **true blue is almost impossible to find in nature!**

While the sky and ocean appear blue, they don't contain blue pigment. Most "blue" animals (like blue jays and blue morpho butterflies) aren't actually blue either — their feathers and wings have microscopic structures that scatter light to CREATE the appearance of blue. Only a handful of living things produce true blue pigment.

### Color Hunt Art 🎨

Can you draw 5 things from nature that look blue? Then put a star on any that are TRULY blue! Ask your kids: *"Why do you think blue is so rare in nature?"*

**Fun fact bonus:** Blue eyes don't actually contain blue pigment either! They appear blue because of the way light scatters in the iris — similar to why the sky looks blue. 👁️`
    },
    es: {
      title: "¿Sabías Que? ¡El Azul Es el Color Más Raro en la Naturaleza!",
      summary: "El azul verdadero es extremadamente raro en plantas y animales — ¡la mayoría de cosas 'azules' en la naturaleza en realidad juegan trucos con la luz!",
      body: `## ¡El Azul Es el Color Más Raro en la Naturaleza! 💙

Mira a tu alrededor — **¡el azul verdadero es casi imposible de encontrar en la naturaleza!**

Aunque el cielo y el océano parecen azules, no contienen pigmento azul. La mayoría de animales "azules" (como los arrendajos azules y las mariposas morpho azules) tampoco son realmente azules — sus plumas y alas tienen estructuras microscópicas que dispersan la luz para CREAR la apariencia de azul. Solo un puñado de seres vivos producen pigmento azul verdadero.

### Arte de Caza de Colores 🎨

¿Puedes dibujar 5 cosas de la naturaleza que se vean azules? ¡Luego pon una estrella en las que sean REALMENTE azules! Pregúntales a tus peques: *"¿Por qué crees que el azul es tan raro en la naturaleza?"*

**Dato extra:** ¡Los ojos azules tampoco contienen pigmento azul! Parecen azules por la forma en que la luz se dispersa en el iris — similar a por qué el cielo se ve azul. 👁️`
    }
  },
  {
    slug: "fun-fact-orange-named-after-fruit",
    postId: "fun-fact-orange-fruit",
    tags: '["fun-fact", "colors", "language"]',
    en: {
      title: "Did You Know? The Color Orange Was Named After the Fruit!",
      summary: "Before oranges arrived in Europe, the color orange was just called 'red-yellow' — the fruit gave the color its name!",
      body: `## The Color Orange Was Named After the Fruit! 🍊

You might think the fruit was named after the color, but it's actually the other way around: **the color was named after the fruit!**

Before oranges arrived in Europe from Asia around the 15th century, English speakers didn't have a word for the color orange. They just called it "geoluhread" (yellow-red) in Old English. Once the fruit became popular, people started saying things were "orange-colored," and eventually just "orange."

### Word Art Time 🎨

Color a big, juicy orange fruit AND a sunset in the same orange shade! Ask your kids: *"If the color was called 'yellow-red,' what would you rename it?"*

**Fun fact bonus:** In many languages, there's no separate word for orange and the word for the color literally means "the color of the orange fruit"! 🌍`
    },
    es: {
      title: "¿Sabías Que? ¡El Color Naranja Tomó Su Nombre de la Fruta!",
      summary: "Antes de que las naranjas llegaran a Europa, el color naranja simplemente se llamaba 'rojo-amarillo' — ¡la fruta le dio nombre al color!",
      body: `## ¡El Color Naranja Tomó Su Nombre de la Fruta! 🍊

Quizás pienses que la fruta tomó el nombre del color, pero en realidad es al revés: **¡el color tomó el nombre de la fruta!**

Antes de que las naranjas llegaran a Europa desde Asia alrededor del siglo XV, los angloparlantes no tenían palabra para el color naranja. Lo llamaban "geoluhread" (amarillo-rojo) en inglés antiguo. Cuando la fruta se popularizó, la gente empezó a decir que las cosas eran "del color de la naranja," y finalmente solo "naranja." ¡En español pasa exactamente lo mismo!

### Arte de Palabras 🎨

¡Colorea una gran naranja jugosa Y un atardecer en el mismo tono naranja! Pregúntales a tus peques: *"Si el color se llamara 'rojo-amarillo,' ¿cómo lo renombrarías?"*

**Dato extra:** En muchos idiomas no hay una palabra separada para naranja y la palabra para el color literalmente significa "el color de la fruta naranja." 🌍`
    }
  },
  {
    slug: "fun-fact-crayola-three-billion-crayons",
    postId: "fun-fact-crayola-billions",
    tags: '["fun-fact", "colors", "art"]',
    en: {
      title: "Did You Know? Crayola Makes Nearly 3 Billion Crayons a Year!",
      summary: "Crayola produces about 3 billion crayons annually — laid end to end, they would circle the Earth 6 times!",
      body: `## Crayola Makes 3 Billion Crayons a Year! 🖍️

That's a LOT of coloring: **Crayola produces nearly 3 billion crayons every single year!**

If you lined them all up end to end, they would wrap around the Earth about **6 times**. The most popular color? Blue! Crayola has created over 400 different colors since they started in 1903, when their first box had just 8 colors. Today, the standard big box has 120 colors.

### Crayon Art Time 🎨

Color a giant pile of crayons in as many different colors as you can! Ask your kids: *"If you could invent a brand-new crayon color, what would you call it?"*

**Fun fact bonus:** Crayola's senior crayon maker, Emerson Moser, revealed when he retired after 37 years that he was colorblind the whole time! 🤯`
    },
    es: {
      title: "¿Sabías Que? ¡Crayola Fabrica Casi 3 Mil Millones de Crayones al Año!",
      summary: "Crayola produce unos 3 mil millones de crayones cada año — ¡puestos en fila, darían la vuelta a la Tierra 6 veces!",
      body: `## ¡Crayola Fabrica 3 Mil Millones de Crayones al Año! 🖍️

Eso es MUCHO colorear: **¡Crayola produce casi 3 mil millones de crayones cada año!**

Si los pusieras todos en fila, darían la vuelta a la Tierra unas **6 veces**. ¿El color más popular? ¡Azul! Crayola ha creado más de 400 colores diferentes desde que empezó en 1903, cuando su primera caja tenía solo 8 colores. Hoy, la caja grande estándar tiene 120 colores.

### Arte de Crayones 🎨

¡Colorea una pila gigante de crayones en tantos colores diferentes como puedas! Pregúntales a tus peques: *"Si pudieras inventar un color de crayón completamente nuevo, ¿cómo lo llamarías?"*

**Dato extra:** El fabricante de crayones más veterano de Crayola, Emerson Moser, reveló al jubilarse tras 37 años que ¡fue daltónico todo el tiempo! 🤯`
    }
  },
  {
    slug: "fun-fact-ancient-egyptians-colored-ink",
    postId: "fun-fact-egypt-ink",
    tags: '["fun-fact", "colors", "history"]',
    en: {
      title: "Did You Know? Ancient Egyptians Invented Colored Inks!",
      summary: "The ancient Egyptians created the first colored inks over 4,500 years ago using minerals and plants!",
      body: `## Ancient Egyptians Invented Colored Inks! 🏺

The next time you pick up a colored pen, thank the ancient Egyptians: **they invented colored inks over 4,500 years ago!**

They made black ink from soot (burned wood) and red ink from ochre (a type of clay). They also created blue, green, and yellow inks from crushed minerals and plants. These inks were so well made that we can STILL see their vibrant colors on papyrus and tomb walls today, thousands of years later!

### Ancient Art Time 🎨

Draw like an Egyptian! Use only red, blue, yellow, green, and black to create an Egyptian-style scene with pyramids and hieroglyphs. Ask your kids: *"If you could only use 5 colors forever, which ones would you pick?"*

**Fun fact bonus:** Egyptian Blue was the first ever synthetic pigment — humans made it on purpose around 3,000 BC by mixing sand, copper, and limestone in a hot oven! 🔥`
    },
    es: {
      title: "¿Sabías Que? ¡Los Antiguos Egipcios Inventaron las Tintas de Colores!",
      summary: "Los antiguos egipcios crearon las primeras tintas de colores hace más de 4,500 años usando minerales y plantas.",
      body: `## ¡Los Antiguos Egipcios Inventaron las Tintas de Colores! 🏺

La próxima vez que agarres un bolígrafo de color, agradéceles a los antiguos egipcios: **¡inventaron las tintas de colores hace más de 4,500 años!**

Hacían tinta negra con hollín (madera quemada) y tinta roja con ocre (un tipo de arcilla). También crearon tintas azules, verdes y amarillas con minerales y plantas trituradas. ¡Estas tintas estaban tan bien hechas que TODAVÍA podemos ver sus colores vibrantes en papiros y paredes de tumbas hoy, miles de años después!

### Arte Antiguo 🎨

¡Dibuja como un egipcio! Usa solo rojo, azul, amarillo, verde y negro para crear una escena al estilo egipcio con pirámides y jeroglíficos. Pregúntales a tus peques: *"Si solo pudieras usar 5 colores para siempre, ¿cuáles elegirías?"*

**Dato extra:** ¡El Azul Egipcio fue el primer pigmento sintético de la historia — los humanos lo crearon a propósito alrededor del 3,000 a.C. mezclando arena, cobre y piedra caliza en un horno caliente! 🔥`
    }
  },
  {
    slug: "fun-fact-red-first-color-baby-sees",
    postId: "fun-fact-red-baby",
    tags: '["fun-fact", "colors", "science"]',
    en: {
      title: "Did You Know? Red Is the First Color a Baby Sees!",
      summary: "Newborns can only see black, white, and gray at first — red is the first color they can distinguish!",
      body: `## Red Is the First Color Babies See! ❤️

When babies are born, their world is mostly in **black and white!**

Newborns' eyes aren't fully developed yet, so they can only see high-contrast things like light and dark. The first real color they learn to see is **red**, usually around 2-3 months old. This is because red has the longest wavelength of visible light, making it the easiest color for developing eyes to detect. That's why so many baby toys are red!

### Baby Colors Art 🎨

Draw what the world might look like to a baby: first in black and white, then with just red, then adding more and more colors! Ask your kids: *"Imagine seeing color for the very first time — which color would amaze you most?"*

**Fun fact bonus:** By 5 months old, most babies can see the full rainbow of colors — though they might not know the names yet! 🌈`
    },
    es: {
      title: "¿Sabías Que? ¡El Rojo Es el Primer Color Que Ve un Bebé!",
      summary: "Los recién nacidos solo ven blanco, negro y gris al principio — ¡el rojo es el primer color que pueden distinguir!",
      body: `## ¡El Rojo Es el Primer Color Que Ven los Bebés! ❤️

Cuando los bebés nacen, su mundo es mayormente en **¡blanco y negro!**

Los ojos de los recién nacidos no están completamente desarrollados todavía, así que solo pueden ver cosas de alto contraste como luz y oscuridad. El primer color real que aprenden a ver es el **rojo**, generalmente alrededor de los 2-3 meses de edad. Esto es porque el rojo tiene la longitud de onda más larga de la luz visible, haciendo que sea el color más fácil de detectar para ojos en desarrollo. ¡Por eso tantos juguetes de bebé son rojos!

### Arte de Colores de Bebé 🎨

Dibuja cómo podría verse el mundo para un bebé: primero en blanco y negro, luego con solo rojo, ¡y luego añadiendo más y más colores! Pregúntales a tus peques: *"Imagina ver color por primera vez — ¿qué color te asombraría más?"*

**Dato extra:** ¡A los 5 meses, la mayoría de los bebés ya pueden ver todos los colores del arcoíris — aunque quizás aún no saben sus nombres! 🌈`
    }
  },
  // ── Human Body ──────────────────────────────────
  {
    slug: "fun-fact-blink-twenty-thousand-times",
    postId: "fun-fact-blink-times",
    tags: '["fun-fact", "body", "science"]',
    en: {
      title: "Did You Know? You Blink About 20,000 Times a Day!",
      summary: "Your eyes blink around 15-20 times per minute — that adds up to about 20,000 blinks every day!",
      body: `## You Blink 20,000 Times a Day! 👀

You probably didn't notice, but you just blinked: **humans blink about 15 to 20 times per minute!**

That adds up to roughly 20,000 blinks per day, and about 10 million blinks per year! Each blink lasts about 1/3 of a second. Blinking keeps your eyes moist, clean, and protected. Here's the really cool part: your brain actually "fills in" the darkness during each blink, so you never notice it!

### Silly Science Art 🎨

Draw a pair of big eyes showing every stage of a blink — open, half-closed, closed, half-open, open! Ask your kids: *"Can you try NOT blinking for 30 seconds? How does it feel?"*

**Fun fact bonus:** Babies blink much less than adults — only about 3-15 times per minute. Scientists aren't totally sure why! 👶`
    },
    es: {
      title: "¿Sabías Que? ¡Parpadeas Unas 20,000 Veces al Día!",
      summary: "Tus ojos parpadean unas 15-20 veces por minuto — ¡eso suma unas 20,000 veces cada día!",
      body: `## ¡Parpadeas 20,000 Veces al Día! 👀

Probablemente no lo notaste, pero acabas de parpadear: **¡los humanos parpadeamos unas 15 a 20 veces por minuto!**

Eso suma aproximadamente 20,000 parpadeos al día, ¡y unos 10 millones de parpadeos al año! Cada parpadeo dura alrededor de 1/3 de segundo. Parpadear mantiene tus ojos húmedos, limpios y protegidos. La parte más genial: ¡tu cerebro "rellena" la oscuridad durante cada parpadeo, así que nunca lo notas!

### Arte Científico Divertido 🎨

Dibuja un par de ojos grandes mostrando cada etapa de un parpadeo — ¡abiertos, medio cerrados, cerrados, medio abiertos, abiertos! Pregúntales a tus peques: *"¿Puedes intentar NO parpadear durante 30 segundos? ¿Cómo se siente?"*

**Dato extra:** Los bebés parpadean mucho menos que los adultos — solo unas 3-15 veces por minuto. ¡Los científicos no saben exactamente por qué! 👶`
    }
  },
  {
    slug: "fun-fact-nose-remembers-fifty-thousand-smells",
    postId: "fun-fact-nose-smells",
    tags: '["fun-fact", "body", "science"]',
    en: {
      title: "Did You Know? Your Nose Can Remember 50,000 Different Smells!",
      summary: "The human nose can detect and remember about 50,000 different scents — some scientists say even more!",
      body: `## Your Nose Remembers 50,000 Smells! 👃

Your nose is way more powerful than you think: **it can detect and remember about 50,000 different smells!**

Some researchers even estimate the number could be as high as 1 trillion different odors. Smell is also the sense most strongly connected to memory — that's why a certain smell can instantly take you back to a specific moment from your childhood. It's called "olfactory memory."

### Smell & Color Art 🎨

Draw 5 of your favorite smells as pictures — maybe cookies, flowers, rain, or sunscreen! Ask your kids: *"What's a smell that always makes you happy?"*

**Fun fact bonus:** Your sense of smell is weakest in the morning and gets better as the day goes on. That's why perfume ads say to smell perfume in the afternoon! 🌸`
    },
    es: {
      title: "¿Sabías Que? ¡Tu Nariz Puede Recordar 50,000 Olores Diferentes!",
      summary: "La nariz humana puede detectar y recordar unos 50,000 aromas diferentes — ¡algunos científicos dicen que incluso más!",
      body: `## ¡Tu Nariz Recuerda 50,000 Olores! 👃

Tu nariz es mucho más poderosa de lo que piensas: **¡puede detectar y recordar unos 50,000 olores diferentes!**

Algunos investigadores incluso estiman que el número podría llegar hasta 1 billón de olores diferentes. El olfato es también el sentido más fuertemente conectado a la memoria — por eso un cierto olor puede llevarte instantáneamente a un momento específico de tu infancia. Se llama "memoria olfativa."

### Arte de Olores y Colores 🎨

¡Dibuja 5 de tus olores favoritos como imágenes — quizás galletas, flores, lluvia o protector solar! Pregúntales a tus peques: *"¿Cuál es un olor que siempre te hace feliz?"*

**Dato extra:** Tu sentido del olfato es más débil por la mañana y mejora a lo largo del día. ¡Por eso los anuncios de perfumes dicen que los huelas por la tarde! 🌸`
    }
  },
  {
    slug: "fun-fact-babies-born-300-bones",
    postId: "fun-fact-babies-bones",
    tags: '["fun-fact", "body", "science"]',
    en: {
      title: "Did You Know? Babies Have About 300 Bones — Adults Only Have 206!",
      summary: "Babies are born with nearly 100 more bones than adults — many of them fuse together as they grow!",
      body: `## Babies Have 300 Bones! 🦴

Here's a surprising fact about your own body: **babies are born with about 300 bones, but adults only have 206!**

Where do the extra bones go? They don't disappear — they **fuse together** as you grow! Many bones in a baby's skull, spine, and other areas are made of soft, flexible cartilage that gradually hardens into bone and merges together. This process is mostly complete by age 25!

### Body Science Art 🎨

Draw a baby skeleton and an adult skeleton side by side — the baby one should have more pieces! Ask your kids: *"Did you know your bones are still fusing right now? How does that feel?"*

**Fun fact bonus:** The smallest bone in your body is the stapes in your ear — it's about the size of a grain of rice! 🍚`
    },
    es: {
      title: "¿Sabías Que? ¡Los Bebés Tienen Unos 300 Huesos — Los Adultos Solo 206!",
      summary: "Los bebés nacen con casi 100 huesos más que los adultos — ¡muchos de ellos se fusionan mientras crecen!",
      body: `## ¡Los Bebés Tienen 300 Huesos! 🦴

Aquí tienes un dato sorprendente sobre tu propio cuerpo: **¡los bebés nacen con unos 300 huesos, pero los adultos solo tienen 206!**

¿A dónde van los huesos extra? No desaparecen — ¡**se fusionan**! Muchos huesos en el cráneo, la columna y otras áreas del bebé están hechos de cartílago blando y flexible que gradualmente se endurece en hueso y se une. ¡Este proceso se completa mayormente a los 25 años!

### Arte de Ciencia del Cuerpo 🎨

Dibuja un esqueleto de bebé y uno de adulto uno al lado del otro — ¡el del bebé debería tener más piezas! Pregúntales a tus peques: *"¿Sabías que tus huesos se siguen fusionando ahora mismo? ¿Cómo se siente eso?"*

**Dato extra:** ¡El hueso más pequeño de tu cuerpo es el estribo en tu oído — es del tamaño de un grano de arroz! 🍚`
    }
  },
  {
    slug: "fun-fact-brain-more-active-sleeping",
    postId: "fun-fact-brain-sleep",
    tags: '["fun-fact", "body", "science"]',
    en: {
      title: "Did You Know? Your Brain Is More Active When You Sleep Than When You Watch TV!",
      summary: "During sleep, your brain is busy processing memories, cleaning itself, and solving problems!",
      body: `## Your Brain Is More Active During Sleep! 🧠

This sounds backwards, but it's true: **your brain is actually MORE active while you're sleeping than while you're watching TV!**

During sleep, your brain is incredibly busy — it processes and stores memories from the day, repairs and cleans brain cells, solves problems, and even practices skills you learned. During REM sleep (when you dream), your brain is almost as active as when you're awake! Meanwhile, watching TV puts your brain in a relatively passive state.

### Brain Art Time 🎨

Draw a sleeping person with a colorful, busy brain full of dreams, ideas, and memories! Ask your kids: *"What do you think your brain is doing right now while we talk?"*

**Fun fact bonus:** Your brain uses about 20% of your body's total energy — even though it's only about 2% of your body weight. It's the most energy-hungry organ! ⚡`
    },
    es: {
      title: "¿Sabías Que? ¡Tu Cerebro Está Más Activo Cuando Duermes Que Cuando Ves la Tele!",
      summary: "Durante el sueño, tu cerebro está ocupado procesando recuerdos, limpiándose y resolviendo problemas.",
      body: `## ¡Tu Cerebro Está Más Activo Mientras Duermes! 🧠

Suena al revés, pero es verdad: **¡tu cerebro está en realidad MÁS activo mientras duermes que mientras ves la televisión!**

Durante el sueño, tu cerebro está increíblemente ocupado — procesa y almacena recuerdos del día, repara y limpia las células cerebrales, resuelve problemas e incluso practica habilidades que aprendiste. ¡Durante el sueño REM (cuando sueñas), tu cerebro está casi tan activo como cuando estás despierto! Mientras tanto, ver la televisión pone tu cerebro en un estado relativamente pasivo.

### Arte del Cerebro 🎨

¡Dibuja una persona durmiendo con un cerebro colorido y ocupado lleno de sueños, ideas y recuerdos! Pregúntales a tus peques: *"¿Qué crees que está haciendo tu cerebro ahora mismo mientras hablamos?"*

**Dato extra:** Tu cerebro usa alrededor del 20% de la energía total de tu cuerpo — aunque solo es aproximadamente el 2% de tu peso corporal. ¡Es el órgano que más energía consume! ⚡`
    }
  },
  // ── Fantasy & Mythology ──────────────────────────
  {
    slug: "fun-fact-medieval-unicorns-real",
    postId: "fun-fact-unicorns-real",
    tags: '["fun-fact", "fantasy", "history"]',
    en: {
      title: "Did You Know? In Medieval Times, People Believed Unicorns Were Real!",
      summary: "For centuries, people genuinely believed unicorns existed — they even sold 'unicorn horns' (actually narwhal tusks)!",
      body: `## People Believed Unicorns Were Real! 🦄

This is magical: **for hundreds of years, people in medieval Europe genuinely believed unicorns were real animals!**

Travelers and merchants would sell "unicorn horns" that were said to cure poison and disease. These horns were actually **narwhal tusks** — long spiral tusks from Arctic whales. They were so valuable that some were worth more than gold! Queen Elizabeth I had one that was valued at the price of a castle.

### Magical Art Time 🎨

Design your own unicorn! What color would it be? What special powers would its horn have? Ask your kids: *"If unicorns WERE real, where do you think they would live?"*

**Fun fact bonus:** The national animal of Scotland is the unicorn! They chose it centuries ago because unicorns symbolized purity, strength, and independence. 🏴󠁧󠁢󠁳󠁣󠁴󠁿`
    },
    es: {
      title: "¿Sabías Que? ¡En la Edad Media la Gente Creía Que los Unicornios Eran Reales!",
      summary: "Durante siglos, la gente creía genuinamente que los unicornios existían — ¡incluso vendían 'cuernos de unicornio' (en realidad colmillos de narval)!",
      body: `## ¡La Gente Creía Que los Unicornios Eran Reales! 🦄

Esto es mágico: **¡durante cientos de años, la gente en la Europa medieval creía genuinamente que los unicornios eran animales reales!**

Viajeros y comerciantes vendían "cuernos de unicornio" que supuestamente curaban venenos y enfermedades. Estos cuernos en realidad eran **colmillos de narval** — largos colmillos en espiral de ballenas del Ártico. ¡Eran tan valiosos que algunos valían más que el oro! La Reina Isabel I tenía uno valorado al precio de un castillo.

### Arte Mágico 🎨

¡Diseña tu propio unicornio! ¿De qué color sería? ¿Qué poderes especiales tendría su cuerno? Pregúntales a tus peques: *"Si los unicornios FUERAN reales, ¿dónde crees que vivirían?"*

**Dato extra:** ¡El animal nacional de Escocia es el unicornio! Lo eligieron hace siglos porque los unicornios simbolizaban pureza, fuerza e independencia. 🏴󠁧󠁢󠁳󠁣󠁴󠁿`
    }
  },
  {
    slug: "fun-fact-dragons-every-continent",
    postId: "fun-fact-dragons-global",
    tags: '["fun-fact", "fantasy", "history"]',
    en: {
      title: "Did You Know? Dragons Appear in Myths From Every Continent!",
      summary: "From China to Mexico to Europe — every major civilization independently created stories about dragons!",
      body: `## Dragons Appear in Myths Everywhere! 🐉

This is one of history's biggest mysteries: **almost every civilization on Earth independently invented dragon legends!**

Chinese dragons (long, serpent-like, wise) are completely different from European dragons (winged, fire-breathing, hoarding treasure), yet both appeared thousands of years ago. Aztec mythology has Quetzalcoatl (a feathered serpent), Aboriginal Australians have the Rainbow Serpent, and African legends tell of Ninki Nanka. Some scientists think these myths started because ancient people found dinosaur fossils!

### World Dragons Art 🎨

Draw dragons from around the world — a Chinese dragon, a European castle dragon, and a feathered Aztec serpent! Ask your kids: *"If you could design a NEW kind of dragon, what would it look like?"*

**Fun fact bonus:** Komodo dragons are real! They're the world's largest living lizards, growing up to 10 feet long, and they live on Indonesian islands. 🦎`
    },
    es: {
      title: "¿Sabías Que? ¡Los Dragones Aparecen en Mitos de Todos los Continentes!",
      summary: "Desde China hasta México y Europa — ¡cada gran civilización creó independientemente historias sobre dragones!",
      body: `## ¡Los Dragones Aparecen en Mitos de Todo el Mundo! 🐉

Este es uno de los mayores misterios de la historia: **¡casi todas las civilizaciones de la Tierra inventaron leyendas de dragones de forma independiente!**

Los dragones chinos (largos, serpentinos, sabios) son completamente diferentes de los dragones europeos (alados, que escupen fuego, acumulan tesoros), pero ambos aparecieron hace miles de años. La mitología azteca tiene a Quetzalcóatl (una serpiente emplumada), los aborígenes australianos tienen la Serpiente Arcoíris, y las leyendas africanas cuentan sobre Ninki Nanka. ¡Algunos científicos creen que estos mitos empezaron porque los antiguos encontraron fósiles de dinosaurios!

### Arte de Dragones del Mundo 🎨

¡Dibuja dragones de todo el mundo — un dragón chino, un dragón europeo de castillo y una serpiente emplumada azteca! Pregúntales a tus peques: *"Si pudieras diseñar un NUEVO tipo de dragón, ¿cómo sería?"*

**Dato extra:** ¡Los dragones de Komodo son reales! Son los lagartos vivos más grandes del mundo, crecen hasta 3 metros de largo y viven en islas de Indonesia. 🦎`
    }
  },
  {
    slug: "fun-fact-dinosaur-means-terrible-lizard",
    postId: "fun-fact-dinosaur-name",
    tags: '["fun-fact", "dinosaurs", "language"]',
    en: {
      title: "Did You Know? 'Dinosaur' Means 'Terrible Lizard' in Greek!",
      summary: "The word 'dinosaur' was invented in 1842 by combining the Greek words for 'terrible' and 'lizard'!",
      body: `## "Dinosaur" Means "Terrible Lizard"! 🦕

The word **"dinosaur"** was invented in 1842 by British scientist Sir Richard Owen. He combined two Greek words: **"deinos"** (terrible/fearfully great) and **"sauros"** (lizard).

But here's the funny thing: dinosaurs weren't actually lizards! They were a completely different group of reptiles. And many of them weren't "terrible" at all — some were gentle plant-eaters the size of chickens! Owen chose the name because the fossils he'd seen were enormous and awe-inspiring.

### Dino Art Time 🎨

Draw your favorite dinosaur with a name tag that shows what its name means! Ask your kids: *"If you discovered a NEW dinosaur, what would you name it?"*

**Fun fact bonus:** The closest living relatives of dinosaurs aren't lizards — they're birds! 🐔 That means every time you see a chicken, you're looking at a tiny dinosaur descendant!`
    },
    es: {
      title: "¿Sabías Que? ¡'Dinosaurio' Significa 'Lagarto Terrible' en Griego!",
      summary: "La palabra 'dinosaurio' fue inventada en 1842 combinando las palabras griegas para 'terrible' y 'lagarto'.",
      body: `## ¡"Dinosaurio" Significa "Lagarto Terrible"! 🦕

La palabra **"dinosaurio"** fue inventada en 1842 por el científico británico Sir Richard Owen. Combinó dos palabras griegas: **"deinos"** (terrible/temeroso) y **"sauros"** (lagarto).

Pero aquí está lo gracioso: ¡los dinosaurios en realidad no eran lagartos! Eran un grupo completamente diferente de reptiles. Y muchos de ellos no eran nada "terribles" — ¡algunos eran tranquilos herbívoros del tamaño de gallinas! Owen eligió el nombre porque los fósiles que había visto eran enormes e impresionantes.

### Arte de Dinosaurios 🎨

¡Dibuja tu dinosaurio favorito con una etiqueta de nombre que muestre lo que significa! Pregúntales a tus peques: *"Si descubrieras un NUEVO dinosaurio, ¿cómo lo llamarías?"*

**Dato extra:** Los parientes vivos más cercanos de los dinosaurios no son los lagartos — ¡son las aves! 🐔 Eso significa que cada vez que ves una gallina, ¡estás viendo un pequeño descendiente de dinosaurio!`
    }
  }
];

// Generate files
let dateOffset = 0;
let created = 0;

for (const fact of funFacts) {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() - dateOffset);
  const dateStr = d.toISOString().split("T")[0];
  dateOffset++;

  // EN file
  const enContent = `---
postId: "${fact.postId}"
title: "${fact.en.title.replace(/"/g, '\\"')}"
date: "${dateStr}"
summary: "${fact.en.summary.replace(/"/g, '\\"')}"
lang: "en"
category: "fun-fact"
image: ""
tags: ${fact.tags}
---

${fact.en.body}
`;

  // ES file
  const esContent = `---
postId: "${fact.postId}"
title: "${fact.es.title.replace(/"/g, '\\"')}"
date: "${dateStr}"
summary: "${fact.es.summary.replace(/"/g, '\\"')}"
lang: "es"
category: "fun-fact"
image: ""
tags: ${fact.tags}
---

${fact.es.body}
`;

  writeFileSync(join(EN_DIR, `${fact.slug}.md`), enContent);
  writeFileSync(join(ES_DIR, `${fact.slug}.md`), esContent);
  created++;
  console.log(`✓ ${created}. ${fact.slug} (${dateStr})`);
}

console.log(`\n✅ Created ${created} fun facts × 2 languages = ${created * 2} files total`);
