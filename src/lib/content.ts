export const CALENDAR_URL = "https://calendar.app.google/HvdrgaGkZNaobcvH7";
export const INSTAGRAM_URL = "https://www.instagram.com/breakpointcreativa/";
export const WHATSAPP_URL = "https://wa.me/5492615114147";

export const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "ia", label: "IA" },
  { id: "turismo", label: "Turismo" },
  { id: "datos", label: "Datos" },
  { id: "codigo", label: "Código" },
  { id: "oficio", label: "Oficio" },
  { id: "imagen", label: "Imagen" },
] as const;

export type FilterId = (typeof FILTERS)[number]["id"];
export type CourseTag = Exclude<FilterId, "all">;

export type Course = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  duration?: string;
  audience?: string;
  tags: CourseTag[];
  group: "ia" | "otras";
};

export const COURSES: Course[] = [
  {
    slug: "ai-marketing-redes",
    title: "AI y marketing para redes sociales",
    summary:
      "Optimiza estrategias en redes con IA para crear contenido personalizado, analizar engagement y automatizar campañas.",
    description:
      "Curso esencial para emprendedores que buscan integrar la inteligencia artificial en sus estrategias de marketing digital y redes sociales. Los participantes desarrollan habilidades para la creación de contenido, el diseño visual y la automatización de procesos. La formación también abarca el análisis de datos para la toma de decisiones y las consideraciones éticas de la IA. El propósito es optimizar el tiempo, elevar la calidad del contenido y basar las decisiones en datos para fortalecer la presencia en línea.",
    audience: "Emprendedores y equipos de marketing",
    tags: ["ia", "imagen"],
    group: "ia",
  },
  {
    slug: "ia-administrativos",
    title: "IA para administrativos y emprendedores",
    summary:
      "Automatiza tareas administrativas diarias con IA para aumentar productividad y eficiencia.",
    description:
      "Formación práctica de 12 horas para administrativos y emprendedores que desean integrar la inteligencia artificial en su día a día. Aprenderás a usar herramientas de IA para automatizar la gestión documental, mejorar la comunicación, tomar decisiones basadas en datos y liderar el cambio tecnológico. Con un enfoque práctico y ético, permite agilizar tareas, optimizar procesos y potenciar la eficiencia laboral.",
    duration: "12 h",
    audience: "Administrativos y emprendedores",
    tags: ["ia", "oficio"],
    group: "ia",
  },
  {
    slug: "analisis-datos-ia",
    title: "Análisis de datos con IA",
    summary:
      "Domina técnicas de IA para procesar, analizar y visualizar datos, extrayendo insights accionables.",
    description:
      "Dos modalidades de análisis de datos con inteligencia artificial, ideales para principiantes: Google Sheets + Looker Studio, y Power BI. Ambas formaciones duran 12 horas y tienen un enfoque práctico. Cubren fundamentos de análisis de datos, limpieza de información, creación de dashboards y uso de IA (Perplexity / Gemini) para generar insights.",
    duration: "12 h",
    audience: "Principiantes en análisis de datos",
    tags: ["ia", "datos"],
    group: "ia",
  },
  {
    slug: "ia-jovenes",
    title: "IA para jóvenes protagonistas",
    summary:
      "Introduce a jóvenes en el uso de IA para fomentar creatividad, liderazgo y habilidades digitales.",
    description:
      "Capacitación de 8 horas (4 clases) para aprender IA de forma segura, ética y creativa. Cubre fundamentos de IA, prompts efectivos, pensamiento crítico, ética y privacidad. Incluye el desarrollo de proyectos creativos para un uso consciente y responsable.",
    duration: "8 h · 4 clases",
    audience: "Jóvenes",
    tags: ["ia"],
    group: "ia",
  },
  {
    slug: "bots-turismo",
    title: "Bots para sector turismo",
    summary:
      "Crea bots inteligentes con IA para reservas, recomendaciones y atención al cliente en turismo.",
    description:
      "Curso de 12 horas para profesionales turísticos. Crear, configurar y optimizar bots de WhatsApp con IA: desde flujos conversacionales básicos hasta integración con IA para respuestas personalizadas. Incluye soluciones gratuitas y migración a WhatsApp Cloud API para una atención al cliente eficiente.",
    duration: "12 h",
    audience: "Profesionales del turismo",
    tags: ["ia", "turismo"],
    group: "ia",
  },
  {
    slug: "generacion-prompts",
    title: "Capacitación Generación de Prompts",
    summary:
      "Aprendé a diseñar prompts efectivos para maximizar modelos de IA en contenido y tareas.",
    description:
      "Formación sobre generación de prompts para IA, ética digital y proyectos creativos. Variadas duraciones para distintos públicos, de principiantes a avanzados. Cubre fundamentos de IA generativa, ingeniería de prompts, ética y un listado exhaustivo de herramientas.",
    duration: "Duración variable",
    audience: "Principiantes a avanzados",
    tags: ["ia"],
    group: "ia",
  },
  {
    slug: "ia-vida-trabajo",
    title: "IA aplicada a la vida y al trabajo",
    summary:
      "Integra IA en rutinas diarias y laborales para automatizar procesos y resolver desafíos prácticos.",
    description:
      "Programa de 12 horas para profesionales y público en general. Integra IA en rutinas diarias y laborales. Cubre fundamentos de IA, Prompt Engineering, herramientas especializadas y automatización de tareas. Enfoque práctico para optimizar productividad y aplicar IA de forma estratégica.",
    duration: "12 h",
    audience: "Profesionales y público general",
    tags: ["ia", "oficio"],
    group: "ia",
  },
  {
    slug: "ia-imagenes-videos",
    title: "IA para generación de imágenes y videos",
    summary:
      "Genera y edita contenido multimedia con herramientas IA para campañas visuales de impacto.",
    description:
      "Capacitación intensiva de 12 horas en marketing con IA generativa de imágenes y videos. Para profesionales y aficionados de marketing. Dominá herramientas de IA para producir contenido visual profesional, optimizar campañas y escalar la producción. Incluye listado de herramientas y costos.",
    duration: "12 h",
    audience: "Marketing y creación de contenido",
    tags: ["ia", "imagen"],
    group: "ia",
  },
  {
    slug: "ia-admin-turismo",
    title: "IA para tareas administrativas en el sector turístico",
    summary:
      "Optimiza gestión turística con IA en reservas, itinerarios y operaciones administrativas.",
    description:
      "Programa de 12 horas para profesionales turísticos. Optimiza y automatiza tareas administrativas con IA. Cubre gestión de reservas, automatización de comunicación, análisis de datos y diseño de asistentes virtuales. Mejora eficiencia, comunicación y toma de decisiones.",
    duration: "12 h",
    audience: "Profesionales del turismo",
    tags: ["ia", "turismo", "oficio"],
    group: "ia",
  },
  {
    slug: "datos-prompts-avanzados",
    title: "Análisis de Datos con IA + Generación de Prompts Avanzados",
    summary:
      "Combina prompting avanzado con análisis IA para extraer valor de datos y generar soluciones.",
    description:
      "Capacitación de 9 horas (3 clases) para principiantes. Usa Google Sheets y Looker Studio para análisis de datos. Incluye técnicas de prompting básicas y avanzadas con IA generativa. Cubre limpieza de datos, creación de dashboards, análisis predictivos y un proyecto final práctico.",
    duration: "9 h · 3 clases",
    audience: "Principiantes",
    tags: ["ia", "datos"],
    group: "ia",
  },
  {
    slug: "marketing-inmersivo",
    title: "Marketing Inmersivo con IA, Realidad Aumentada y Drones",
    summary:
      "Crea experiencias inmersivas integrando IA, RA y drones para campañas que captan reservas.",
    description:
      "Taller 100% práctico de 9 horas para profesionales del turismo (gastronomía, bodegas, hospedajes, guías). Crea campañas inmersivas combinando IA, realidad aumentada y videos con drones. Construye storytelling emotivo, produce reels de alto impacto y lanza campañas para captar reservas directas.",
    duration: "9 h",
    audience: "Turismo, gastronomía, bodegas, hospedajes, guías",
    tags: ["ia", "turismo", "imagen"],
    group: "ia",
  },
  {
    slug: "programacion-modelos",
    title: "Programación avanzada con IA, entrenamiento de modelos",
    summary:
      "Desarrolla y entrena modelos IA con programación avanzada para aplicaciones personalizadas.",
    description:
      "Programa de 2 meses para quienes programan en Python. Profundiza en el uso de IA para entrenamiento de modelos. Cubre aprendizaje automático, preparación de datos, redes neuronales y un proyecto final aplicado. Desarrolla habilidades avanzadas en IA con Python.",
    duration: "2 meses",
    audience: "Quienes programan en Python",
    tags: ["ia", "codigo"],
    group: "ia",
  },
  {
    slug: "alfabetizacion-principiante",
    title: "Alfabetización Digital Principiante",
    summary:
      "Fundamentos para navegar el mundo digital: dispositivos, herramientas básicas y seguridad en línea.",
    description:
      "Curso de 50 horas para usuarios iniciales. Enseña fundamentos de computación, herramientas de Google (comunicación, productividad, colaboración) y seguridad digital. Incluye un proyecto final para aplicar los conocimientos en la vida personal y profesional.",
    duration: "50 h",
    audience: "Usuarios iniciales",
    tags: ["oficio"],
    group: "otras",
  },
  {
    slug: "alfabetizacion-avanzada",
    title: "Alfabetización Digital Avanzada",
    summary:
      "Crea páginas web con HTML, CSS y JavaScript básico, con diseño responsivo y buenas prácticas.",
    description:
      "Curso de 2 meses (50 horas). Crea páginas web con HTML, CSS y JavaScript básico. Cubre estructura, diseño, interactividad, diseño responsivo y buenas prácticas. Evaluación basada en participación, ejercicios y proyecto final.",
    duration: "50 h · 2 meses",
    audience: "Quienes ya navegan el entorno digital",
    tags: ["oficio", "codigo"],
    group: "otras",
  },
  {
    slug: "python-principiante",
    title: "Capacitación Python principiante",
    summary:
      "Introducción al lenguaje Python: sintaxis, pensamiento algorítmico y primeros proyectos.",
    description:
      "Programa para principiantes, de cero a intermedio. Cubre pensamiento algorítmico, sintaxis de Python, variables, estructuras de control, funciones, estructuras de datos, manejo de archivos y un proyecto final con pandas para análisis de datos.",
    audience: "Principiantes en programación",
    tags: ["codigo"],
    group: "otras",
  },
  {
    slug: "excel-sheets",
    title: "Excel: Intensiva en Excel y Google Sheets",
    summary:
      "De principiante a avanzado: fórmulas, tablas dinámicas, visualización y análisis de datos.",
    description:
      "Capacitación intensiva de 12 horas, de principiante a avanzado. Combina teoría, ejercicios y miniproyectos. Cubre fundamentos, operaciones básicas, funciones, gestión de datos, tablas dinámicas, visualización y funciones avanzadas.",
    duration: "12 h",
    audience: "Principiantes a avanzados",
    tags: ["oficio", "datos"],
    group: "otras",
  },
  {
    slug: "impresion-3d",
    title: "Impresión 3D",
    summary:
      "Diseñá e imprimí objetos en 3D, desde modelado básico hasta prototipos prácticos.",
    description:
      "Aprendé a diseñar e imprimir objetos en 3D. Cubre modelado básico con software como Tinkercad y procesos de impresión para prototipos y diseños personalizados.",
    audience: "Makers, docentes, emprendedores",
    tags: ["imagen"],
    group: "otras",
  },
  {
    slug: "drones-turismo",
    title: "Manejo de Drones para sector turismo",
    summary:
      "Operación de drones aplicada al turismo: normativas locales y tomas aéreas creativas.",
    description:
      "Capacitación con certificación en operación de drones. Énfasis en capturas turísticas, normativas locales y edición de videos aéreos.",
    audience: "Profesionales del turismo",
    tags: ["turismo", "imagen"],
    group: "otras",
  },
  {
    slug: "programacion-datos",
    title: "Programación avanzada con análisis de datos",
    summary:
      "Algoritmos de datos con Python, Pandas y Matplotlib para soluciones analíticas complejas.",
    description:
      "Avanza en algoritmos de datos con Python y librerías como Pandas y Matplotlib. Desarrolla soluciones analíticas complejas con visualización.",
    audience: "Quienes ya programan",
    tags: ["codigo", "datos"],
    group: "otras",
  },
  {
    slug: "robotica-automatizacion",
    title: "Robótica y Automatización",
    summary:
      "Construí y programá robots básicos con Arduino, sensores y automatización de procesos.",
    description:
      "Introducción a la robótica y sistemas de automatización, con proyectos prácticos en programación y ensamblaje. Construye y programa robots básicos con Arduino, enfocándote en sensores y automatización de procesos industriales.",
    audience: "Estudiantes y equipos técnicos",
    tags: ["codigo"],
    group: "otras",
  },
];

export function courseBySlug(slug: string | undefined) {
  if (!slug) return undefined;
  return COURSES.find((c) => c.slug === slug);
}

export function padIndex(n: number) {
  return String(n).padStart(2, "0");
}
