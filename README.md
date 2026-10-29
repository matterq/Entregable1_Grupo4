# Sistema de Gestión de Usuarios y Mascotas

## 1. Descripción del proyecto

Aplicación web desarrollada con Node.js y Express que permite administrar usuarios y mascotas mediante una API REST.

El sistema implementa las operaciones CRUD (Crear, Consultar, Actualizar y Eliminar), utilizando archivos JSON para almacenar la información y Multer para gestionar la carga de imágenes.

Además, incluye una interfaz web desarrollada con HTML, CSS y JavaScript que permite interactuar con el backend directamente desde el navegador.

## 2. Tecnologías utilizadas

- **Node.js:** entorno de ejecución de JavaScript en el servidor.
- **Express.js:** framework para crear el servidor y las rutas de la API.
- **JavaScript:** lenguaje utilizado en el frontend y backend.
- **HTML5:** estructura de la interfaz web.
- **CSS3:** diseño y presentación de la página.
- **Fetch API:** comunicación entre el navegador y el servidor.
- **Multer:** carga y almacenamiento de fotografías.
- **fs/promises:** lectura, escritura y eliminación de archivos.
- **crypto:** generación de hashes de contraseñas mediante `scrypt`.
- **JSON:** almacenamiento de registros de usuarios y mascotas.

## 3. Funcionalidades

### Gestión de usuarios

- Registrar usuarios con nombre, apellido, nombre de usuario y contraseña.
- Subir una fotografía de perfil opcional.
- Consultar todos los usuarios registrados.
- Consultar un usuario mediante su identificador.
- Modificar la información de un usuario.
- Cambiar la contraseña o fotografía de un usuario.
- Eliminar usuarios y sus fotografías asociadas.
- Almacenar las contraseñas mediante hashes.
- Evitar que las contraseñas aparezcan en las respuestas normales de la API.

### Gestión de mascotas

- Registrar mascotas con especie, color, edad y sexo.
- Subir hasta cinco fotografías por mascota.
- Consultar las mascotas registradas.
- Consultar una mascota mediante su identificador.
- Modificar la información de una mascota.
- Agregar nuevas fotografías sin superar el límite de cinco imágenes.
- Quitar fotografías individuales de una mascota o reemplazarlas por otras en la misma petición.
- Eliminar mascotas y sus fotografías asociadas.

## 4. Estructura del proyecto

```text
gesti-n-de-mascotas/
│
├── node_modules/
│
├── public/
│   ├── index.html
│   └── img/
│       ├── users/
│       └── pets/
│
├── src/
│   ├── app.js
│   │
│   ├── data/
│   │   ├── users.json
│   │   └── pets.json
│   │
│   ├── routes/
│   │   ├── users.router.js
│   │   └── pets.router.js
│   │
│   ├── middlewares/
│   │   ├── multer.middleware.js
│   │   └── error.middleware.js
│   │
│   └── utils/
│       ├── files.js
│       └── crypto.js
│
├── package.json
├── package-lock.json
└── README.md
```

## 5. Instalación y ejecución

### Requisitos

Tener instalados Node.js y npm.

### Instalación

1. Abrir el proyecto en Visual Studio Code.
2. Abrir una terminal en la carpeta principal.
3. Instalar las dependencias:

```bash
npm install
```

4. Iniciar el servidor:

```bash
npm start
```

También se puede ejecutar en modo de desarrollo mediante:

```bash
npm run dev
```

5. Abrir el navegador e ingresar a:

```text
http://127.0.0.1:3000
```

El servidor utiliza el puerto `3000`.

## 6. Endpoints de la API

### Usuarios

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/users` | Consultar todos los usuarios |
| GET | `/api/users/:id` | Consultar un usuario |
| POST | `/api/users` | Registrar un usuario |
| PUT | `/api/users/:id` | Actualizar un usuario |
| DELETE | `/api/users/:id` | Eliminar un usuario |

**Campos utilizados:** `firstname`, `lastname`, `username`, `password` y `avatar`.

Para registrar y actualizar usuarios con fotografías se utiliza `multipart/form-data`.

### Mascotas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/pets` | Consultar todas las mascotas |
| GET | `/api/pets/:id` | Consultar una mascota |
| POST | `/api/pets` | Registrar una mascota |
| PUT | `/api/pets/:id` | Actualizar una mascota |
| DELETE | `/api/pets/:id` | Eliminar una mascota |

**Campos utilizados:** `especie`, `color`, `edad`, `sexo` e `img`.

Para registrar y actualizar mascotas con fotografías se utiliza `multipart/form-data`.

#### Modificar las fotografías de una mascota

En `PUT /api/pets/:id` se pueden combinar dos campos:

| Campo | Efecto |
|---|---|
| `img` | Agrega las fotografías nuevas (archivos). |
| `eliminar` | Quita fotografías ya guardadas. Recibe la ruta tal como aparece en la mascota, por ejemplo `/img/pets/1793000000000-123456789.jpg`. Se puede repetir el campo para quitar varias. |

- Al enviar ambos campos en la misma petición, se reemplazan fotografías: primero se quitan las indicadas y luego se agregan las nuevas.
- El límite de cinco fotografías se calcula con las que quedan después de quitar, más las nuevas.
- Solo se pueden quitar fotografías que pertenezcan a esa mascota; de lo contrario, la API responde `400`.
- Las fotografías quitadas también se eliminan de `public/img/pets`.

## 7. Gestión de imágenes

El proyecto utiliza Multer para almacenar las fotografías.

Las imágenes se guardan en las siguientes carpetas:

- `public/img/users`: fotografías de usuarios.
- `public/img/pets`: fotografías de mascotas.

Se permiten imágenes en formato JPG, PNG y WEBP.

Cada archivo tiene un tamaño máximo permitido de 5 MB.

Las mascotas pueden tener hasta cinco fotografías asociadas.

Al eliminar un usuario o mascota, el servidor también intenta eliminar sus fotografías correspondientes.

## 8. Almacenamiento de datos

Los registros se almacenan en dos archivos:

- `src/data/users.json`
- `src/data/pets.json`

Las operaciones de lectura y escritura se realizan mediante el módulo `fs/promises` de Node.js.

Cada registro contiene un identificador numérico asignado automáticamente por el backend.

## 9. Seguridad y validaciones

El sistema implementa las siguientes medidas:

- Hash de contraseñas mediante `crypto.scryptSync`.
- Validación de campos obligatorios, rechazando textos vacíos o formados solo por espacios.
- Verificación de nombres de usuario duplicados.
- Validación de identificadores.
- Validación de edades de mascotas.
- Restricción de formatos y tamaños de archivos.
- Manejo de errores de Multer.
- Respuesta `400` cuando el cuerpo de la petición es un JSON mal formado.
- Cola de escritura por archivo, para que las peticiones simultáneas no sobrescriban los datos de `users.json` y `pets.json`.
- Limpieza de archivos subidos cuando determinadas operaciones no se completan correctamente.
- Confirmación antes de eliminar registros desde la interfaz web.

**Nota:** esta aplicación se desarrolló con fines académicos. No implementa autenticación, autorización ni una base de datos de producción. Las rutas de modificación y eliminación no deben exponerse públicamente sin incorporar controles de acceso.

## 10. Pruebas realizadas

Se realizaron pruebas utilizando Postman y el navegador web.

Se comprobaron las siguientes operaciones:

- Registro de usuarios y mascotas.
- Consulta individual y general de registros.
- Actualización de usuarios y mascotas.
- Eliminación de registros.
- Carga de fotografías.
- Reemplazo de fotografías de usuarios.
- Restricción de cantidad de fotografías por mascota.
- Rechazo de archivos no permitidos.
- Validaciones de los formularios.
- Comunicación entre frontend y backend.

Las operaciones principales del CRUD se probaron satisfactoriamente desde la interfaz web.

## 11. Interfaz web

La página principal permite:

- Visualizar la cantidad de usuarios y mascotas registrados.
- Consultar registros y fotografías.
- Registrar usuarios y mascotas.
- Modificar información.
- Eliminar registros mediante confirmación.
- Mostrar mensajes de éxito y error.

La interfaz consume los endpoints de Express mediante `fetch()` y utiliza `FormData` para enviar información y fotografías.

## 12. Conclusión

El proyecto permitió implementar una API REST utilizando Node.js y Express, integrar operaciones CRUD con almacenamiento en archivos JSON, gestionar fotografías mediante Multer y aplicar mecanismos básicos de validación y protección de contraseñas.

También permitió conectar el backend con una interfaz web funcional, facilitando la administración de usuarios y mascotas directamente desde el navegador.