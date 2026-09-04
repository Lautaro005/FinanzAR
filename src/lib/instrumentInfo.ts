// Información de personalización por instrumento: rubro/sector y una
// descripción breve específica, en vez del texto genérico único que se
// mostraba antes para toda una categoría (ej. "Cotización de referencia en
// pesos argentinos con liquidez global" para las 7 criptomonedas, o
// "Operado bajo normas del BCRA o CNV" para absolutamente todo). También
// centraliza qué organismo supervisa y en qué moneda liquida cada tipo de
// instrumento, para que la ficha de detalle muestre el dato correcto según
// el instrumento en lugar de una frase ambigua ("BCRA o CNV", "ARS o USD
// según corresponda") repetida siempre igual.

export interface SectorInfo {
  rubro: string;
  resumen: string;
}

export interface RegulacionInfo {
  supervision: string;
  moneda: string;
}

// ===== Acciones / CEDEARs / EE.UU. directo =====
// Se matchea contra el nombre "limpio" del instrumento (sin el prefijo
// "CEDEAR " ni el sufijo "(liq. Cable/Dólar MEP)"), no contra el ticker:
// BYMA arma sus tickers de liquidación (…C, …D) de forma inconsistente
// (a veces agrega la letra, a veces reemplaza un dígito final), así que
// inferir el rubro desde el sufijo del ticker daría falsos positivos
// (ej. "DD" de DuPont, o "GT" de Goodyear terminando distinto según la
// plaza). El nombre en cambio ya viene normalizado por ASSET_NAMES /
// USA_DIRECT_NAMES.
export const EQUITY_PATTERNS: Array<[RegExp, SectorInfo]> = [
  // --- Tecnología / Software ---
  [/Apple/i, { rubro: "Tecnología — Hardware y ecosistema de consumo", resumen: "Diseña el iPhone, la Mac y sus servicios digitales (App Store, iCloud); una de las compañías más valiosas del mundo por capitalización bursátil." }],
  [/Microsoft/i, { rubro: "Tecnología — Software empresarial y nube", resumen: "Windows, Office 365 y Azure la ubican entre los mayores proveedores globales de software y computación en la nube." }],
  [/Alphabet/i, { rubro: "Tecnología — Internet y publicidad digital", resumen: "Controla Google Search, YouTube y Google Cloud; la mayor parte de sus ingresos proviene de publicidad digital." }],
  [/Amazon/i, { rubro: "Comercio electrónico y computación en la nube", resumen: "El mayor marketplace online del mundo, además de Amazon Web Services (AWS), líder en infraestructura cloud." }],
  [/Meta Platforms/i, { rubro: "Tecnología — Redes sociales y publicidad digital", resumen: "Opera Facebook, Instagram y WhatsApp; monetiza principalmente mediante publicidad digital segmentada." }],
  [/NVIDIA/i, { rubro: "Semiconductores — Cómputo e inteligencia artificial", resumen: "Líder en chips gráficos (GPU) y en la infraestructura de hardware que impulsa el entrenamiento de modelos de IA." }],
  [/MercadoLibre/i, { rubro: "Comercio electrónico y fintech regional", resumen: "El mayor marketplace y una de las principales billeteras digitales (Mercado Pago) de América Latina." }],
  [/Netflix/i, { rubro: "Streaming y entretenimiento", resumen: "Plataforma de video bajo demanda por suscripción con producción propia de contenido original." }],
  [/Adobe/i, { rubro: "Software — Herramientas creativas y marketing digital", resumen: "Photoshop, Premiere y Creative Cloud son parte de su suite de software para creación de contenido y marketing." }],
  [/Salesforce/i, { rubro: "Software empresarial — CRM en la nube", resumen: "Plataforma líder de gestión de relaciones con clientes (CRM) utilizada por empresas de todos los tamaños." }],
  [/Oracle/i, { rubro: "Software y bases de datos empresariales", resumen: "Proveedor histórico de bases de datos corporativas, que además expandió su oferta de infraestructura en la nube." }],
  [/Intel/i, { rubro: "Semiconductores", resumen: "Fabricante histórico de microprocesadores para PCs y servidores, hoy compitiendo fuerte con AMD y NVIDIA." }],
  [/Cisco/i, { rubro: "Tecnología — Redes e infraestructura de internet", resumen: "Proveedor líder de equipamiento de redes (routers, switches) para empresas y proveedores de internet." }],
  [/International Business Machines/i, { rubro: "Tecnología — Consultoría y software empresarial", resumen: "Servicios de consultoría IT, software empresarial y computación híbrida/cuántica para grandes organizaciones." }],
  [/Qualcomm/i, { rubro: "Semiconductores — Conectividad móvil", resumen: "Diseña los chips Snapdragon, presentes en la mayoría de los smartphones Android del mundo." }],
  [/Texas Instruments/i, { rubro: "Semiconductores analógicos", resumen: "Fabrica componentes electrónicos analógicos y embebidos usados en industria, autos y electrónica de consumo." }],
  [/Advanced Micro Devices/i, { rubro: "Semiconductores", resumen: "Microprocesadores y placas gráficas; competidor directo de Intel en CPUs y de NVIDIA en GPUs." }],
  [/Broadcom/i, { rubro: "Semiconductores e infraestructura de redes", resumen: "Chips para telecomunicaciones, centros de datos y, tras adquirir VMware, también software empresarial." }],
  [/Applied Materials/i, { rubro: "Semiconductores — Equipamiento de fabricación", resumen: "Fabrica las máquinas que las fábricas de chips (fabs) usan para producir semiconductores." }],
  [/Micron Technology/i, { rubro: "Semiconductores — Memorias", resumen: "Uno de los mayores fabricantes mundiales de memorias RAM y almacenamiento flash (NAND)." }],
  [/ASML/i, { rubro: "Semiconductores — Litografía", resumen: "Fabricante neerlandés de las máquinas de litografía ultravioleta extrema, clave en la manufactura global de chips avanzados." }],
  [/Analog Devices/i, { rubro: "Semiconductores analógicos y de señal mixta", resumen: "Componentes que convierten señales del mundo físico (sonido, temperatura, movimiento) a formato digital." }],
  [/Arm Holdings/i, { rubro: "Semiconductores — Diseño de arquitecturas", resumen: "Licencia el diseño de procesadores que usa la mayoría de los fabricantes de chips móviles del mundo." }],
  [/Taiwan Semiconductor/i, { rubro: "Semiconductores — Fabricación por encargo (foundry)", resumen: "El mayor fabricante mundial de chips por encargo; produce procesadores diseñados por Apple, NVIDIA, AMD y otras." }],
  [/Coinbase/i, { rubro: "Fintech — Exchange de criptoactivos", resumen: "El mayor exchange de criptomonedas de EE.UU. que cotiza en bolsa; ingresos ligados al volumen de trading cripto." }],
  [/Robinhood/i, { rubro: "Fintech — Bróker online", resumen: "Plataforma de trading online sin comisiones, popular entre inversores minoristas jóvenes." }],
  [/PayPal/i, { rubro: "Fintech — Pagos digitales", resumen: "Una de las billeteras y procesadoras de pagos online más usadas a nivel global." }],
  [/eBay/i, { rubro: "Comercio electrónico", resumen: "Plataforma pionera de subastas y venta online entre particulares y comercios." }],
  [/^Etsy/i, { rubro: "Comercio electrónico — Productos artesanales", resumen: "Marketplace especializado en productos artesanales, vintage y de diseño independiente." }],
  [/DocuSign/i, { rubro: "Software — Firma electrónica", resumen: "Plataforma líder de firma electrónica y gestión digital de contratos." }],
  [/CrowdStrike/i, { rubro: "Ciberseguridad", resumen: "Plataforma de protección de endpoints (Falcon) basada en la nube, usada por empresas para prevenir ciberataques." }],
  [/CoreWeave/i, { rubro: "Tecnología — Infraestructura de nube para IA", resumen: "Provee capacidad de cómputo GPU en la nube especializada en entrenamiento e inferencia de modelos de IA." }],
  [/Hut 8/i, { rubro: "Minería de criptoactivos y centros de datos", resumen: "Opera infraestructura de minería de Bitcoin y centros de datos de alto rendimiento en Canadá." }],
  [/Arista Networks/i, { rubro: "Tecnología — Redes para centros de datos", resumen: "Fabrica switches y equipamiento de red de alto rendimiento para centros de datos en la nube." }],
  [/Dell Technologies/i, { rubro: "Tecnología — Hardware", resumen: "Fabricante de computadoras personales, servidores y soluciones de infraestructura para empresas." }],
  [/HP Inc/i, { rubro: "Tecnología — Hardware de consumo", resumen: "Fabricante de computadoras personales e impresoras para consumidores y empresas." }],
  [/Booking Holdings/i, { rubro: "Turismo online", resumen: "Propietaria de Booking.com; una de las mayores plataformas de reserva de hoteles y viajes del mundo." }],
  [/Airbnb/i, { rubro: "Turismo — Economía colaborativa", resumen: "Plataforma que conecta anfitriones y huéspedes para alquileres temporarios en todo el mundo." }],
  [/C3\.ai/i, { rubro: "Software — Inteligencia artificial empresarial", resumen: "Desarrolla plataformas de IA aplicada para grandes empresas e industrias reguladas." }],
  [/Blackstone/i, { rubro: "Servicios financieros — Gestión de activos alternativos", resumen: "Una de las mayores gestoras de capital privado, real estate e inversiones alternativas del mundo." }],
  [/Interactive Brokers/i, { rubro: "Servicios financieros — Bróker online", resumen: "Bróker internacional que ofrece trading de acciones, opciones y futuros en decenas de mercados globales." }],
  [/Hims & Hers/i, { rubro: "Salud digital — Telemedicina", resumen: "Plataforma de telemedicina y venta online de productos de salud, bienestar y estética." }],
  [/AST SpaceMobile/i, { rubro: "Telecomunicaciones satelitales", resumen: "Desarrolla una red satelital diseñada para dar cobertura celular directa a teléfonos móviles comunes." }],
  [/BlackBerry/i, { rubro: "Tecnología — Ciberseguridad", resumen: "Reconvertida de fabricante de celulares a proveedora de software de ciberseguridad y sistemas embebidos." }],
  [/iShares Bitcoin Trust/i, { rubro: "ETF — Cripto (Bitcoin)", resumen: "Replica el precio de Bitcoin con custodia institucional de BlackRock; permite exposición sin operar cripto directamente." }],
  [/iShares Ethereum Trust/i, { rubro: "ETF — Cripto (Ethereum)", resumen: "Replica el precio de Ethereum con custodia institucional de BlackRock." }],

  // --- Bancos / Finanzas ---
  [/JPMorgan Chase/i, { rubro: "Banca", resumen: "Uno de los mayores bancos de inversión y comerciales de Estados Unidos por activos." }],
  [/Bank of America/i, { rubro: "Banca", resumen: "Uno de los mayores bancos comerciales de Estados Unidos, con fuerte presencia minorista." }],
  [/Wells Fargo/i, { rubro: "Banca", resumen: "Banco comercial minorista estadounidense, con fuerte presencia en hipotecas y banca de consumo." }],
  [/Citigroup/i, { rubro: "Banca", resumen: "Banco global con operaciones de banca minorista, corporativa y de inversión en más de 100 países." }],
  [/Goldman Sachs/i, { rubro: "Banca de inversión", resumen: "Asesoramiento financiero, banca de inversión y trading institucional a nivel global." }],
  [/American Express/i, { rubro: "Servicios financieros — Tarjetas premium", resumen: "Tarjetas de crédito y servicios de pago orientados a segmentos de mayor poder adquisitivo." }],
  [/^Visa/i, { rubro: "Servicios financieros — Red de pagos", resumen: "Opera una de las mayores redes globales de procesamiento de pagos con tarjeta." }],
  [/Mastercard/i, { rubro: "Servicios financieros — Red de pagos", resumen: "Opera una de las mayores redes globales de procesamiento de pagos con tarjeta." }],
  [/Banco Bradesco/i, { rubro: "Banca — Brasil", resumen: "Uno de los mayores bancos privados de Brasil, con banca minorista, seguros y gestión de activos." }],
  [/HDFC Bank/i, { rubro: "Banca — India", resumen: "Uno de los mayores bancos privados de la India por activos y capitalización bursátil." }],
  [/ICICI Bank/i, { rubro: "Banca — India", resumen: "Uno de los principales bancos privados de la India, con banca minorista y corporativa." }],
  [/HSBC/i, { rubro: "Banca", resumen: "Banco británico con presencia global, especialmente fuerte en Asia y Medio Oriente." }],
  [/American International Group/i, { rubro: "Seguros", resumen: "Aseguradora multinacional estadounidense con operaciones de seguros generales y de vida." }],
  [/Berkshire Hathaway/i, { rubro: "Holding de inversión diversificado", resumen: "Conglomerado dirigido por Warren Buffett, con participaciones en seguros, ferrocarriles, energía y consumo." }],

  // --- Salud ---
  [/Johnson & Johnson/i, { rubro: "Salud — Farmacéutica y consumo médico", resumen: "Laboratorio farmacéutico y de dispositivos médicos, además de productos de cuidado personal." }],
  [/^Pfizer/i, { rubro: "Salud — Farmacéutica", resumen: "Laboratorio farmacéutico global, uno de los mayores desarrolladores de vacunas y medicamentos del mundo." }],
  [/AbbVie/i, { rubro: "Salud — Biofarmacéutica", resumen: "Laboratorio especializado en biotecnología, con foco en inmunología y oncología." }],
  [/^Merck/i, { rubro: "Salud — Farmacéutica", resumen: "Laboratorio farmacéutico global con desarrollos en oncología, vacunas y salud animal." }],
  [/UnitedHealth/i, { rubro: "Salud — Seguros médicos", resumen: "La mayor aseguradora de salud de Estados Unidos, con servicios de gestión de salud integrados." }],
  [/Gilead Sciences/i, { rubro: "Salud — Biotecnología", resumen: "Biotecnológica especializada en antivirales, con fuerte presencia en tratamientos contra el VIH." }],
  [/^Amgen/i, { rubro: "Salud — Biotecnología", resumen: "Biotecnológica enfocada en medicamentos para enfermedades crónicas, oncología y osteoporosis." }],
  [/Biogen/i, { rubro: "Salud — Biotecnología", resumen: "Biotecnológica especializada en tratamientos para enfermedades neurológicas." }],
  [/Bristol-Myers Squibb/i, { rubro: "Salud — Farmacéutica", resumen: "Laboratorio global especializado en oncología, hematología e inmunología." }],
  [/AstraZeneca/i, { rubro: "Salud — Farmacéutica", resumen: "Laboratorio farmacéutico británico-sueco con foco en oncología, cardiología y respiratorio." }],
  [/^GSK/i, { rubro: "Salud — Farmacéutica", resumen: "Laboratorio farmacéutico británico (ex GlaxoSmithKline), con foco en vacunas y medicamentos respiratorios." }],
  [/Abbott Laboratories/i, { rubro: "Salud — Dispositivos médicos y nutrición", resumen: "Fabrica dispositivos médicos, equipos de diagnóstico y productos de nutrición." }],
  [/CVS Health/i, { rubro: "Salud — Farmacias y seguros", resumen: "Cadena de farmacias minoristas de EE.UU. que además opera un negocio de seguros de salud." }],

  // --- Consumo ---
  [/Coca-Cola/i, { rubro: "Consumo masivo — Bebidas", resumen: "Fabricante global de bebidas no alcohólicas, dueña de una de las marcas más reconocidas del mundo." }],
  [/PepsiCo/i, { rubro: "Consumo masivo — Bebidas y snacks", resumen: "Bebidas (Pepsi, Gatorade) y snacks (Lay's) bajo un portafolio de marcas globales." }],
  [/Procter & Gamble/i, { rubro: "Consumo masivo — Higiene y limpieza", resumen: "Fabricante de productos de higiene personal y limpieza del hogar con marcas líderes globales." }],
  [/Colgate-Palmolive/i, { rubro: "Consumo masivo — Higiene", resumen: "Productos de higiene personal y del hogar, con foco histórico en cuidado bucal." }],
  [/^Walmart/i, { rubro: "Retail — Supermercados", resumen: "La mayor cadena de supermercados e hipermercados del mundo por ingresos." }],
  [/Costco/i, { rubro: "Retail — Clubes de compra mayorista", resumen: "Cadena de clubes de compras por membresía, con foco en volumen y precios bajos." }],
  [/The Home Depot/i, { rubro: "Retail — Artículos para el hogar", resumen: "La mayor cadena de artículos para el hogar y construcción de Estados Unidos." }],
  [/McDonald/i, { rubro: "Consumo — Gastronomía", resumen: "La mayor cadena de comida rápida del mundo, operada mayormente bajo el modelo de franquicias." }],
  [/Starbucks/i, { rubro: "Consumo — Gastronomía", resumen: "Cadena global de cafeterías con miles de locales propios y franquiciados en todo el mundo." }],
  [/^Nike/i, { rubro: "Consumo — Indumentaria deportiva", resumen: "Fabricante global de indumentaria y calzado deportivo, con fuerte inversión en marketing." }],
  [/Walt Disney/i, { rubro: "Entretenimiento", resumen: "Parques temáticos, estudios de cine y streaming (Disney+) bajo un mismo grupo de medios." }],
  [/Hershey/i, { rubro: "Consumo masivo — Golosinas", resumen: "Fabricante estadounidense de chocolates y golosinas." }],
  [/Deckers Brands/i, { rubro: "Consumo — Calzado", resumen: "Dueña de marcas de calzado como UGG y HOKA, orientadas a lifestyle y running." }],
  [/Abercrombie & Fitch/i, { rubro: "Consumo — Indumentaria de moda", resumen: "Cadena de indumentaria de moda orientada a jóvenes y adultos." }],
  [/^Diageo/i, { rubro: "Consumo masivo — Bebidas alcohólicas", resumen: "Fabricante de bebidas alcohólicas premium (Johnnie Walker, Smirnoff, Guinness)." }],
  [/Altria/i, { rubro: "Consumo masivo — Tabaco", resumen: "Fabricante de cigarrillos (Marlboro) y productos de nicotina alternativos en Estados Unidos." }],
  [/^Garmin/i, { rubro: "Tecnología de consumo — Wearables y GPS", resumen: "Fabricante de dispositivos GPS y relojes/wearables deportivos." }],

  // --- Energía / Materiales ---
  [/Exxon Mobil/i, { rubro: "Energía — Petróleo y gas", resumen: "Una de las mayores petroleras integradas del mundo, con exploración, refinación y petroquímica." }],
  [/^Chevron/i, { rubro: "Energía — Petróleo y gas", resumen: "Petrolera integrada estadounidense con operaciones de exploración, producción y refinación." }],
  [/ConocoPhillips/i, { rubro: "Energía — Exploración y producción", resumen: "Empresa de exploración y producción de petróleo y gas, sin negocio de refinación." }],
  [/^BP plc/i, { rubro: "Energía — Petróleo y gas", resumen: "Petrolera británica integrada, con negocio de exploración, refinación y energías renovables." }],
  [/Baker Hughes/i, { rubro: "Energía — Servicios petroleros", resumen: "Provee tecnología y servicios de equipamiento para la industria de petróleo y gas." }],
  [/Halliburton/i, { rubro: "Energía — Servicios petroleros", resumen: "Provee servicios y tecnología para la exploración y producción de petróleo y gas." }],
  [/Cameco/i, { rubro: "Minería — Uranio", resumen: "Uno de los mayores productores mundiales de uranio, insumo clave para energía nuclear." }],
  [/Freeport-McMoRan/i, { rubro: "Minería — Cobre y oro", resumen: "Uno de los mayores productores mundiales de cobre, además de oro y molibdeno." }],
  [/Agnico Eagle Mines/i, { rubro: "Minería — Oro", resumen: "Minera canadiense enfocada en la producción de oro." }],
  [/Harmony Gold/i, { rubro: "Minería — Oro", resumen: "Minera sudafricana dedicada a la producción de oro." }],
  [/Hecla Mining/i, { rubro: "Minería — Plata", resumen: "Minera estadounidense enfocada en la producción de plata y otros metales preciosos." }],
  [/BHP Group/i, { rubro: "Minería diversificada", resumen: "Una de las mayores mineras del mundo, con hierro, cobre y carbón entre sus principales productos." }],
  [/^Vale S\.A\./i, { rubro: "Minería — Hierro y níquel", resumen: "Minera brasileña, uno de los mayores productores mundiales de mineral de hierro y níquel." }],
  [/DuPont de Nemours/i, { rubro: "Química industrial — Materiales especializados", resumen: "Desarrolla materiales avanzados para electrónica, construcción y salud." }],
  [/^Dow Inc/i, { rubro: "Química industrial", resumen: "Fabricante de materiales químicos, plásticos y recubrimientos industriales." }],
  [/^Corning/i, { rubro: "Materiales — Vidrio especializado", resumen: "Fabricante de vidrio especializado (pantallas, Gorilla Glass) y fibra óptica." }],
  [/United States Steel/i, { rubro: "Industria — Acero", resumen: "Uno de los principales productores de acero de Estados Unidos." }],

  // --- Industriales / Transporte ---
  [/^Boeing/i, { rubro: "Industria aeroespacial", resumen: "Fabricante de aviones comerciales y militares, uno de los mayores del mundo junto a Airbus." }],
  [/Caterpillar/i, { rubro: "Industria — Maquinaria pesada", resumen: "Fabricante líder de maquinaria pesada para construcción, minería y agricultura." }],
  [/Deere & Company/i, { rubro: "Industria — Maquinaria agrícola", resumen: "Fabricante de maquinaria agrícola bajo la marca John Deere." }],
  [/Honeywell International/i, { rubro: "Industria — Tecnología aeroespacial e industrial", resumen: "Tecnología aeroespacial, automatización industrial y sistemas de control edilicio." }],
  [/^3M Company/i, { rubro: "Industria — Productos diversificados", resumen: "Conglomerado industrial con miles de productos, desde cintas adhesivas hasta equipos de seguridad." }],
  [/Howmet Aerospace/i, { rubro: "Industria aeroespacial — Componentes", resumen: "Fabrica componentes metálicos de precisión para motores de avión." }],
  [/^FedEx/i, { rubro: "Logística — Transporte y encomiendas", resumen: "Una de las mayores empresas de transporte y encomiendas a nivel global." }],
  [/United Parcel Service/i, { rubro: "Logística — Transporte y encomiendas", resumen: "Una de las mayores empresas de transporte y encomiendas a nivel global." }],
  [/Delta Air Lines/i, { rubro: "Aerolíneas", resumen: "Una de las principales aerolíneas de Estados Unidos por pasajeros transportados." }],
  [/American Airlines/i, { rubro: "Aerolíneas", resumen: "Una de las principales aerolíneas de Estados Unidos por flota y rutas operadas." }],
  [/Carnival Corporation/i, { rubro: "Turismo — Cruceros", resumen: "La mayor operadora de cruceros del mundo por cantidad de pasajeros." }],
  [/Ford Motor/i, { rubro: "Automotriz", resumen: "Fabricante estadounidense de vehículos, con creciente inversión en modelos eléctricos." }],
  [/General Motors/i, { rubro: "Automotriz", resumen: "Fabricante estadounidense de vehículos (Chevrolet, GMC, Cadillac), con foco creciente en eléctricos." }],
  [/Honda Motor/i, { rubro: "Automotriz — Japón", resumen: "Fabricante japonés de automóviles y motocicletas." }],
  [/Goodyear Tire/i, { rubro: "Industria — Neumáticos", resumen: "Fabricante estadounidense de neumáticos para automóviles y camiones." }],

  // --- Telecom ---
  [/AT&T/i, { rubro: "Telecomunicaciones", resumen: "Uno de los mayores operadores de telefonía móvil y banda ancha de Estados Unidos." }],
  [/Verizon/i, { rubro: "Telecomunicaciones", resumen: "Uno de los mayores operadores de telefonía móvil de Estados Unidos." }],
  [/América Móvil/i, { rubro: "Telecomunicaciones — América Latina", resumen: "Operador de telefonía móvil líder en la región bajo la marca Claro." }],

  // --- China / Asia ---
  [/^Baidu/i, { rubro: "Tecnología — China", resumen: "Buscador de internet líder en China, con desarrollos propios en inteligencia artificial." }],
  [/Alibaba Group/i, { rubro: "Comercio electrónico — China", resumen: "El mayor marketplace y una de las mayores plataformas de nube de China." }],
  [/^JD\.com/i, { rubro: "Comercio electrónico — China", resumen: "Uno de los principales marketplaces de comercio electrónico de China, con logística propia." }],
  [/Petróleo Brasileiro/i, { rubro: "Energía — Brasil", resumen: "Petrolera de mayoría estatal brasileña, una de las mayores productoras de petróleo de América Latina." }],

  // --- ETFs (por índice/sector que replican) ---
  [/S&P 500/i, { rubro: "ETF — Índice S&P 500", resumen: "Replica el desempeño de las 500 mayores empresas que cotizan en EE.UU.; el benchmark accionario más seguido del mundo." }],
  [/Total Stock Market/i, { rubro: "ETF — Mercado total de EE.UU.", resumen: "Replica prácticamente todo el mercado accionario estadounidense, de grandes a pequeñas capitalizaciones." }],
  [/Dow Jones Industrial Average/i, { rubro: "ETF — Índice Dow Jones", resumen: "Replica el Dow Jones, un índice de 30 grandes empresas industriales y de consumo de EE.UU." }],
  [/QQQ Trust|Nasdaq 100/i, { rubro: "ETF — Índice Nasdaq 100", resumen: "Replica el Nasdaq 100, con fuerte concentración en empresas tecnológicas de gran capitalización." }],
  [/ARK Innovation/i, { rubro: "ETF — Innovación disruptiva (gestión activa)", resumen: "Fondo de gestión activa enfocado en tecnología disruptiva: IA, genómica, vehículos autónomos y fintech." }],
  [/MSCI ACWI/i, { rubro: "ETF — Acciones globales", resumen: "Replica el índice MSCI All Country World: mercados desarrollados y emergentes combinados." }],
  [/MSCI Emerging Markets/i, { rubro: "ETF — Mercados emergentes", resumen: "Replica una canasta de acciones de mercados emergentes (China, India, Brasil, entre otros)." }],
  [/MSCI EAFE/i, { rubro: "ETF — Mercados desarrollados ex EE.UU.", resumen: "Replica mercados desarrollados fuera de Estados Unidos y Canadá (Europa, Australasia, Lejano Oriente)." }],
  [/China Large-Cap/i, { rubro: "ETF — Acciones chinas de gran capitalización", resumen: "Replica las mayores empresas chinas que cotizan en Hong Kong." }],
  [/Gold Miners/i, { rubro: "ETF — Mineras de oro", resumen: "Agrupa empresas mineras dedicadas a la extracción de oro a nivel global." }],
  [/Gold Shares/i, { rubro: "ETF — Oro físico", resumen: "Respaldado físicamente en lingotes de oro; sigue el precio spot del metal." }],
  [/Biotechnology/i, { rubro: "ETF — Biotecnología", resumen: "Agrupa empresas del sector biotecnológico y farmacéutico de EE.UU." }],
  [/Cybersecurity/i, { rubro: "ETF — Ciberseguridad", resumen: "Agrupa empresas dedicadas a software y servicios de ciberseguridad." }],
  [/Copper Miners/i, { rubro: "ETF — Mineras de cobre", resumen: "Agrupa empresas mineras dedicadas a la extracción de cobre a nivel global." }],
  [/Clean Energy/i, { rubro: "ETF — Energías limpias", resumen: "Agrupa empresas de energía solar, eólica y otras fuentes renovables a nivel global." }],
  [/MSCI Japan/i, { rubro: "ETF — Acciones de Japón", resumen: "Replica el mercado accionario japonés de gran y mediana capitalización." }],
  [/MSCI South Korea/i, { rubro: "ETF — Acciones de Corea del Sur", resumen: "Replica el mercado accionario surcoreano." }],
  [/MSCI Brazil/i, { rubro: "ETF — Acciones de Brasil", resumen: "Replica el mercado accionario brasileño de gran y mediana capitalización." }],
  [/ESG Aware/i, { rubro: "ETF — Grandes empresas de EE.UU. (criterios ESG)", resumen: "Grandes empresas de EE.UU. seleccionadas bajo criterios ambientales, sociales y de gobernanza (ESG)." }],

  // --- Acciones argentinas (Merval / BYMA) ---
  [/Grupo Financiero Galicia/i, { rubro: "Banca — Argentina", resumen: "Uno de los mayores bancos privados de capital nacional, con banca minorista, seguros y fintech (Naranja X)." }],
  [/^YPF/i, { rubro: "Energía — Argentina", resumen: "Petrolera de mayoría estatal, la principal productora de petróleo y gas del país, con foco creciente en Vaca Muerta." }],
  [/Pampa Energía/i, { rubro: "Energía — Argentina", resumen: "Generación eléctrica y producción de gas natural, con activos en varias cuencas del país." }],
  [/^Banco Macro/i, { rubro: "Banca — Argentina", resumen: "Uno de los principales bancos privados de capital nacional, con fuerte presencia en el interior del país." }],
  [/BBVA Argentina/i, { rubro: "Banca — Argentina", resumen: "Filial local del grupo español BBVA, con banca minorista y corporativa." }],
  [/Banco Hipotecario/i, { rubro: "Banca — Argentina", resumen: "Banco con foco histórico en crédito hipotecario, hoy con banca minorista más amplia." }],
  [/Banco Patagonia/i, { rubro: "Banca — Argentina", resumen: "Banco privado con fuerte presencia en la Patagonia y banca minorista y de agronegocios." }],
  [/Grupo Financiero Supervielle/i, { rubro: "Banca — Argentina", resumen: "Grupo financiero con banco, seguros, tarjetas y otros servicios financieros." }],
  [/Ternium Argentina/i, { rubro: "Industria — Siderurgia", resumen: "Producción de acero para la construcción y la industria, parte del grupo Techint." }],
  [/^Aluar/i, { rubro: "Industria — Aluminio", resumen: "Único productor de aluminio primario de Argentina, con planta en Puerto Madryn." }],
  [/^Cresud/i, { rubro: "Agroindustria y real estate rural", resumen: "Producción agropecuaria y desarrollo de tierras, con participación en IRSA." }],
  [/Central Puerto/i, { rubro: "Energía — Generación eléctrica", resumen: "Generación eléctrica térmica e hidroeléctrica, una de las mayores generadoras privadas del país." }],
  [/Transportadora de Gas del Sur/i, { rubro: "Energía — Transporte de gas", resumen: "Transporte de gas natural por gasoductos en el sur y centro del país." }],
  [/Transportadora de Gas del Norte/i, { rubro: "Energía — Transporte de gas", resumen: "Transporte de gas natural por gasoductos en el norte del país." }],
  [/Edenor/i, { rubro: "Energía — Distribución eléctrica", resumen: "Distribución de energía eléctrica en el norte y oeste del Gran Buenos Aires." }],
  [/^IRSA/i, { rubro: "Real estate — Argentina", resumen: "Desarrollo y administración de centros comerciales, oficinas y hoteles en el país." }],
  [/Loma Negra/i, { rubro: "Industria — Cemento", resumen: "Principal productora de cemento de Argentina, con plantas en varias provincias." }],
  [/^Transener/i, { rubro: "Energía — Transporte eléctrico", resumen: "Transporte de energía eléctrica de alta tensión a nivel nacional." }],
  [/MetroGAS/i, { rubro: "Energía — Distribución de gas", resumen: "Distribución de gas natural en la Ciudad de Buenos Aires y el sur del GBA." }],
  [/Telecom Argentina/i, { rubro: "Telecomunicaciones — Argentina", resumen: "Telefonía móvil, internet y TV por cable bajo las marcas Personal y Flow." }],
  [/Grupo Financiero Valores/i, { rubro: "Servicios financieros — Argentina", resumen: "Agente de bolsa y gestión de inversiones para clientes locales." }],
  [/Cablevisión Holding/i, { rubro: "Telecomunicaciones y medios — Argentina", resumen: "TV por cable, internet y medios de comunicación." }],
  [/^BYMA/i, { rubro: "Infraestructura de mercado", resumen: "Opera la Bolsa de Comercio y el mercado de valores de Argentina (Bolsas y Mercados Argentinos)." }],
  [/Molinos Río de la Plata/i, { rubro: "Consumo masivo — Alimentos", resumen: "Fabricante de alimentos envasados y aceites, con marcas de amplia distribución en el país." }],
  [/^Agrometal/i, { rubro: "Industria — Maquinaria agrícola", resumen: "Fabricación de maquinaria agrícola, principalmente sembradoras." }],
  [/Autopistas del Sol/i, { rubro: "Infraestructura — Concesión vial", resumen: "Concesionaria de autopistas de acceso norte del Gran Buenos Aires." }],
  [/^Capex/i, { rubro: "Energía — Generación e hidrocarburos", resumen: "Generación eléctrica y producción de hidrocarburos en la Cuenca Neuquina." }],
  [/^Mirgor/i, { rubro: "Industria — Electrónica y autopartes", resumen: "Ensamblaje de electrónica de consumo y fabricación de sistemas de climatización automotriz en Tierra del Fuego." }],
  [/^Ledesma/i, { rubro: "Agroindustria", resumen: "Producción de azúcar, papel y otros productos agroindustriales en el norte del país." }],
  [/Morixe Hermanos/i, { rubro: "Alimentos — Molienda", resumen: "Molienda de trigo y elaboración de productos alimenticios derivados." }],
  [/San Miguel A\.G\.I\.C\.I/i, { rubro: "Agroindustria — Cítricos", resumen: "Producción y exportación de limones y otros cítricos, una de las mayores del hemisferio sur." }],
  [/Laboratorios Richmond/i, { rubro: "Salud — Farmacéutica argentina", resumen: "Laboratorio farmacéutico argentino, con desarrollos propios incluyendo vacunas." }],
  [/Camuzzi Gas Pampeana/i, { rubro: "Energía — Distribución de gas", resumen: "Distribución de gas natural en la región pampeana." }],
  [/Distribuidora de Gas Cuyana/i, { rubro: "Energía — Distribución de gas", resumen: "Distribución de gas natural en la región de Cuyo." }],
  [/Gas Natural Ban/i, { rubro: "Energía — Distribución de gas", resumen: "Distribución de gas natural en el norte del Gran Buenos Aires." }],
  [/Inversora Juramento/i, { rubro: "Agroindustria — Norte argentino", resumen: "Producción agropecuaria en las provincias del norte argentino." }],
  [/^Longvie/i, { rubro: "Industria — Electrodomésticos", resumen: "Fabricación de electrodomésticos y artículos para el hogar." }],
  [/Celulosa Argentina/i, { rubro: "Industria — Celulosa y papel", resumen: "Producción de celulosa y papel a partir de forestación propia." }],
  [/Havanna Holding/i, { rubro: "Consumo — Gastronomía", resumen: "Marca icónica de alfajores y cafeterías con presencia en todo el país." }],
  [/^Grimoldi/i, { rubro: "Consumo — Calzado", resumen: "Fabricación y comercialización de calzado bajo marcas propias y licencias." }],
  [/^Boldt/i, { rubro: "Entretenimiento — Juegos de azar", resumen: "Operador de casinos y máquinas de juego en distintas provincias argentinas." }],
  [/Molinos Agro/i, { rubro: "Agroindustria — Granos", resumen: "Acopio, procesamiento y exportación de granos y subproductos agrícolas." }],
];

function cleanEquityName(nombre: string): string {
  return nombre
    .replace(/^CEDEAR\s+/i, "")
    .replace(/\s*\(liq\.[^)]*\)\s*/i, "")
    .trim();
}

export function getEquitySectorInfo(nombreCrudo: string): SectorInfo | null {
  const clean = cleanEquityName(nombreCrudo);
  for (const [re, info] of EQUITY_PATTERNS) {
    if (re.test(clean)) return info;
  }
  return null;
}

// ===== Bonos soberanos / Tesoro =====
export const BOND_INFO: Record<string, SectorInfo> = {
  AL30: { rubro: "Bono soberano en dólares — Ley Argentina", resumen: "Vence en 2030; surgió de la reestructuración de deuda de 2020. Paga renta y amortización en dólares bajo legislación local." },
  GD30: { rubro: "Bono soberano en dólares — Ley Nueva York", resumen: "Vence en 2030; contraparte del AL30 bajo legislación extranjera (Nueva York), generalmente con mayor demanda institucional." },
  AL35: { rubro: "Bono soberano en dólares — Ley Argentina", resumen: "Vence en 2035, con amortizaciones escalonadas en los últimos años de vida del bono." },
  GD35: { rubro: "Bono soberano en dólares — Ley Nueva York", resumen: "Vence en 2035; contraparte del AL35 bajo legislación de Nueva York." },
  AE38: { rubro: "Bono soberano en dólares — Ley Argentina", resumen: "Vence en 2038, con estructura de pagos ligada a la reestructuración 2020 (ex Discount)." },
  GD38: { rubro: "Bono soberano en dólares — Ley Nueva York", resumen: "Vence en 2038; contraparte del AE38 bajo legislación de Nueva York." },
  AL29: { rubro: "Bono soberano en dólares — Ley Argentina", resumen: "Vence en 2029; uno de los bonos reestructurados de menor duration dentro de la curva soberana." },
  GD29: { rubro: "Bono soberano en dólares — Ley Nueva York", resumen: "Vence en 2029; contraparte del AL29 bajo legislación de Nueva York." },
  AL41: { rubro: "Bono soberano en dólares — Ley Argentina", resumen: "Vence en 2041, con cupón escalonado ascendente; el de mayor plazo (duration) de la curva ley local." },
  GD41: { rubro: "Bono soberano en dólares — Ley Nueva York", resumen: "Vence en 2041; contraparte del AL41 bajo legislación de Nueva York." },
  T2X5: { rubro: "Letra del Tesoro en pesos — Cero cupón", resumen: "Se compra con descuento sobre su valor nominal y paga un único pago al vencimiento, sin cupones intermedios." },
};

// ===== Criptomonedas top globales (CoinGecko) =====
export const CRYPTO_INFO: Record<string, SectorInfo> = {
  bitcoin: { rubro: "Cripto — Reserva de valor digital", resumen: "La primera y mayor criptomoneda por capitalización; funciona como red de pagos descentralizada y activo de reserva digital con oferta fija de 21 millones de unidades." },
  ethereum: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Red descentralizada que ejecuta contratos inteligentes; base de la mayoría de las aplicaciones DeFi y tokens del ecosistema cripto." },
  tether: { rubro: "Cripto — Stablecoin dolarizada", resumen: "Stablecoin respaldada 1:1 en dólares (según su emisor); la más utilizada del mercado como refugio y medio de intercambio entre criptoactivos." },
  ripple: { rubro: "Cripto — Pagos internacionales", resumen: "Red diseñada para pagos transfronterizos rápidos y de bajo costo, usada por instituciones financieras." },
  binancecoin: { rubro: "Cripto — Token de exchange", resumen: "Token nativo de Binance, el mayor exchange de criptomonedas por volumen; se usa para pagar comisiones y como gas de su blockchain (BNB Chain)." },
  solana: { rubro: "Cripto — Plataforma de contratos inteligentes de alta velocidad", resumen: "Blockchain orientada a alta velocidad y bajo costo de transacción; muy usada en aplicaciones DeFi y NFTs." },
  "usd-coin": { rubro: "Cripto — Stablecoin dolarizada", resumen: "Stablecoin respaldada en dólares emitida por Circle, con foco en transparencia y reservas auditadas." },
  dogecoin: { rubro: "Cripto — Origen meme", resumen: "Surgida como parodia de Bitcoin en 2013, hoy es una de las criptomonedas más negociadas por su comunidad y adopción como medio de pago informal." },
  cardano: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Blockchain desarrollada con un enfoque académico y de revisión por pares (peer review), orientada a escalabilidad y sustentabilidad." },
  tron: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Red usada intensivamente para transferencias de stablecoins (especialmente USDT) por sus bajas comisiones." },
  "avalanche-2": { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Blockchain de alta velocidad orientada a finanzas descentralizadas y activos tokenizados mediante subredes personalizables." },
  chainlink: { rubro: "Cripto — Oráculos descentralizados", resumen: "Red de oráculos que conecta contratos inteligentes con datos del mundo real (precios, clima, eventos), clave para el funcionamiento de DeFi." },
  "shiba-inu": { rubro: "Cripto — Origen meme", resumen: "Token meme surgido como 'experimento comunitario' inspirado en Dogecoin, con ecosistema propio (exchange descentralizado, NFTs)." },
  sui: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Blockchain de alta velocidad diseñada por ex ingenieros de Meta, orientada a procesamiento paralelo de transacciones." },
  stellar: { rubro: "Cripto — Pagos internacionales", resumen: "Red diseñada para transferencias de dinero rápidas y económicas entre distintas monedas, con foco en inclusión financiera." },
  polkadot: { rubro: "Cripto — Interoperabilidad entre blockchains", resumen: "Diseñada para conectar múltiples blockchains especializadas ('parachains') que comparten seguridad entre sí." },
  "hedera-hashgraph": { rubro: "Cripto — Red empresarial", resumen: "Red de registro distribuido (no es una blockchain tradicional) orientada a casos de uso empresariales y gobernada por un consejo de grandes compañías." },
  litecoin: { rubro: "Cripto — Pagos", resumen: "Una de las primeras 'altcoins', creada como versión más rápida y liviana de Bitcoin para pagos cotidianos." },
  "bitcoin-cash": { rubro: "Cripto — Pagos", resumen: "Surgió de una bifurcación (fork) de Bitcoin en 2017 para priorizar bloques más grandes y transacciones más baratas." },
  toncoin: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Blockchain originalmente desarrollada por el equipo de Telegram, integrada hoy a esa app de mensajería para pagos y mini-apps." },
  near: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Blockchain orientada a facilidad de uso para desarrolladores, con foco en escalabilidad mediante fragmentación (sharding)." },
  uniswap: { rubro: "Cripto — Exchange descentralizado (DeFi)", resumen: "Token de gobernanza del mayor exchange descentralizado (DEX), donde se intercambian criptoactivos sin intermediarios." },
  dai: { rubro: "Cripto — Stablecoin descentralizada", resumen: "Stablecoin dolarizada generada mediante contratos inteligentes y respaldada por otros criptoactivos en garantía, sin emisor centralizado." },
  aptos: { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Blockchain de alta velocidad desarrollada por ex ingenieros del proyecto Diem de Meta, orientada a seguridad y escalabilidad." },
  "internet-computer": { rubro: "Cripto — Infraestructura descentralizada", resumen: "Busca hospedar aplicaciones y sitios web completos directamente 'on-chain', sin depender de servidores tradicionales en la nube." },
  pepe: { rubro: "Cripto — Origen meme", resumen: "Token meme inspirado en el personaje de internet Pepe the Frog, sin caso de uso más allá de la especulación y su comunidad." },
  monero: { rubro: "Cripto — Privacidad", resumen: "Criptomoneda orientada a la privacidad: oculta montos, remitente y destinatario de cada transacción por diseño." },
  "ethereum-classic": { rubro: "Cripto — Plataforma de contratos inteligentes", resumen: "Continuación de la cadena original de Ethereum tras la bifurcación de 2016; mantiene el principio de inmutabilidad estricta." },
  cosmos: { rubro: "Cripto — Interoperabilidad entre blockchains", resumen: "Ecosistema de blockchains independientes ('zonas') interconectadas mediante el protocolo IBC, pensado como 'internet de blockchains'." },
  arbitrum: { rubro: "Cripto — Escalado de Ethereum (Layer 2)", resumen: "Red de 'capa 2' que procesa transacciones fuera de Ethereum para reducir costos y tiempos, liquidando luego en su blockchain principal." },
};

// ===== Divisas (dolarapi.com) =====
export const DIVISA_INFO: Record<string, SectorInfo & RegulacionInfo> = {
  oficial: {
    rubro: "Divisas — Dólar oficial",
    resumen: "Tipo de cambio fijado por el BCRA; es el de referencia para el comercio exterior y las transacciones formales del país.",
    supervision: "Banco Central de la República Argentina (BCRA)",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  blue: {
    rubro: "Divisas — Dólar informal",
    resumen: "Cotización del mercado informal o 'cuevas', sin regulación oficial ni curso legal; refleja la demanda de dólares fuera del sistema formal.",
    supervision: "Mercado informal — sin regulación oficial ni supervisión de BCRA/CNV",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  bolsa: {
    rubro: "Divisas — Dólar MEP (Bolsa)",
    resumen: "Se obtiene comprando un bono o CEDEAR en pesos y vendiéndolo en dólares dentro del mercado local; es 100% legal y no requiere operar en el exterior.",
    supervision: "Comisión Nacional de Valores (CNV) — operatoria bursátil en BYMA",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  contadoconliqui: {
    rubro: "Divisas — Dólar Contado con Liquidación (CCL)",
    resumen: "Similar al MEP, pero la venta del activo se liquida en el exterior; se usa habitualmente para girar divisas fuera del país de forma legal.",
    supervision: "Comisión Nacional de Valores (CNV) — operatoria bursátil con liquidación en el exterior",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  mayorista: {
    rubro: "Divisas — Dólar mayorista",
    resumen: "Tipo de cambio del Mercado Único y Libre de Cambios (MULC), utilizado por el comercio exterior y como referencia de política cambiaria del BCRA.",
    supervision: "Banco Central de la República Argentina (BCRA) — Mercado Único y Libre de Cambios (MULC)",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  cripto: {
    rubro: "Divisas — Dólar cripto",
    resumen: "Precio implícito del dólar obtenido comprando y vendiendo stablecoins dolarizadas en exchanges de criptoactivos.",
    supervision: "Exchanges de criptoactivos — cotización de mercado, sin supervisión directa de BCRA/CNV",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  tarjeta: {
    rubro: "Divisas — Dólar tarjeta",
    resumen: "Dólar oficial más las percepciones impositivas vigentes (a cuenta de Ganancias/Bienes Personales); es el que se paga en consumos con tarjeta en el exterior o en dólares.",
    supervision: "BCRA (tipo de cambio base) + AFIP (percepciones impositivas)",
    moneda: "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
  },
  "eur-oficial": {
    rubro: "Divisas — Euro oficial",
    resumen: "Cotización oficial del euro fijada por el BCRA, tomando como base el tipo de cambio oficial del dólar y su cruce internacional contra el euro.",
    supervision: "Banco Central de la República Argentina (BCRA)",
    moneda: "Pesos Argentinos (ARS) por cada Euro (EUR)",
  },
  "brl-oficial": {
    rubro: "Divisas — Real brasileño oficial",
    resumen: "Cotización oficial del real brasileño fijada por el BCRA; referencia clave para el comercio bilateral con Brasil, principal socio del Mercosur.",
    supervision: "Banco Central de la República Argentina (BCRA)",
    moneda: "Pesos Argentinos (ARS) por cada Real Brasileño (BRL)",
  },
};
