import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import usersRouter from "./routes/users.router.js";
import petsRouter from "./routes/pets.router.js";
import { manejarErrores } from "./middlewares/error.middleware.js";

const app = express();
const PORT = 3000;

// Configurar __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mostrar archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));

// Conectar el router de usuarios
app.use("/api/users", usersRouter);

// Conectar las rutas de mascotas
app.use("/api/pets", petsRouter);

// Manejar errores de Multer y del servidor
app.use(manejarErrores);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
