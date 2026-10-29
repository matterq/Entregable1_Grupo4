import { Router } from 'express';
import { leerJSON, guardarJSON, eliminarArchivo, conBloqueo } from '../utils/files.js';
import { upload } from '../middlewares/multer.middleware.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

// Ubicación del archivo de mascotas
const rutaMascotas = new URL('../data/pets.json', import.meta.url);

// Un texto es válido si es string y no está vacío ni solo con espacios
const textoValido = valor =>
    typeof valor === 'string' && valor.trim() !== '';

// La edad es válida si es un entero mayor o igual a 0
// (se rechaza el texto vacío, porque Number('') daría 0)
const edadValida = valor =>
    String(valor).trim() !== '' &&
    Number.isInteger(Number(valor)) &&
    Number(valor) >= 0;

// Consultar todas las mascotas
router.get('/', async (req, res) => {
    try {
        const mascotas = await leerJSON(rutaMascotas);

        res.status(200).json(mascotas);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Error al consultar las mascotas'
        });
    }
});


/* CONSULTAR UNA MASCOTA POR ID */
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Validar el ID
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID inválido'
            });
        }

        // Leer mascotas registradas
        const mascotas = await leerJSON(rutaMascotas);

        // Buscar mascota por ID
        const mascota = mascotas.find(m => m.id === id);

        if (!mascota) {
            return res.status(404).json({
                error: 'Mascota no encontrada'
            });
        }

        res.status(200).json(mascota);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Error al consultar la mascota'
        });
    }
});



/* CREAR UNA MASCOTA */
router.post('/', upload.array('img', 5), async (req, res) => {

    // Eliminar las imágenes nuevas si el registro falla
    const limpiarImagenes = async () => {
        for (const archivo of req.files || []) {
            await eliminarArchivo(archivo.path);
        }
    };

    try {
        const { especie, color, edad, sexo } = req.body;

        // Validar campos obligatorios (no vacíos ni solo espacios)
        if (![especie, color, sexo].every(textoValido) ||
            edad === undefined || String(edad).trim() === '') {
            await limpiarImagenes();

            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        // Validar edad
        if (!edadValida(edad)) {
            await limpiarImagenes();

            return res.status(400).json({
                error: 'La edad debe ser un número entero válido'
            });
        }

        const edadNumero = Number(edad);

        // Obtener rutas de las imágenes
        const img = (req.files || []).map(
            archivo => `/img/pets/${archivo.filename}`
        );

        // Leer, generar el ID y guardar deben ocurrir sin que otra
        // petición toque pets.json en medio
        const nuevaMascota = await conBloqueo(rutaMascotas, async () => {
            const mascotas = await leerJSON(rutaMascotas);

            // Crear ID automático
            const id = Math.max(0, ...mascotas.map(m => m.id)) + 1;

            const mascota = {
                id,
                especie,
                color,
                edad: edadNumero,
                sexo,
                img
            };

            // Guardar en pets.json
            mascotas.push(mascota);
            await guardarJSON(rutaMascotas, mascotas);

            return mascota;
        });

        // Responder con la mascota creada
        res.status(201).json(nuevaMascota);

    } catch (error) {
        console.error(error);

        // Limpiar imágenes si ocurre un error
        try {
            await limpiarImagenes();
        } catch (errorLimpieza) {
            console.error(
                'Error al limpiar imágenes:',
                errorLimpieza
            );
        }

        res.status(500).json({
            error: 'Error al crear la mascota'
        });
    }
});



/* MODIFICAR UNA MASCOTA */
router.put('/:id', upload.array('img', 5), async (req, res) => {

    // Eliminar imágenes nuevas si la petición falla
    const limpiarImagenes = async () => {
        for (const archivo of req.files || []) {
            await eliminarArchivo(archivo.path);
        }
    };

    try {
        const id = Number(req.params.id);

        // Validar ID
        if (!Number.isSafeInteger(id) || id <= 0) {
            await limpiarImagenes();

            return res.status(400).json({
                error: 'ID inválido'
            });
        }

        const { especie, color, edad, sexo, eliminar } = req.body;
        const imagenesNuevas = req.files || [];

        // 'eliminar' puede llegar como un solo texto o como una lista
        // de rutas; se convierte siempre en una lista sin repetidos
        const rutasAEliminar = eliminar === undefined
            ? []
            : [...new Set([].concat(eliminar))];

        // Leer, modificar y guardar sin interrupciones de otras peticiones
        const resultado = await conBloqueo(rutaMascotas, async () => {
            const mascotas = await leerJSON(rutaMascotas);

            // Buscar mascota por ID
            const indice = mascotas.findIndex(m => m.id === id);

            if (indice === -1) {
                return { status: 404, error: 'Mascota no encontrada' };
            }

            // Los campos de texto enviados no pueden estar vacíos
            if ([especie, color, sexo].some(
                valor => valor !== undefined && !textoValido(valor)
            )) {
                return {
                    status: 400,
                    error: 'Los campos enviados no pueden estar vacíos'
                };
            }

            // Las rutas a eliminar deben ser textos no vacíos
            if (!rutasAEliminar.every(textoValido)) {
                return {
                    status: 400,
                    error: 'El campo eliminar debe contener rutas de imágenes'
                };
            }

            const imagenesActuales = mascotas[indice].img || [];

            // Solo se pueden eliminar imágenes que pertenezcan a esta mascota
            const noPertenecen = rutasAEliminar.filter(
                ruta => !imagenesActuales.includes(ruta)
            );

            if (noPertenecen.length > 0) {
                return {
                    status: 400,
                    error: 'La imagen no pertenece a esta mascota: ' +
                        noPertenecen.join(', ')
                };
            }

            // Imágenes que se conservan después de eliminar
            const imagenesRestantes = imagenesActuales.filter(
                ruta => !rutasAEliminar.includes(ruta)
            );

            // Máximo cinco imágenes por mascota (contando solo las que quedan)
            if (imagenesRestantes.length + imagenesNuevas.length > 5) {
                return {
                    status: 400,
                    error: 'Una mascota no puede tener más de 5 imágenes'
                };
            }

            // Validar edad
            if (edad !== undefined) {
                if (!edadValida(edad)) {
                    return {
                        status: 400,
                        error: 'La edad debe ser un entero válido'
                    };
                }

                mascotas[indice].edad = Number(edad);
            }

            // Actualizar los demás campos
            if (especie !== undefined) {
                mascotas[indice].especie = especie;
            }

            if (color !== undefined) {
                mascotas[indice].color = color;
            }

            if (sexo !== undefined) {
                mascotas[indice].sexo = sexo;
            }

            // Quitar las imágenes indicadas y agregar las nuevas
            if (rutasAEliminar.length > 0 || imagenesNuevas.length > 0) {
                const nuevasRutas = imagenesNuevas.map(
                    archivo => `/img/pets/${archivo.filename}`
                );

                mascotas[indice].img = [
                    ...imagenesRestantes,
                    ...nuevasRutas
                ];
            }

            // Guardar cambios
            await guardarJSON(rutaMascotas, mascotas);

            return { mascota: mascotas[indice] };
        });

        // Si hubo un error de validación o no existe la mascota
        if (resultado.error) {
            await limpiarImagenes();

            return res.status(resultado.status).json({
                error: resultado.error
            });
        }

        // Borrar del disco las imágenes quitadas (ya se guardó el JSON)
        const carpetaImagenes = fileURLToPath(
            new URL('../../public/img/pets/', import.meta.url)
        );

        for (const ruta of rutasAEliminar) {
            try {
                await eliminarArchivo(
                    path.join(carpetaImagenes, path.basename(ruta))
                );
            } catch (errorImagen) {
                // Si falla, se registra sin deshacer los cambios guardados
                console.error('Error al eliminar imagen:', errorImagen);
            }
        }

        // Responder
        res.status(200).json(resultado.mascota);

    } catch (error) {
        console.error(error);

        try {
            await limpiarImagenes();
        } catch (errorLimpieza) {
            console.error('Error al limpiar imágenes:', errorLimpieza);
        }

        res.status(500).json({
            error: 'Error al modificar la mascota'
        });
    }
});


/* ELIMINAR UNA MASCOTA */
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID inválido'
            });
        }

        // Leer, eliminar y guardar sin interrupciones de otras peticiones
        const mascotaEliminada = await conBloqueo(rutaMascotas, async () => {
            const mascotas = await leerJSON(rutaMascotas);

            const indice = mascotas.findIndex(m => m.id === id);

            if (indice === -1) {
                return null;
            }

            // Eliminar mascota del arreglo
            const [eliminada] = mascotas.splice(indice, 1);

            // Guardar cambios en pets.json
            await guardarJSON(rutaMascotas, mascotas);

            return eliminada;
        });

        if (!mascotaEliminada) {
            return res.status(404).json({
                error: 'Mascota no encontrada'
            });
        }

        // Eliminar las imágenes asociadas a la mascota
        const carpetaImagenes = fileURLToPath(
            new URL('../../public/img/pets/', import.meta.url)
        );

        for (const imagen of mascotaEliminada.img || []) {
            const nombreArchivo = path.basename(imagen);

            // Verificar que sea un nombre de archivo válido
            if (!nombreArchivo || nombreArchivo === '.' ||
                nombreArchivo === '..') {
                continue;
            }

            const rutaImagen = path.join(
                carpetaImagenes,
                nombreArchivo
            );

            await eliminarArchivo(rutaImagen);
        }

        res.status(200).json({
            mensaje: 'Mascota eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Error al eliminar la mascota'
        });
    }
});




export default router;
