const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak
} = require('docx');

const NPM_GLOBAL = 'C:\\Users\\beltr\\AppData\\Roaming\\npm\\node_modules';
process.env.NODE_PATH = NPM_GLOBAL;
require('module').Module._initPaths();

const BLUE = "1F4E79";
const TEAL = "2E8B8B";
const GRAY = "595959";
const LIGHT = "EAF1F8";

const border = { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, color: BLUE })],
    spacing: { before: 360, after: 200 },
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, color: TEAL })],
    spacing: { before: 240, after: 140 },
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, color: GRAY })],
    spacing: { before: 180, after: 100 },
  });
}
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, ...opts })],
  });
}
function PR(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    children: runs,
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80, line: 300 },
    children: [new TextRun(text)],
  });
}
function bulletR(runs) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80, line: 300 },
    children: runs,
  });
}
function code(text) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    shading: { fill: "F4F4F4", type: ShadingType.CLEAR },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
    },
    children: [new TextRun({ text, font: "Consolas", size: 20 })],
  });
}

function headerCell(text, width) {
  return new TableCell({
    borders: cellBorders,
    margins: cellMargins,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: LIGHT, type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: BLUE })] })],
  });
}
function dataCell(text, width, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    margins: cellMargins,
    width: { size: width, type: WidthType.DXA },
    children: [new Paragraph({ children: [new TextRun({ text, font: opts.mono ? "Consolas" : undefined, size: opts.mono ? 20 : undefined })] })],
  });
}

const tableWidth = 9360;

const oscTableCols = [1320, 2160, 1320, 4560];
const oscTable = new Table({
  width: { size: tableWidth, type: WidthType.DXA },
  columnWidths: oscTableCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Índice", oscTableCols[0]),
        headerCell("Dirección Unreal", oscTableCols[1]),
        headerCell("Rango", oscTableCols[2]),
        headerCell("Significado", oscTableCols[3]),
      ],
    }),
    new TableRow({ children: [
      dataCell("13", oscTableCols[0], { mono: true }),
      dataCell("muse/data14", oscTableCols[1], { mono: true }),
      dataCell("0.0 – 1.0", oscTableCols[2], { mono: true }),
      dataCell("Calm Score (estado de calma normalizado)", oscTableCols[3]),
    ]}),
    new TableRow({ children: [
      dataCell("15", oscTableCols[0], { mono: true }),
      dataCell("muse/data16", oscTableCols[1], { mono: true }),
      dataCell("0.0 – 1.0", oscTableCols[2], { mono: true }),
      dataCell("Progreso de calibración (1.0 al completar)", oscTableCols[3]),
    ]}),
    new TableRow({ children: [
      dataCell("16", oscTableCols[0], { mono: true }),
      dataCell("muse/data17", oscTableCols[1], { mono: true }),
      dataCell("0.0 / 1.0", oscTableCols[2], { mono: true }),
      dataCell("BT Conectado (1.0 si la diadema está enlazada)", oscTableCols[3]),
    ]}),
    new TableRow({ children: [
      dataCell("17", oscTableCols[0], { mono: true }),
      dataCell("muse/data18", oscTableCols[1], { mono: true }),
      dataCell("0.0 / 1.0", oscTableCols[2], { mono: true }),
      dataCell("BT Desconectado (complemento de idx 16)", oscTableCols[3]),
    ]}),
  ],
});

const pipelineCols = [1800, 3000, 4560];
const pipelineTable = new Table({
  width: { size: tableWidth, type: WidthType.DXA },
  columnWidths: pipelineCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Etapa", pipelineCols[0]),
        headerCell("Operación", pipelineCols[1]),
        headerCell("Propósito", pipelineCols[2]),
      ],
    }),
    new TableRow({ children: [
      dataCell("1. Captura", pipelineCols[0]),
      dataCell("Suscripción a eegReadings, gyroscopeData y accelerometerData de Muse 2 vía Web Bluetooth (muse-js).", pipelineCols[1]),
      dataCell("Adquirir señal cruda EEG e inerciales del usuario.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("2. Pre-proceso", pipelineCols[0]),
      dataCell("Cálculo de potencia promedio absoluta por ventana de muestras y suavizado EMA por banda.", pipelineCols[1]),
      dataCell("Reducir ruido de alta frecuencia y obtener indicadores estables de actividad EEG.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("3. Ratio", pipelineCols[0]),
      dataCell("ratio = α / (β + 0.4·γ + 0.001)", pipelineCols[1]),
      dataCell("Indicador instantáneo de relajación con penalización por tensión muscular.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("4. Calibración", pipelineCols[0]),
      dataCell("1800 muestras (~28.8 s a 60Hz) → media y desviación estándar personales.", pipelineCols[1]),
      dataCell("Establecer un baseline individual antes de medir.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("5. Z-Score", pipelineCols[0]),
      dataCell("z = (ratio − μ) / σ, recortado a [−2, +2] y mapeado linealmente a [0, 1].", pipelineCols[1]),
      dataCell("Convertir el ratio a una métrica relativa a la propia persona.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("6. Suavizado", pipelineCols[0]),
      dataCell("Media móvil sobre 180 muestras (~2.9 s).", pipelineCols[1]),
      dataCell("Estabilizar la salida visual y eliminar parpadeos.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("7. Artefactos", pipelineCols[0]),
      dataCell("Si γ > 0.8 (mordida/EMG) → Calm = 0.0.", pipelineCols[1]),
      dataCell("Evitar falsos positivos por tensión mandibular o movimiento.", pipelineCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("8. Acumulado", pipelineCols[0]),
      dataCell("calmFinal = ticks_calmos / ticks_totales (umbral > 0.7).", pipelineCols[1]),
      dataCell("Métrica global de la sesión, útil para resumen final.", pipelineCols[2]),
    ]}),
  ],
});

const paramsCols = [3000, 1800, 4560];
const paramsTable = new Table({
  width: { size: tableWidth, type: WidthType.DXA },
  columnWidths: paramsCols,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Parámetro", paramsCols[0]),
        headerCell("Valor", paramsCols[1]),
        headerCell("Justificación", paramsCols[2]),
      ],
    }),
    new TableRow({ children: [
      dataCell("Frecuencia del loop de algoritmos", paramsCols[0]),
      dataCell("16 ms (~60 Hz)", paramsCols[1], { mono: true }),
      dataCell("Tasa visual estándar; coincide con motor gráfico.", paramsCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("Muestras de calibración", paramsCols[0]),
      dataCell("1800 (~28.8 s)", paramsCols[1], { mono: true }),
      dataCell("Suficiente para una distribución estable del baseline.", paramsCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("Ventana de media móvil", paramsCols[0]),
      dataCell("180 (~2.9 s)", paramsCols[1], { mono: true }),
      dataCell("Compromiso entre respuesta y estabilidad visual.", paramsCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("Recorte de Z-Score", paramsCols[0]),
      dataCell("[−2, +2]", paramsCols[1], { mono: true }),
      dataCell("Cubre ~95% de la distribución normal; descarta outliers.", paramsCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("Umbral de \"calma\"", paramsCols[0]),
      dataCell("calmScore > 0.7", paramsCols[1], { mono: true }),
      dataCell("Define cuándo cuenta como \"tick calmo\" en el acumulado.", paramsCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("Umbral de artefacto EMG (γ)", paramsCols[0]),
      dataCell("> 0.8", paramsCols[1], { mono: true }),
      dataCell("Detecta mordida/tensión mandibular y descarta el tick.", paramsCols[2]),
    ]}),
    new TableRow({ children: [
      dataCell("EMA dinámico (alfa)", paramsCols[0]),
      dataCell("0.05 / 0.01", paramsCols[1], { mono: true }),
      dataCell("Más suavizado cuando hay movimiento del acelerómetro (>1.2g).", paramsCols[2]),
    ]}),
  ],
});

const visualCols = [2400, 6960];
const visualTable = new Table({
  width: { size: tableWidth, type: WidthType.DXA },
  columnWidths: visualCols,
  rows: [
    new TableRow({ tableHeader: true, children: [
      headerCell("Estado", visualCols[0]),
      headerCell("Condición y respuesta visual", visualCols[1]),
    ]}),
    new TableRow({ children: [
      dataCell("CALMA PROFUNDA", visualCols[0]),
      dataCell("calmScore > 0.7  →  aura cyan, escala 1.3, blur 70 px, animación 6 s.", visualCols[1]),
    ]}),
    new TableRow({ children: [
      dataCell("SINTONIZANDO", visualCols[0]),
      dataCell("0.3 ≤ calmScore ≤ 0.7  →  aura neutra, escala 1.0, animación 4 s.", visualCols[1]),
    ]}),
    new TableRow({ children: [
      dataCell("TENSIÓN BÁSICA", visualCols[0]),
      dataCell("calmScore < 0.3  →  aura roja, escala 0.85, blur 25 px, animación 1.5 s.", visualCols[1]),
    ]}),
  ],
});

const doc = new Document({
  creator: "Alma Digital Studio",
  title: "Soul Charger — Análisis de Datos",
  description: "Documento técnico de análisis de datos biométricos para presentación.",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Calibri", color: BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Calibri", color: TEAL },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Calibri", color: GRAY },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Soul Charger · Análisis de Datos", color: GRAY, size: 18 })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79", space: 4 } },
        }),
      ]}),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Alma Digital Studio   ·   Página ", color: GRAY, size: 18 }),
            new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18 }),
            new TextRun({ text: " de ", color: GRAY, size: 18 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18 }),
          ],
        }),
      ]}),
    },
    children: [
      // ── PORTADA ────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 200 },
        children: [new TextRun({ text: "SOUL CHARGER", bold: true, size: 56, color: BLUE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: "Análisis de datos biométricos en tiempo real", size: 28, color: TEAL })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Documento técnico de referencia", italics: true, color: GRAY, size: 22 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        children: [new TextRun({ text: "Alma Digital Studio", bold: true, color: GRAY, size: 22 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Mayo 2026", color: GRAY, size: 20 })],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. RESUMEN EJECUTIVO ──────────────────────────────
      H1("1. Resumen ejecutivo"),
      P("Soul Charger es una aplicación de biorretroalimentación que conecta una diadema EEG comercial (Muse 2) con un motor gráfico en tiempo real (Unreal Engine) para traducir el estado mental del usuario en una experiencia visual interactiva. La métrica central que se entrega al motor gráfico es el Calm Score: un valor continuo entre 0.0 y 1.0 que estima el grado de calma del usuario respecto de su propio baseline."),
      P("La cadena de valor del sistema es: diadema Muse 2 → navegador web (Web Bluetooth) → servidor de relay Node.js → Unreal Engine (vía OSC sobre UDP). El procesamiento de datos ocurre en el navegador a una tasa de aproximadamente 60 Hz (16 ms por iteración), garantizando latencia visual imperceptible."),
      P("Este documento describe, paso a paso, cómo se capturan, transforman y analizan los datos biométricos para producir el Calm Score y el resto de la telemetría que consume Unreal Engine."),

      // ── 2. ARQUITECTURA ────────────────────────────────────
      H1("2. Arquitectura del sistema"),
      P("El sistema se compone de tres capas claramente separadas, cada una con una responsabilidad acotada:"),
      bulletR([
        new TextRun({ text: "Capa de adquisición (Frontend web): ", bold: true }),
        new TextRun("captura los datos crudos de la diadema Muse 2 mediante Web Bluetooth, ejecuta el algoritmo de Calm Score y entrega telemetría estructurada por WebSocket."),
      ]),
      bulletR([
        new TextRun({ text: "Capa de relay (Backend Node.js): ", bold: true }),
        new TextRun("recibe el JSON desde el navegador, valida los valores y reenvía la telemetría como mensajes OSC sobre UDP a la IP/puerto configurados (típicamente Unreal en 127.0.0.1:8000)."),
      ]),
      bulletR([
        new TextRun({ text: "Capa de consumo (Unreal Engine): ", bold: true }),
        new TextRun("recibe el arreglo OSC y lo interpreta para alimentar shaders, partículas, cámaras y demás elementos del motor gráfico."),
      ]),
      P("Cada panel de admin (P1/P2) abre su propio puerto UDP, lo que permite que dos personas con su propia diadema operen simultáneamente sin interferir entre sí."),

      // ── 3. FUENTES DE DATOS ────────────────────────────────
      H1("3. Fuentes de datos: la diadema Muse 2"),
      P("La diadema Muse 2 es un dispositivo de neurotecnología comercial que expone tres flujos de datos simultáneos a través de Bluetooth Low Energy (BLE):"),
      bulletR([
        new TextRun({ text: "EEG: ", bold: true }),
        new TextRun("cuatro electrodos secos (TP9, AF7, AF8, TP10) que capturan actividad eléctrica cerebral a 256 Hz."),
      ]),
      bulletR([
        new TextRun({ text: "Giroscopio: ", bold: true }),
        new TextRun("vectores de velocidad angular X/Y/Z (movimiento de cabeza)."),
      ]),
      bulletR([
        new TextRun({ text: "Acelerómetro: ", bold: true }),
        new TextRun("aceleración lineal X/Y/Z (postura e impactos)."),
      ]),
      P("La conexión se establece con la librería muse-js sobre la API Web Bluetooth de Chrome, lo que evita tener que escribir un driver nativo y permite operar el sistema desde cualquier máquina con un navegador moderno."),

      // ── 4. PIPELINE ────────────────────────────────────────
      H1("4. Pipeline de análisis de datos"),
      P("El siguiente cuadro resume las etapas del pipeline. Cada etapa se detalla en la sección 5."),
      pipelineTable,

      // ── 5. ALGORITMO ───────────────────────────────────────
      H1("5. Algoritmo \"Calm Score\""),
      P("El Calm Score es la métrica clave del sistema. Su construcción combina prácticas estándar del análisis de bioseñales: ratio entre bandas EEG, normalización por baseline personal, suavizado temporal y rechazo de artefactos."),

      H2("5.1 Cálculo del ratio Alpha/Beta"),
      P("Sobre los indicadores de banda derivados de la señal EEG cruda, se calcula un ratio instantáneo:"),
      code("ratio = α / (β + 0.4 · γ + 0.001)"),
      P("La interpretación es directa: cuando aumenta la actividad asociada a relajación (α) y disminuye la asociada a esfuerzo cognitivo o tensión (β, γ), el ratio crece. El término gamma penalizado actúa como filtro de tensión muscular (EMG); el +0.001 evita división entre cero."),

      H2("5.2 Calibración: baseline personal"),
      P("Cada usuario tiene un perfil EEG distinto, por lo que el sistema NO usa umbrales absolutos. Antes de la sesión productiva, se ejecuta una fase de calibración que captura la distribución estadística natural del ratio para esa persona:"),
      bullet("Se acumulan 1800 muestras (≈ 28.8 s a 60 Hz) con la diadema correctamente colocada."),
      bullet("Se calcula la media (μ) y la desviación estándar (σ) del ratio durante esa ventana."),
      bullet("σ se acota a un mínimo de 0.0001 para evitar inestabilidades numéricas."),
      P("Estos dos valores (μ, σ) son el baseline personal del usuario y se utilizan durante el resto de la sesión."),

      H2("5.3 Normalización Z-Score"),
      P("Durante la sesión, cada ratio instantáneo se transforma en una distancia estandarizada al baseline:"),
      code("z = (ratio − μ) / σ\nz = clamp(z, −2.0, +2.0)\ncalm = (z + 2.0) / 4.0"),
      P("El recorte a ±2σ cubre aproximadamente el 95 % de la distribución normal y descarta outliers extremos. El mapeo lineal final entrega un valor en [0.0, 1.0] que es directamente consumible por shaders y curvas de animación de Unreal."),

      H2("5.4 Suavizado por media móvil"),
      P("Para evitar parpadeos visuales causados por la varianza natural del EEG, el calm normalizado se promedia sobre una ventana móvil de 180 muestras (≈ 2.9 s):"),
      code("smoothedCalm = mean(últimas 180 muestras de calm)"),
      P("El tamaño de la ventana es un compromiso explícito entre responsividad (ventana corta) y estabilidad visual (ventana larga). Se eligió ~3 s porque es la escala temporal natural de los cambios de estado emocional perceptibles."),

      H2("5.5 Detección y rechazo de artefactos (EMG)"),
      P("La señal EEG es vulnerable a ruido proveniente de actividad muscular cercana al cráneo, especialmente la mordida y la tensión mandibular. El sistema implementa una salvaguarda explícita:"),
      bullet("Cuando la potencia promedio de la señal supera ~400 µV, el indicador γ se eleva a 1.0."),
      bullet("Si γ > 0.8, el Calm Score del tick se fuerza a 0.0 y la UI advierte \"Ruido detectado\"."),
      bullet("La calibración descarta automáticamente las muestras con artefacto, pero ya no se reinicia (tolera setups dinámicos)."),

      H2("5.6 Métrica acumulada de sesión (Calm Final)"),
      P("Además del Calm Score instantáneo, se calcula una métrica global de toda la sesión:"),
      code("calmFinal = ticks_con_calm > 0.7  /  ticks_totales"),
      P("Este valor (también en [0, 1]) representa la fracción del tiempo total que el usuario pasó en estado de calma profunda y se utiliza típicamente como score final de la experiencia."),

      // ── 6. PARÁMETROS ──────────────────────────────────────
      H1("6. Parámetros del algoritmo"),
      P("Estos son los hiperparámetros configurables del sistema y la justificación de los valores actuales:"),
      paramsTable,

      // ── 7. SALIDA ──────────────────────────────────────────
      H1("7. Salida hacia Unreal Engine (OSC)"),
      P("La telemetría se entrega a Unreal Engine en un único mensaje OSC bajo la dirección /muse/data, con un arreglo monolítico de 18 floats. Esta longitud es contractual: cualquier alteración rompe el Blueprint del motor gráfico (Get OSC Message Float At Index)."),
      P("Actualmente solo cuatro índices llevan información activa; el resto se envía como 0.0 para mantener la compatibilidad estructural sin saturar la red:"),
      oscTable,
      P("El ratio detrás de esta decisión es minimizar el ancho de banda y la complejidad del lado del motor gráfico: Unreal solo necesita un valor (Calm Score) para alimentar todo el sistema visual; los demás campos son metadatos de estado."),

      // ── 8. RESPUESTA VISUAL ────────────────────────────────
      H1("8. Mapeo a respuesta visual"),
      P("El Calm Score se traduce en tres estados visuales discretos a nivel de UI (la respuesta de Unreal opera sobre el valor continuo, no sobre estos estados)."),
      visualTable,

      // ── 9. ROBUSTEZ ────────────────────────────────────────
      H1("9. Robustez y manejo de errores"),
      H3("NaN Shield (Backend)"),
      P("JavaScript propaga divisiones inválidas como NaN, que al pasar por JSON se convierten en null y rompen los listeners OSC en Unreal. El backend mantiene un diccionario lastValidValues por cliente: cualquier valor nulo o NaN entrante es reemplazado por el último valor válido conocido. Esto produce una interpolación natural durante micro-cortes de Bluetooth en lugar de saltos a cero."),
      H3("Watchdog de actividad"),
      P("Si el listener de eegReadings deja de recibir paquetes durante 800 ms, el flag sensorActive cae a 0. Esto permite que la capa visual indique \"casco inactivo\" sin esperar al timeout completo de la conexión BLE."),
      H3("Aislamiento por cliente"),
      P("Cada conexión WebSocket abre su propio puerto UDP de salida, con su propia configuración IP/puerto y su propio diccionario de valores válidos. Esto permite operar con múltiples participantes (P1, P2…) en paralelo sin interferencia cruzada."),
      H3("Suavizado adaptativo por movimiento"),
      P("Si la magnitud del acelerómetro supera 1.2 g (movimiento brusco), el factor de EMA del canal alpha se reduce de 0.05 a 0.01, aplicando más filtrado durante movimiento intenso para evitar que el ruido inercial contamine el Calm Score."),

      // ── 10. CONSIDERACIONES ────────────────────────────────
      H1("10. Consideraciones metodológicas"),
      bulletR([
        new TextRun({ text: "Métrica relativa, no absoluta: ", bold: true }),
        new TextRun("el Calm Score mide calma respecto del propio baseline del usuario calibrado al inicio de la sesión. No es comparable directamente entre dos personas distintas ni entre dos sesiones del mismo usuario."),
      ]),
      bulletR([
        new TextRun({ text: "Uso experiencial, no clínico: ", bold: true }),
        new TextRun("el sistema está diseñado para experiencias artísticas e interactivas. No constituye un diagnóstico ni una herramienta médica."),
      ]),
      bulletR([
        new TextRun({ text: "Latencia: ", bold: true }),
        new TextRun("la cadena completa (BLE → Web → WS → UDP → Unreal) opera en orden de decenas de milisegundos. El suavizado de 2.9 s domina la latencia perceptible."),
      ]),
      bulletR([
        new TextRun({ text: "Privacidad: ", bold: true }),
        new TextRun("la telemetría EEG cruda no abandona la máquina local salvo por la opción Firebase (deshabilitada por defecto). El relay OSC opera sobre la red local del evento."),
      ]),

      // ── 11. GLOSARIO ───────────────────────────────────────
      H1("11. Glosario"),
      bulletR([new TextRun({ text: "EEG: ", bold: true }), new TextRun("electroencefalografía, registro de actividad eléctrica cerebral.")]),
      bulletR([new TextRun({ text: "EMG: ", bold: true }), new TextRun("electromiografía, ruido proveniente de actividad muscular (mordida, tensión).")]),
      bulletR([new TextRun({ text: "Banda Alpha (8–12 Hz): ", bold: true }), new TextRun("asociada a relajación con ojos cerrados.")]),
      bulletR([new TextRun({ text: "Banda Beta (13–30 Hz): ", bold: true }), new TextRun("asociada a atención y procesamiento cognitivo.")]),
      bulletR([new TextRun({ text: "Z-Score: ", bold: true }), new TextRun("número de desviaciones estándar respecto a la media; estandariza un valor a su distribución personal.")]),
      bulletR([new TextRun({ text: "EMA: ", bold: true }), new TextRun("Exponential Moving Average; suavizado de baja latencia que pondera valores recientes.")]),
      bulletR([new TextRun({ text: "OSC: ", bold: true }), new TextRun("Open Sound Control, protocolo estándar para telemetría en tiempo real entre aplicaciones creativas.")]),
      bulletR([new TextRun({ text: "Baseline: ", bold: true }), new TextRun("línea base personal capturada en calibración (μ y σ del ratio).")]),
    ],
  }],
});

const outPath = path.join(__dirname, "Soul_Charger_Analisis_de_Datos.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("OK ->", outPath);
});
