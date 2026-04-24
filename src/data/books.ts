import type { LocalizedText } from "./site";

export type AgeCategory = "4-8" | "8-12" | "12-18+";

export type Book = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  features?: { en: string[]; es: string[] };
  perfectFor?: LocalizedText;
  amazonUrl: string;
  coverAlt: LocalizedText;
  coverSrc: string;
  ageRange: LocalizedText;
  ageCategories: AgeCategory[];
  pages: number;
  ratingValue?: number;
  ratingCount?: number;
};

export const books: Book[] = [
  {
    id: "magical-creatures",
    title: {
      es: "Criaturas Magicas",
      en: "Magical Creatures"
    },
    subtitle: {
      es: "Unicornios, sirenas y dragones para colorear",
      en: "Unicorns, mermaids, dragons, and mythical scenes"
    },
    description: {
      es: "Libro de colorear con escenas fantasticas para peques: unicornios, sirenas y dragones en disenos de una cara para colorear sin complicaciones.",
      en: "A fantasy coloring book for kids featuring unicorns, mermaids, and dragons in single-sided pages made for easy coloring sessions."
    },
    features: {
      en: ["90 single-sided coloring pages — no bleed-through", "Unicorns, mermaids, dragons, and fairy-tale scenes", "Large, clear outlines easy for young artists to color", "Great for ages 4–8 and all fantasy lovers"],
      es: ["90 páginas para colorear a una sola cara — sin manchas", "Unicornios, sirenas, dragones y escenas de cuento de hadas", "Líneas grandes y claras, perfectas para artistas jóvenes", "Ideal para niños de 4 a 8 años y amantes de la fantasía"]
    },
    perfectFor: {
      en: "Kids ages 4–8 who love unicorns, mermaids, and magical worlds. Works great as a birthday gift, rainy-day activity, or quiet-time entertainment at home or on trips.",
      es: "Niños de 4 a 8 años que aman los unicornios, sirenas y mundos mágicos. Perfecto como regalo de cumpleaños, actividad para días de lluvia o entretenimiento tranquilo en casa o de viaje."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GVNT9R5C",
    coverAlt: {
      es: "Portada del libro Criaturas Magicas",
      en: "Magical Creatures book cover"
    },
    coverSrc: "/images/books/magical-creatures.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "chic-styles",
    title: {
      es: "Chic Styles",
      en: "Chic Styles"
    },
    subtitle: {
      es: "Libro de moda para colorear con estilo",
      en: "A fashion coloring book for style lovers"
    },
    description: {
      es: "Coleccion de disenos fashion para adolescentes y adultos. Mezcla looks modernos y vintage para relajarte mientras coloreas.",
      en: "A fashion-focused coloring book for teens and adults with modern and vintage-inspired looks for creative relaxation."
    },
    features: {
      en: ["90 single-sided fashion coloring pages", "Modern and vintage-inspired outfit designs", "Ideal for relaxing creative sessions", "Suitable for teens and adults who love fashion and design"],
      es: ["90 páginas de moda para colorear a una sola cara", "Diseños de ropa modernos y de inspiración vintage", "Ideal para sesiones creativas relajantes", "Para teens y adultos que aman la moda y el diseño"]
    },
    perfectFor: {
      en: "Teens and adults who love fashion, styling, and creative relaxation. Makes a thoughtful gift for aspiring designers or anyone who enjoys art and coloring as a way to unwind.",
      es: "Teens y adultos que aman la moda, el estilismo y la relajación creativa. Un regalo ideal para futuros diseñadores o cualquier persona que disfrute del arte y colorear para desconectarse."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GW855JTY",
    coverAlt: {
      es: "Portada del libro Chic Styles",
      en: "Chic Styles book cover"
    },
    coverSrc: "/images/books/chic-styles.webp",
    ageRange: {
      es: "Teenagers y adultos",
      en: "Teens and adults"
    },
    ageCategories: ["12-18+"],
    pages: 90
  },
  {
    id: "dresses-and-dolls",
    title: {
      es: "Dresses and Dolls",
      en: "Dresses and Dolls"
    },
    subtitle: {
      es: "Disenos adorables de vestidos y munecas",
      en: "Adorable dresses and dolls fashion designs"
    },
    description: {
      es: "Libro creativo para peques con vestidos y munecas para colorear, dibujar accesorios y explorar combinaciones de moda.",
      en: "A creative coloring book with dolls and dresses for kids to color, accessorize, and explore their own fashion combinations."
    },
    features: {
      en: ["90 single-sided pages with dolls and dress designs", "Mix-and-match accessories and outfit ideas", "Encourages creativity and imaginative play", "Perfect for kids ages 4–8 who love fashion and dolls"],
      es: ["90 páginas a una sola cara con muñecas y diseños de vestidos", "Accesorios y outfits para combinar con imaginación", "Fomenta la creatividad y el juego imaginativo", "Perfecto para niños de 4 a 8 años que aman la moda y las muñecas"]
    },
    perfectFor: {
      en: "Little fashion lovers ages 4–8 who enjoy dressing up dolls and creating outfits. A wonderful gift for any occasion that combines creative coloring with imaginative play.",
      es: "Pequeños amantes de la moda de 4 a 8 años que disfrutan de vestir muñecas y crear outfits. Un regalo maravilloso para cualquier ocasión que combina colorear con el juego imaginativo."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GW89F6Z9",
    coverAlt: {
      es: "Portada del libro Dresses and Dolls",
      en: "Dresses and Dolls book cover"
    },
    coverSrc: "/images/books/dresses-and-dolls.webp",
    ageRange: {
      es: "4-8 anos y fans de moda",
      en: "Ages 4-8 and fashion lovers"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "style-time-machine",
    title: {
      es: "Style Time Machine",
      en: "Style Time Machine"
    },
    subtitle: {
      es: "Aventura fashion para peques, teens y adultos",
      en: "A fashion coloring adventure for kids, teens, and adults"
    },
    description: {
      es: "Una mezcla creativa de estilos modernos y clasicos para colorear con looks, accesorios y poses llenas de personalidad.",
      en: "A creative mix of modern and classic styles to color with outfits, accessories, and character-filled poses."
    },
    features: {
      en: ["90 pages spanning kids, teen, and adult fashion styles", "Modern and classic looks from multiple decades", "Single-sided pages for clean, marker-friendly coloring", "A coloring book the whole family can enjoy together"],
      es: ["90 páginas con estilos de moda para niños, teens y adultos", "Looks modernos y clásicos de múltiples décadas", "Páginas a una sola cara para colorear con marcadores sin manchas", "Un libro que toda la familia puede disfrutar juntos"]
    },
    perfectFor: {
      en: "The whole family — kids, teens, and adults can all find a look they love. A versatile gift that brings everyone to the coloring table, from beginners to experienced artists.",
      es: "Toda la familia — niños, teens y adultos pueden encontrar un look que les encante. Un regalo versátil que reúne a todos en la mesa de colorear, desde principiantes hasta artistas con experiencia."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GVB4G1KC",
    coverAlt: {
      es: "Portada del libro Style Time Machine",
      en: "Style Time Machine book cover"
    },
    coverSrc: "/images/books/style-time-machine.webp",
    ageRange: {
      es: "Ninos, teens y adultos",
      en: "Kids, teens, and adults"
    },
    ageCategories: ["4-8", "8-12", "12-18+"],
    pages: 90
  },
  {
    id: "cozy-kids-club",
    title: {
      es: "The Cozy Kids' Club",
      en: "The Cozy Kids' Club"
    },
    subtitle: {
      es: "Libro super cute para peques de 4 a 8 anos",
      en: "A super cute coloring book for kids ages 4-8"
    },
    description: {
      es: "Paginas tiernas y faciles de colorear para momentos tranquilos y divertidos, perfectas para tardes en casa o actividades escolares.",
      en: "Cute and easy coloring pages made for calm and fun moments, perfect for afternoons at home or school activities."
    },
    features: {
      en: ["90 cute and easy single-sided coloring pages", "Calm, simple designs perfect for beginners", "Great for quiet time at home or in the classroom", "Gentle, friendly themes for kids ages 4–8"],
      es: ["90 páginas adorables y fáciles de colorear a una sola cara", "Diseños tranquilos y simples, perfectos para principiantes", "Ideal para momentos tranquilos en casa o en el aula", "Temas suaves y amigables para niños de 4 a 8 años"]
    },
    perfectFor: {
      en: "Young kids just starting to color, or for calm screen-free activities at home and school. Also a lovely gift for little ones who enjoy cute characters and cozy scenes.",
      es: "Niños pequeños que están empezando a colorear, o para actividades tranquilas sin pantallas en casa y en la escuela. También un regalo adorable para los más pequeños que aman personajes tiernos."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GV82H83R",
    coverAlt: {
      es: "Portada del libro The Cozy Kids' Club",
      en: "The Cozy Kids' Club book cover"
    },
    coverSrc: "/images/books/cozy-kids-club.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "awesome-boys",
    title: {
      es: "Awesome Boys Coloring Book",
      en: "Awesome Boys Coloring Book"
    },
    subtitle: {
      es: "Arte grande y divertido para ninos creativos",
      en: "Big and fun art for creative boys"
    },
    description: {
      es: "Libro dinamico con ilustraciones pensadas para ninos de 4 a 8 anos que aman colorear escenas llamativas y personajes divertidos.",
      en: "A dynamic coloring book with bold illustrations for boys ages 4-8 who love playful scenes and energetic characters."
    },
    features: {
      en: ["90 bold, energetic single-sided coloring pages", "Action scenes and fun characters designed for boys", "Large, clear illustrations that are easy and satisfying to color", "Perfect for boys ages 4–8 full of energy and imagination"],
      es: ["90 páginas dinámicas y llenas de energía para colorear a una sola cara", "Escenas de acción y personajes divertidos diseñados para niños", "Ilustraciones grandes y claras, fáciles y satisfactorias de colorear", "Perfecto para niños de 4 a 8 años llenos de energía e imaginación"]
    },
    perfectFor: {
      en: "Energetic boys ages 4–8 who love bold art, fun characters, and action-packed scenes. Makes an excellent birthday, holiday, or just-because gift that actually gets used.",
      es: "Niños enérgicos de 4 a 8 años que aman el arte llamativo, los personajes divertidos y las escenas de acción. Un excelente regalo de cumpleaños, festividades o simplemente porque sí, que realmente se usa."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GTD6QRZC",
    coverAlt: {
      es: "Portada del libro Awesome Boys Coloring Book",
      en: "Awesome Boys Coloring Book cover"
    },
    coverSrc: "/images/books/awesome-boys.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "enchanted-easter",
    title: {
      es: "Enchanted Easter",
      en: "Enchanted Easter"
    },
    subtitle: {
      es: "Coloring book adorable para Pascua",
      en: "A super cute Easter coloring book"
    },
    description: {
      es: "Escenas de Pascua con conejitos, huevos decorados y sorpresas primaverales para colorear y celebrar en familia.",
      en: "Easter scenes with bunnies, decorated eggs, and spring surprises to color and enjoy together as a family."
    },
    features: {
      en: ["90 Easter-themed single-sided coloring pages", "Bunnies, decorated eggs, flowers, and spring surprises", "A perfect seasonal family activity for Easter week", "Wonderful Easter basket gift for kids ages 4–8"],
      es: ["90 páginas de Pascua para colorear a una sola cara", "Conejitos, huevos decorados, flores y sorpresas primaverales", "Una actividad familiar perfecta para la semana de Pascua", "Un regalo ideal para la cesta de Pascua de niños de 4 a 8 años"]
    },
    perfectFor: {
      en: "Kids ages 4–8 who love bunnies, spring, and Easter celebrations. Fun for Easter parties, family gatherings, and as a basket stuffer that kids will actually want to use.",
      es: "Niños de 4 a 8 años que aman los conejitos, la primavera y las celebraciones de Pascua. Divertido para fiestas de Pascua, reuniones familiares y como relleno de cesta que los niños realmente querrán usar."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GTP77SXJ",
    coverAlt: {
      es: "Portada del libro Enchanted Easter",
      en: "Enchanted Easter book cover"
    },
    coverSrc: "/images/books/enchanted-easter.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90,
    ratingValue: 5,
    ratingCount: 1


  },
  {
    id: "coloring-emotions",
    title: {
      es: "Coloring Emotions",
      en: "Coloring Emotions"
    },
    subtitle: {
      es: "Aprender y expresar emociones coloreando",
      en: "Learn and express feelings through coloring"
    },
    description: {
      es: "Actividades de colorear para ayudar a peques a identificar emociones y expresarse de forma creativa y positiva.",
      en: "Coloring activities that help kids identify emotions and express themselves in a creative and positive way."
    },
    features: {
      en: ["90 single-sided pages focused on emotions and feelings", "Helps kids identify, name, and process their emotions", "Combines creative coloring with social-emotional learning", "A trusted choice for parents, teachers, and therapists"],
      es: ["90 páginas a una sola cara centradas en emociones y sentimientos", "Ayuda a los niños a identificar, nombrar y procesar sus emociones", "Combina colorear creativamente con el aprendizaje socioemocional", "Una opción de confianza para padres, maestros y terapeutas"]
    },
    perfectFor: {
      en: "Parents, teachers, and therapists working with kids ages 4–8 on emotional awareness and expression. A thoughtful, unique gift that is both entertaining and genuinely educational.",
      es: "Padres, maestros y terapeutas que trabajan con niños de 4 a 8 años en conciencia y expresión emocional. Un regalo reflexivo y único que es a la vez entretenido y genuinamente educativo."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GV1FGJY5",
    coverAlt: {
      es: "Portada del libro Coloring Emotions",
      en: "Coloring Emotions book cover"
    },
    coverSrc: "/images/books/coloring-emotions.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "pizza-sweet-treats",
    title: {
      es: "Pizza & Sweet Treats",
      en: "Pizza & Sweet Treats"
    },
    subtitle: {
      es: "Libro super cute de comida divertida",
      en: "A super cute food-themed coloring book"
    },
    description: {
      es: "Pizzas sonrientes, postres irresistibles y escenas deliciosas para colorear con mucha imaginacion.",
      en: "Smiling pizzas, sweet desserts, and tasty scenes to color with lots of imagination."
    },
    features: {
      en: ["90 single-sided food-themed coloring pages", "Smiling pizzas, cupcakes, ice cream, donuts, and more", "Imaginative, playful illustrations for young artists", "A fun conversation starter about food and creativity"],
      es: ["90 páginas temáticas de comida para colorear a una sola cara", "Pizzas sonrientes, cupcakes, helados, donuts y mucho más", "Ilustraciones imaginativas y divertidas para artistas jóvenes", "Un divertido punto de partida para hablar de comida y creatividad"]
    },
    perfectFor: {
      en: "Food-loving kids ages 4–8 who love playful, imaginative illustrations. Great as a party favor, lunchbox surprise, or anytime gift that sparks creativity and makes kids giggle.",
      es: "Niños de 4 a 8 años que aman la comida y las ilustraciones imaginativas y divertidas. Ideal como recuerdo de fiesta, sorpresa en la lonchera o regalo improvisado que despierta la creatividad."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GTZDDVQP",
    coverAlt: {
      es: "Portada del libro Pizza & Sweet Treats",
      en: "Pizza & Sweet Treats book cover"
    },
    coverSrc: "/images/books/pizza-sweet-treats.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "awesome-girls",
    title: {
      es: "Awesome Girls",
      en: "Awesome Girls"
    },
    subtitle: {
      es: "Arte cute e inspirador para ninas creativas",
      en: "Cute and inspiring art for creative girls"
    },
    description: {
      es: "Coleccion de ilustraciones adorables para ninas de 4 a 8 anos con temas magicos, animales y escenas que inspiran confianza.",
      en: "A collection of adorable illustrations for girls ages 4-8 featuring magical themes, animals, and confidence-building scenes."
    },
    features: {
      en: ["90 single-sided coloring pages for girls", "Magical themes, cute animals, and confidence-building scenes", "Empowering illustrations designed for girls ages 4–8", "A feel-good coloring book loved by kids and parents alike"],
      es: ["90 páginas para colorear a una sola cara para niñas", "Temas mágicos, animales adorables y escenas que inspiran confianza", "Ilustraciones inspiradoras diseñadas para niñas de 4 a 8 años", "Un libro adorado por niños y padres que transmite alegría y confianza"]
    },
    perfectFor: {
      en: "Creative, curious girls ages 4–8. A wonderful birthday or holiday gift that celebrates imagination, confidence, and joy through art — packed with scenes girls will want to color again and again.",
      es: "Niñas creativas y curiosas de 4 a 8 años. Un regalo de cumpleaños o festividades maravilloso que celebra la imaginación, la confianza y la alegría a través del arte, lleno de escenas que las niñas querrán colorear una y otra vez."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GVBG563R",
    coverAlt: {
      es: "Portada del libro Awesome Girls",
      en: "Awesome Girls book cover"
    },
    coverSrc: "/images/books/awesome-girls.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90,
    ratingValue: 5,
    ratingCount: 1


  },
  {
    id: "blast-off-space",
    title: {
      es: "Blast Off! A Fun Space Coloring",
      en: "Blast Off! A Fun Space Coloring"
    },
    subtitle: {
      es: "Aventura espacial con planetas y astronautas",
      en: "A space adventure with planets and astronauts"
    },
    description: {
      es: "Un viaje por el espacio con cohetes, planetas, aliens amistosos y escenas astronomicas para peques curiosos.",
      en: "A journey through space with rockets, planets, friendly aliens, and astronomy-themed scenes for curious kids."
    },
    features: {
      en: ["90 single-sided space-themed coloring pages", "Rockets, planets, friendly aliens, and astronauts", "Sparks curiosity and early interest in science and astronomy", "Great for kids ages 4–8 who dream of outer space"],
      es: ["90 páginas temáticas del espacio para colorear a una sola cara", "Cohetes, planetas, aliens amistosos y astronautas", "Despierta la curiosidad y el interés temprano por la ciencia y la astronomía", "Genial para niños de 4 a 8 años que sueñan con el espacio exterior"]
    },
    perfectFor: {
      en: "Little space explorers ages 4–8 who are fascinated by rockets, planets, and the universe. A gift that fuels both creativity and curiosity — perfect for future scientists and astronauts.",
      es: "Pequeños exploradores espaciales de 4 a 8 años fascinados por los cohetes, planetas y el universo. Un regalo que alimenta tanto la creatividad como la curiosidad — perfecto para futuros científicos y astronautas."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GTZ8L58J",
    coverAlt: {
      es: "Portada del libro Blast Off! A Fun Space Coloring",
      en: "Blast Off! A Fun Space Coloring book cover"
    },
    coverSrc: "/images/books/blast-off-space.webp",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  },
  {
    id: "mighty-machines",
    title: {
      es: "Mighty Machines",
      en: "Mighty Machines"
    },
    subtitle: {
      es: "Excavadoras, camiones y gruas para colorear",
      en: "Excavators, trucks, cranes, and more to color"
    },
    description: {
      es: "Libro de colorear de maquinaria pesada para ninos que aman vehiculos de construccion y accion en obra.",
      en: "A heavy-machinery coloring book for kids who love construction vehicles and action-packed worksite scenes."
    },
    features: {
      en: ["100 single-sided pages of heavy construction machines", "Excavators, cranes, dump trucks, bulldozers, and more", "Bold, clear illustrations perfect for young builders", "Ideal for kids ages 3–8 obsessed with big machines"],
      es: ["100 páginas a una sola cara de maquinaria de construcción pesada", "Excavadoras, grúas, volquetes, bulldozers y mucho más", "Ilustraciones grandes y claras, perfectas para pequeños constructores", "Ideal para niños de 3 a 8 años obsesionados con las máquinas grandes"]
    },
    perfectFor: {
      en: "Kids ages 3–8 who can't get enough of trucks, diggers, and cranes. A hit at birthday parties and an excellent rainy-day activity for little builders who love action and big machines.",
      es: "Niños de 3 a 8 años que no se cansan de camiones, excavadoras y grúas. Un éxito en fiestas de cumpleaños y una excelente actividad para días de lluvia para pequeños constructores que aman la acción."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GTYXZZ21",
    coverAlt: {
      es: "Portada del libro Mighty Machines",
      en: "Mighty Machines book cover"
    },
    coverSrc: "/images/books/mighty-machines.webp",
    ageRange: {
      es: "3-8 anos",
      en: "Ages 3-8"
    },
    ageCategories: ["4-8"],
    pages: 100
  },
  {
    id: "easy-animals",
    title: {
      es: "Easy Animals Coloring Book",
      en: "Easy Animals Coloring Book"
    },
    subtitle: {
      es: "50 ilustraciones simples y adorables para pequenos artistas",
      en: "50 simple and adorable illustrations for little artists"
    },
    description: {
      es: "Libro de colorear con más de 50 ilustraciones adorables de animales con líneas simples y claras, perfecto para principiantes y pequeños artistas de 4 a 8 años.",
      en: "A coloring book with 50+ adorable animal illustrations featuring simple, clear outlines — perfect for beginners and little artists ages 4–8."
    },
    features: {
      en: ["110 pages with 50+ adorable animal illustrations", "Simple outlines perfect for beginners and young kids", "Familiar animals from farm, jungle, ocean, and forest", "Single-sided pages — no bleed-through when using markers"],
      es: ["110 páginas con más de 50 adorables ilustraciones de animales", "Líneas simples perfectas para principiantes y niños pequeños", "Animales familiares de la granja, la jungla, el océano y el bosque", "Páginas a una sola cara — sin manchas al usar marcadores"]
    },
    perfectFor: {
      en: "Beginners and animal lovers ages 4–8. Simple designs that build coloring confidence, with 110 pages of content for hours of creative fun — a go-to first coloring book.",
      es: "Principiantes y amantes de los animales de 4 a 8 años. Diseños simples que generan confianza al colorear, con 110 páginas de contenido para horas de diversión creativa — el libro de colorear ideal para empezar."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GSW8SP9P",
    coverAlt: {
      es: "Portada del libro Easy Animals Coloring Book",
      en: "Easy Animals Coloring Book cover"
    },
    coverSrc: "https://m.media-amazon.com/images/I/610IEQO-VnL._SY342_.jpg",
    ageRange: {
      es: "4-8 años",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 110,
    ratingValue: 5,
    ratingCount: 2



  },
  {
    id: "awesome-airplanes",
    title: {
      es: "Awesome Airplanes",
      en: "Awesome Airplanes"
    },
    subtitle: {
      es: "40 aviones y helicopteros unicos",
      en: "40 unique airplanes and helicopters"
    },
    description: {
      es: "Libro de colorear de aviación con 40 diseños únicos de aviones y helicópteros, ideal para niños de 4 a 8 años apasionados por los aviones.",
      en: "An aviation coloring book featuring 40 unique airplane and helicopter designs, ideal for kids ages 4–8 who are passionate about flight."
    },
    features: {
      en: ["90 single-sided pages with 40 unique airplane designs", "Commercial jets, fighter planes, helicopters, biplanes, and more", "Perfect for little aviation enthusiasts ages 4–8", "Detailed enough to challenge, simple enough to enjoy"],
      es: ["90 páginas a una sola cara con 40 diseños únicos de aviones", "Jets comerciales, aviones de caza, helicópteros, biplanos y más", "Perfecto para pequeños entusiastas de la aviación de 4 a 8 años", "Suficientemente detallado para desafiar, suficientemente simple para disfrutar"]
    },
    perfectFor: {
      en: "Kids ages 4–8 who love planes, helicopters, and everything that flies. A dream gift for little aviation fans — and a great way to spark interest in engineering and flight.",
      es: "Niños de 4 a 8 años que aman los aviones, helicópteros y todo lo que vuela. Un regalo soñado para pequeños fans de la aviación — y una excelente forma de despertar el interés por la ingeniería y el vuelo."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GSZ5LDQD",
    coverAlt: {
      es: "Portada del libro Awesome Airplanes",
      en: "Awesome Airplanes book cover"
    },
    coverSrc: "https://m.media-amazon.com/images/I/611wlEpMr0L._SY342_.jpg",
    ageRange: {
      es: "4-8 años",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90,
    ratingValue: 5,
    ratingCount: 2



  },
  {
    id: "alphabet-coloring-book",
    title: {
      es: "Alphabet Coloring Book",
      en: "Alphabet Coloring Book"
    },
    subtitle: {
      es: "Fun ABC Coloring Pages for Kids Ages 4-8",
      en: "Fun ABC Coloring Pages for Kids Ages 4-8"
    },
    description: {
      es: "Libro educativo y divertido que combina el aprendizaje del alfabeto con el colorear, ayudando a niños de 4 a 8 años a reconocer letras de forma creativa.",
      en: "A fun educational coloring book that combines alphabet learning with creative coloring, helping kids ages 4–8 recognize letters through art."
    },
    features: {
      en: ["90 single-sided pages covering the full A–Z alphabet", "Fun coloring activities that reinforce letter recognition", "Educational and entertaining — learning through creativity", "Supports pre-reading skills for kids ages 4–8"],
      es: ["90 páginas a una sola cara con el alfabeto completo de la A a la Z", "Actividades divertidas que refuerzan el reconocimiento de letras", "Educativo y entretenido — aprender a través de la creatividad", "Apoya las habilidades pre-lectoras para niños de 4 a 8 años"]
    },
    perfectFor: {
      en: "Preschoolers and early learners ages 4–8 who are exploring the alphabet. A unique educational gift loved by parents and teachers — makes learning letters fun, not a chore.",
      es: "Niños en edad preescolar y primeros aprendices de 4 a 8 años que están explorando el alfabeto. Un regalo educativo único que adoran padres y maestros — hace que aprender las letras sea divertido, no una tarea."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GVB242YV",
    coverAlt: {
      es: "Portada del libro Alphabet Coloring Book",
      en: "Alphabet Coloring Book cover"
    },
    coverSrc: "https://m.media-amazon.com/images/I/61i3TtXpXjL._SY342_.jpg",
    ageRange: {
      es: "4-8 anos",
      en: "Ages 4-8"
    },
    ageCategories: ["4-8"],
    pages: 90
  }
];

const homePriorityById: Record<string, number> = {
  "awesome-boys": 1,
  "style-time-machine": 2,
  "dresses-and-dolls": 3,
  "chic-styles": 4,
  "magical-creatures": 5,
  "easy-animals": 6,
  "awesome-airplanes": 7,
  "alphabet-coloring-book": 8,
  "awesome-girls": 9,
  "enchanted-easter": 10,
  "coloring-emotions": 11,
  "pizza-sweet-treats": 12,
  "blast-off-space": 13,
  "mighty-machines": 14,
  "cozy-kids-club": 99
};

export const booksByNewest: Book[] = [...books].sort((a, b) => {
  const aPriority = homePriorityById[a.id] ?? 999;
  const bPriority = homePriorityById[b.id] ?? 999;
  return aPriority - bPriority;
});

/**
 * Auto-rotate a different book each month as the giveaway prize.
 * April 2026 → awesome-boys (index 5), then cycles through all 15.
 */
export function getMonthlyPrizeBook(month: string): Book {
  const [y, m] = month.split("-").map(Number);
  const idx = (y * 12 + m + 4) % books.length;
  return books[idx];
}
