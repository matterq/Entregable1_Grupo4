import { Router } from "express";
import {
  leerJSON,
  guardarJSON,
  eliminarArchivo,
  conBloqueo,
} from "../utils/files.js";
import { hashPassword } from "../utils/crypto.js";
import { upload } from "../middlewares/multer.middleware.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();

// Ubicación del archivo de usuarios
const rutaUsuarios = new URL("../data/users.json", import.meta.url);

// Consultar todos los usuarios
router.get("/", async (req, res) => {
  try {
    const usuarios = await leerJSON(rutaUsuarios);

    // No devolver contraseñas
    const usuariosPublicos = usuarios.map(
      ({ password, ...usuario }) => usuario,
    );

    res.status(200).json(usuariosPublicos);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al consultar los usuarios",
    });
  }
});

/* CONSULTAR UN USUARIO POR ID */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    const usuarios = await leerJSON(rutaUsuarios);

    const usuario = usuarios.find((u) => u.id === id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    // Omitir contraseña
    const { password, ...usuarioPublico } = usuario;

    res.status(200).json(usuarioPublico);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al consultar el usuario",
    });
  }
});

/* CREAR UN USUARIO */
router.post("/", upload.single("avatar"), async (req, res) => {
  // Eliminar el avatar si el registro falla
  const limpiarAvatar = async () => {
    if (req.file) {
      await eliminarArchivo(req.file.path);
    }
  };

  try {
    const { firstname, lastname, username, password } = req.body;

    // Validar campos obligatorios
    if (
      [firstname, lastname, username, password].some(
        (valor) => typeof valor !== "string" || !valor.trim(),
      )
    ) {
      await limpiarAvatar();

      return res.status(400).json({
        error: "Todos los campos son obligatorios",
      });
    }

    // Proteger contraseña
    const passwordHash = hashPassword(password);

    // Obtener ruta del avatar
    const avatar = req.file ? `/img/users/${req.file.filename}` : null;

    // Leer, generar el ID y guardar deben ocurrir sin que otra
    // petición toque users.json en medio
    const nuevoUsuario = await conBloqueo(rutaUsuarios, async () => {
      const usuarios = await leerJSON(rutaUsuarios);

      // Verificar nombre de usuario duplicado
      if (usuarios.some((u) => u.username === username)) {
        return null;
      }

      // Generar un ID automático
      const id = Math.max(0, ...usuarios.map((u) => u.id)) + 1;

      const usuario = {
        id,
        firstname,
        lastname,
        username,
        password: passwordHash,
        avatar,
      };

      // Guardar en users.json
      usuarios.push(usuario);
      await guardarJSON(rutaUsuarios, usuarios);

      return usuario;
    });

    if (!nuevoUsuario) {
      await limpiarAvatar();

      return res.status(400).json({
        error: "El nombre de usuario ya existe",
      });
    }

    // Responder sin mostrar contraseña
    const { password: _, ...usuarioPublico } = nuevoUsuario;

    res.status(201).json(usuarioPublico);
  } catch (error) {
    console.error(error);

    try {
      await limpiarAvatar();
    } catch (errorLimpieza) {
      console.error("Error al limpiar avatar:", errorLimpieza);
    }

    res.status(500).json({
      error: "Error al crear el usuario",
    });
  }
});

/* MODIFICAR UN USUARIO */
router.put("/:id", upload.single("avatar"), async (req, res) => {
  // Eliminar el avatar nuevo si la actualización falla
  const limpiarAvatar = async () => {
    if (req.file) {
      await eliminarArchivo(req.file.path);
    }
  };

  // Indica si los cambios ya se guardaron
  let cambiosGuardados = false;

  try {
    const id = Number(req.params.id);

    // Validar ID
    if (!Number.isSafeInteger(id) || id <= 0) {
      await limpiarAvatar();

      return res.status(400).json({
        error: "ID inválido",
      });
    }

    const { firstname, lastname, username, password } = req.body;

    // Leer, modificar y guardar sin interrupciones de otras peticiones
    const resultado = await conBloqueo(rutaUsuarios, async () => {
      const usuarios = await leerJSON(rutaUsuarios);

      // Buscar usuario por ID
      const indice = usuarios.findIndex((u) => u.id === id);

      if (indice === -1) {
        return { status: 404, error: "Usuario no encontrado" };
      }

      // Validar campos enviados
      if (
        [firstname, lastname, username, password].some(
          (valor) =>
            valor !== undefined && (typeof valor !== "string" || !valor.trim()),
        )
      ) {
        return {
          status: 400,
          error: "Los campos enviados no pueden estar vacíos",
        };
      }

      // Evitar nombres de usuario duplicados
      if (
        username &&
        usuarios.some((u) => u.id !== id && u.username === username)
      ) {
        return {
          status: 400,
          error: "El nombre de usuario ya existe",
        };
      }

      // Actualizar los datos recibidos
      if (firstname !== undefined) {
        usuarios[indice].firstname = firstname;
      }

      if (lastname !== undefined) {
        usuarios[indice].lastname = lastname;
      }

      if (username !== undefined) {
        usuarios[indice].username = username;
      }

      // Proteger la contraseña si se modifica
      if (password !== undefined) {
        usuarios[indice].password = hashPassword(password);
      }

      // Guardar el avatar anterior
      const avatarAnterior = usuarios[indice].avatar;

      // Actualizar avatar si se envía uno nuevo
      if (req.file) {
        usuarios[indice].avatar = `/img/users/${req.file.filename}`;
      }

      // Guardar cambios en users.json
      await guardarJSON(rutaUsuarios, usuarios);

      return { usuario: usuarios[indice], avatarAnterior };
    });

    // Si hubo un error de validación o no existe el usuario
    if (resultado.error) {
      await limpiarAvatar();

      return res.status(resultado.status).json({
        error: resultado.error,
      });
    }

    cambiosGuardados = true;

    // Eliminar el avatar anterior después de guardar
    if (req.file && resultado.avatarAnterior) {
      const carpetaImagenes = fileURLToPath(
        new URL("../../public/img/users/", import.meta.url),
      );

      const nombreArchivo = path.basename(resultado.avatarAnterior);

      const rutaImagen = path.join(carpetaImagenes, nombreArchivo);

      // Si falla la limpieza anterior, registrar el error
      // sin borrar el avatar nuevo
      try {
        await eliminarArchivo(rutaImagen);
      } catch (errorImagen) {
        console.error("Error al eliminar avatar anterior:", errorImagen);
      }
    }

    // Responder sin contraseña
    const { password: _, ...usuarioPublico } = resultado.usuario;

    res.status(200).json(usuarioPublico);
  } catch (error) {
    console.error(error);

    // Solo limpiar el nuevo avatar si no se guardaron cambios
    if (!cambiosGuardados) {
      try {
        await limpiarAvatar();
      } catch (errorLimpieza) {
        console.error("Error al limpiar avatar:", errorLimpieza);
      }
    }

    res.status(500).json({
      error: "Error al modificar el usuario",
    });
  }
});

/* ELIMINAR UN USUARIO */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Validar ID
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    // Leer, eliminar y guardar sin interrupciones de otras peticiones
    const usuarioEliminado = await conBloqueo(rutaUsuarios, async () => {
      const usuarios = await leerJSON(rutaUsuarios);

      // Buscar usuario
      const indice = usuarios.findIndex((u) => u.id === id);

      if (indice === -1) {
        return null;
      }

      // Eliminar usuario del arreglo
      const [eliminado] = usuarios.splice(indice, 1);

      // Guardar cambios en users.json
      await guardarJSON(rutaUsuarios, usuarios);

      return eliminado;
    });

    if (!usuarioEliminado) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    // Eliminar la imagen del usuario
    if (usuarioEliminado.avatar) {
      const carpetaImagenes = fileURLToPath(
        new URL("../../public/img/users/", import.meta.url),
      );

      const nombreArchivo = path.basename(usuarioEliminado.avatar);

      const rutaImagen = path.join(carpetaImagenes, nombreArchivo);

      await eliminarArchivo(rutaImagen);
    }

    res.status(200).json({
      mensaje: "Usuario eliminado correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al eliminar el usuario",
    });
  }
});

export default router;
