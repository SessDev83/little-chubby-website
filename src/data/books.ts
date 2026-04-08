import type { LocalizedText } from "./site";

export type Book = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  amazonUrl: string;
  coverAlt: LocalizedText;
  coverSrc: string;
  ageRange: LocalizedText;
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
    pages: 90
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
    pages: 90
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
      es: "Ficha oficial enlazada a Amazon. Consulta todos los detalles y reseñas desde el boton de abajo.",
      en: "Official listing linked to Amazon. Check full details and reviews using the button below."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GSW8SP9P",
    coverAlt: {
      es: "Portada del libro Easy Animals Coloring Book",
      en: "Easy Animals Coloring Book cover"
    },
    coverSrc: "https://m.media-amazon.com/images/I/610IEQO-VnL._SY342_.jpg",
    ageRange: {
      es: "Edad: ver detalle en Amazon",
      en: "Age: see Amazon listing"
    },
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
      es: "Ficha oficial enlazada a Amazon. Consulta todos los detalles y reseñas desde el boton de abajo.",
      en: "Official listing linked to Amazon. Check full details and reviews using the button below."
    },
    amazonUrl: "https://www.amazon.com/dp/B0GSZ5LDQD",
    coverAlt: {
      es: "Portada del libro Awesome Airplanes",
      en: "Awesome Airplanes book cover"
    },
    coverSrc: "https://m.media-amazon.com/images/I/611wlEpMr0L._SY342_.jpg",
    ageRange: {
      es: "Edad: ver detalle en Amazon",
      en: "Age: see Amazon listing"
    },
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
      es: "Ficha oficial enlazada a Amazon. Consulta todos los detalles y reseñas desde el boton de abajo.",
      en: "Official listing linked to Amazon. Check full details and reviews using the button below."
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
