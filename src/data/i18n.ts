export const languages = ["es", "en"] as const;

export type Lang = (typeof languages)[number];

export const defaultLang: Lang = "es";

export const ui = {
  es: {
    languageName: "Espanol",
    navHome: "Inicio",
    navBooks: "Libros",
    navBlog: "Blog",
    navNewsletter: "Newsletter",
    navContact: "Contacto",
    navAbout: "Nosotros",
    navPrivacy: "Privacidad",
    languageToggleLabel: "Cambiar idioma",
    ctaBuyOnAmazon: "Comprar en Amazon",
    ctaLeaveReview: "Dejar reseña",
    ctaReadPost: "Leer articulo",
    ctaViewAllBooks: "Ver todos los libros",
    ctaViewBlog: "Ir al blog",
    ctaSubscribe: "Suscribirme",
    ctaSend: "Enviar mensaje",
    heroKicker: "Pen Name Editorial",
    homeFeaturedBooks: "Libros destacados",
    homeLatestPosts: "Ultimos articulos",
    booksMetaTitle: "Libros | Little Chubby Press",
    blogMetaTitle: "Blog | Little Chubby Press",
    newsletterMetaTitle: "Newsletter | Little Chubby Press",
    contactMetaTitle: "Contacto | Little Chubby Press",
    privacyMetaTitle: "Privacidad | Little Chubby Press",
    thanksMetaTitle: "Gracias | Little Chubby Press",
    homeMetaTitle: "Little Chubby Press | Libros de colorear para familias",
    homeMetaDescription:
      "Landing oficial de Little Chubby Press: libros de colorear, blog para familias creativas, newsletter y contacto.",
    booksMetaDescription:
      "Explora los libros de Little Chubby Press y compra en Amazon con enlaces directos.",
    blogMetaDescription:
      "Consejos, ideas y recursos para familias creativas en el blog de Little Chubby Press.",
    newsletterMetaDescription:
      "Suscribete al newsletter de Little Chubby Press para recibir lanzamientos, recursos creativos y noticias para familias.",
    contactMetaDescription:
      "Contacta a Little Chubby Press para colaboraciones, prensa, consultas de libros y propuestas editoriales.",
    privacyMetaDescription:
      "Revisa la politica de privacidad de Little Chubby Press: datos personales, cookies y gestion de comunicaciones.",
    thanksMetaDescription:
      "Pagina de confirmacion de Little Chubby Press tras enviar tu formulario o suscripcion correctamente.",
    booksSectionTitle: "Nuestros libros",
    blogSectionTitle: "Historias y recursos",
    newsletterSectionTitle: "Recibe novedades por email",
    contactSectionTitle: "Hablemos",
    privacySectionTitle: "Politica de privacidad",
    footerTagline: "Coloring books created by kids, for kids",
    newsletterDisclaimer:
      "Prometemos emails utiles. Cero spam. Puedes darte de baja cuando quieras.",
    contactResponseTime: "Respondemos normalmente en 24-48 horas habiles.",
    thanksTitle: "Gracias por escribirnos",
    thanksBody:
      "Recibimos tu envio correctamente. Te responderemos muy pronto.",
    thanksBackHome: "Volver al inicio",
    formName: "Nombre",
    formEmail: "Email",
    formMessage: "Mensaje",
    formPhoneHp: "Deja este campo vacio",
    formValidationRequired: "Por favor completa los campos obligatorios.",
    formValidationEmail: "Ingresa un email valido.",
    providerSetupLabel: "Integracion pendiente",
    ratingNoReviews: "Sin reseñas todavia",
    ratingOutOfFive: "de 5",
    ratingReviewSingular: "reseña",
    ratingReviewPlural: "reseñas",
    navLogin: "Iniciar sesion",
    navProfile: "Mi perfil",
    navLogout: "Cerrar sesion",
    loginMetaTitle: "Iniciar sesion | Little Chubby Press",
    loginHeading: "Iniciar sesion",
    loginSubheading: "Ingresa tu email y te enviaremos un enlace magico.",
    loginEmailLabel: "Email",
    loginSubmit: "Enviar enlace",
    loginCheckEmail: "Revisa tu bandeja de entrada para el enlace magico.",
    loginError: "Hubo un error. Intenta de nuevo.",
    profileMetaTitle: "Mi perfil | Little Chubby Press",
    profileHeading: "Mi perfil",
    profileDisplayName: "Nombre visible",
    profileLangPref: "Idioma preferido",
    profileSave: "Guardar cambios",
    profileSaved: "Perfil actualizado correctamente.",
    lotteryBanner: "¡Registrate para ganar un libro gratis cada mes!",
    lotteryMetaTitle: "Sorteo mensual | Little Chubby Press",
    lotteryHeading: "Sorteo mensual de libros",
    lotteryDescription: "Cada mes sorteamos un libro de colorear entre nuestros usuarios registrados. ¡Solo necesitas crear una cuenta!",
    lotteryEntered: "¡Ya estas participando este mes!",
    lotteryNotLoggedIn: "Inicia sesion para participar.",
    lotteryWinnersTitle: "Ganadores anteriores"
  },
  en: {
    languageName: "English",
    navHome: "Home",
    navBooks: "Books",
    navBlog: "Blog",
    navNewsletter: "Newsletter",
    navContact: "Contact",
    navAbout: "About",
    navPrivacy: "Privacy",
    languageToggleLabel: "Switch language",
    ctaBuyOnAmazon: "Buy on Amazon",
    ctaLeaveReview: "Leave a review",
    ctaReadPost: "Read article",
    ctaViewAllBooks: "Browse all books",
    ctaViewBlog: "Visit blog",
    ctaSubscribe: "Subscribe",
    ctaSend: "Send message",
    heroKicker: "Editorial Pen Name",
    homeFeaturedBooks: "Featured books",
    homeLatestPosts: "Latest posts",
    booksMetaTitle: "Books | Little Chubby Press",
    blogMetaTitle: "Blog | Little Chubby Press",
    newsletterMetaTitle: "Newsletter | Little Chubby Press",
    contactMetaTitle: "Contact | Little Chubby Press",
    privacyMetaTitle: "Privacy | Little Chubby Press",
    thanksMetaTitle: "Thank You | Little Chubby Press",
    homeMetaTitle: "Little Chubby Press | Coloring books for families",
    homeMetaDescription:
      "Official Little Chubby Press website: coloring books, family creativity blog, newsletter, and contact.",
    booksMetaDescription:
      "Explore Little Chubby Press books and buy directly through Amazon links.",
    blogMetaDescription:
      "Tips, ideas, and resources for creative families on the Little Chubby Press blog.",
    newsletterMetaDescription:
      "Join the Little Chubby Press newsletter for launches, creative resources, and family-friendly coloring updates.",
    contactMetaDescription:
      "Contact Little Chubby Press for collaborations, media requests, book questions, and editorial inquiries.",
    privacyMetaDescription:
      "Read the Little Chubby Press privacy policy covering personal data, cookies, and communication preferences.",
    thanksMetaDescription:
      "Confirmation page after your message or newsletter signup at Little Chubby Press, with next-step guidance.",
    booksSectionTitle: "Our books",
    blogSectionTitle: "Stories and resources",
    newsletterSectionTitle: "Get updates by email",
    contactSectionTitle: "Let's connect",
    privacySectionTitle: "Privacy policy",
    footerTagline: "Coloring books created by kids, for kids",
    newsletterDisclaimer:
      "Useful emails only. No spam. Unsubscribe anytime.",
    contactResponseTime: "We usually reply within 24-48 business hours.",
    thanksTitle: "Thanks for reaching out",
    thanksBody:
      "Your submission was received successfully. We will reply very soon.",
    thanksBackHome: "Back to home",
    formName: "Name",
    formEmail: "Email",
    formMessage: "Message",
    formPhoneHp: "Leave this field empty",
    formValidationRequired: "Please complete all required fields.",
    formValidationEmail: "Please enter a valid email.",
    providerSetupLabel: "Setup needed",
    ratingNoReviews: "No reviews yet",
    ratingOutOfFive: "out of 5",
    ratingReviewSingular: "review",
    ratingReviewPlural: "reviews",
    navLogin: "Log in",
    navProfile: "My profile",
    navLogout: "Log out",
    loginMetaTitle: "Log in | Little Chubby Press",
    loginHeading: "Log in",
    loginSubheading: "Enter your email and we'll send you a magic link.",
    loginEmailLabel: "Email",
    loginSubmit: "Send link",
    loginCheckEmail: "Check your inbox for the magic link.",
    loginError: "Something went wrong. Please try again.",
    profileMetaTitle: "My profile | Little Chubby Press",
    profileHeading: "My profile",
    profileDisplayName: "Display name",
    profileLangPref: "Preferred language",
    profileSave: "Save changes",
    profileSaved: "Profile updated successfully.",
    lotteryBanner: "Register to win a free book every month!",
    lotteryMetaTitle: "Monthly giveaway | Little Chubby Press",
    lotteryHeading: "Monthly book giveaway",
    lotteryDescription: "Every month we give away a coloring book among registered users. Just create an account to enter!",
    lotteryEntered: "You're entered for this month!",
    lotteryNotLoggedIn: "Log in to enter the giveaway.",
    lotteryWinnersTitle: "Past winners"
  }
} as const;

export const getLangFromParam = (value?: string): Lang => {
  if (value === "es" || value === "en") {
    return value;
  }
  return defaultLang;
};

export const switchLangPath = (pathname: string, targetLang: Lang): string => {
  if (/^\/(es|en)(\/|$)/.test(pathname)) {
    return pathname.replace(/^\/(es|en)/, `/${targetLang}`);
  }
  if (pathname === "/") {
    return `/${targetLang}/`;
  }
  return `/${targetLang}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
};

export const formatDate = (isoDate: string, lang: Lang): string => {
  return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${isoDate}T00:00:00`));
};
