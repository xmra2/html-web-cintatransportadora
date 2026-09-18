# Simulador de Clasificación de Tapitas por Color

Simulador 3D interactivo de una máquina industrial automatizada que clasifica tapitas plásticas por color (rojo, verde, azul) mediante un sistema de cinta transportadora, sensor óptico y barras desviadoras accionadas por servomotor.

Construido con **Three.js** puro (sin frameworks), corre completo en el navegador.

## 🎬 Demo

Abrir `index.html` en un navegador moderno (o servirlo con cualquier servidor estático). No requiere build ni instalación de dependencias — Three.js se carga por CDN vía `importmap`.

## ⚙️ Cómo funciona

1. **Entrada** — las tapitas ingresan en cola, de a una.
2. **Mini túnel separador** — un canal que garantiza fila única (una tapita a la vez) antes de llegar al sensor.
3. **Cinta principal** — transporta las tapitas hacia la zona de clasificación.
4. **Sensor de color** — detecta el color de cada tapita al pasar.
5. **Barras desviadoras** — accionadas por servomotor, giran ~45° y empujan físicamente la tapita hacia su carril correspondiente (nunca se teletransporta ni desaparece).
6. **Cintas secundarias** — una por color, llevan la tapita hasta su recipiente.
7. **Recipientes** — acumulan las tapitas caídas de forma persistente y visible.

## ✨ Características

- Simulación física real: las tapitas recorren todo el sistema, colisionan con las barras y caen por gravedad dentro de los recipientes.
- Máquina de estados por tapita (`WAITING → IN_FEED_TUNNEL → ON_MAIN_BELT → COLOR_DETECTED → MOVING_TO_SORTER → DIVERTING → ON_COLOR_BELT → LEAVING_BELT → FALLING → IN_CONTAINER`).
- Panel de control: iniciar/pausar, reiniciar, velocidad de cinta ajustable en caliente, alimentación manual o automática.
- Indicadores visuales: sensor con LED de color, servomotores con luz de actividad, banda de cinta animada.
- Modelos 3D con detalle mecánico: motores, rodillos, estructura metálica, tapitas con material plástico realista.
- Arquitectura modular pensada para escalar: agregar un color nuevo, un destino nuevo o un sensor nuevo es una entrada de configuración, no una reescritura.

## 🧱 Estructura del proyecto
    index.html
    css/style.css
    js/
    config/ # colores, dimensiones y estados — única fuente de verdad
    core/ # cámara, luces, render loop
    entities/ # la tapita como objeto 3D
    machine/ # cintas, túnel, sensor, barras, recipientes
    systems/ # lógica de simulación (cola, movimiento, clasificación)
    utils/ # curvas de carril, colisión de barras, apilado en recipientes

## 🛠️ Tecnologías

- Three.js (renderizado 3D, sombras, materiales físicos)
- JavaScript (ES Modules) — sin build step
- HTML / CSS

## 🚀 Próximos pasos posibles

- Marketplace de materiales/tapitas (base ya prevista en la arquitectura)
- Nuevos colores y destinos
- Nuevos tipos de sensor o mecanismo de desvío
- Panel de estadísticas históricas