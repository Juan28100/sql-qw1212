# SQL: Pasillos de datos

Juego educativo local, en primera persona, para niñas y niños de 6 a 8 años. Está hecho con Three.js, JavaScript y Electron. No publica ni sube el juego a un hosting.

## Qué incluye

- Un pasillo liminal amable: papel tapiz amarillo, moqueta, fluorescentes con cambios muy suaves y tablas de datos visibles en carteles 3D. No hay enemigos ni persecuciones.
- Cámara de ratón suavizada, movimiento WASD/flechas y botones grandes en pantalla. Pulsa `Esc` para salir del modo de ratón bloqueado.
- Tres niveles, siempre en este orden: `SELECT` y `WHERE`; `ORDER BY`; y `INNER JOIN` entre `amigos` y `mascotas`.
- Un motor didáctico simulado. No se conecta a una base de datos: interpreta una gramática pequeña y solo acepta las tablas y formas de consulta del nivel actual.
- El botón **Ver una pista** coloca una consulta de ejemplo válida; **Probar consulta** muestra el resultado y una respuesta amable.

## Estructura

```text
sql-backrooms-3d/
├── electron.cjs                # Ventana local de Electron
├── index.html                   # Interfaz en español
├── package.json                 # Dependencias, scripts y destinos Windows
├── vite.config.js               # Compilación del juego web
├── scripts/
│   └── build-config.test.js     # Prueba de los nombres de artefactos
└── src/
    ├── levels.js                # Misiones, ejemplos y datos que aparecen en 3D
    ├── main.js                   # Escena Three.js, controles y progresión
    ├── sql-engine.js             # Motor SQL simulado y limitado por nivel
    ├── sql-engine.test.js        # Pruebas automáticas de las consultas
    └── style.css                 # Interfaz adaptable
```

## Ejecutar localmente

Instala Node.js LTS y, dentro de esta carpeta, ejecuta:

```bash
npm install
npm run dev
```

Se abrirá una ventana de escritorio. Para compilar los recursos sin abrir Electron: `npm run build`. Ejecuta todas las pruebas con `npm test` o solo las del motor SQL con `npm run test:sql`.

## Generar los ejecutables para Windows

En Windows, abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
npm run dist:win
```

En `release/` se crean dos archivos con nombres distintos:

- `SQL-Pasillos-3D-1.0.0-x64-Instalador.exe`: instalador NSIS. Presenta un asistente de instalación y puede crear accesos directos.
- `SQL-Pasillos-3D-1.0.0-x64-Portable.exe`: aplicación portable, sin instalación. Al abrirla, extrae temporalmente los archivos necesarios y ejecuta el juego.

Los nombres incluyen versión y arquitectura; `1.0.0` y `x64` son los valores actuales de este proyecto. Para compilar únicamente el portable: `npm run dist:portable`. En Linux, generar el instalador NSIS requiere Wine; por eso se recomienda ejecutar `npm run dist:win` en Windows. La versión portable puede compilarse por separado.

## Consultas objetivo (todas válidas)

1. `SELECT nombre FROM frutas WHERE color = 'amarillo';`
2. `SELECT nombre FROM juguetes ORDER BY estrellas ASC;`
3. `SELECT amigos.nombre, mascotas.animal FROM amigos INNER JOIN mascotas ON amigos.id = mascotas.amigo_id;`

Las consultas se ejecutan solo sobre datos locales de demostración. No se usa ni instala un servidor SQL.
