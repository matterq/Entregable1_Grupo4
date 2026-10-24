

import { Router } from 'express';
import { leerJSON, guardarJSON, eliminarArchivo } from '../utils/files.js';
import { upload } from '../middlewares/multer.middleware.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

// Ubicación del archivo de mascotas
const rutaMascotas = new URL('../data/pets.json', import.meta.url);

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

        // Validar campos obligatorios
        if (!especie || !color || !edad || !sexo) {
            await limpiarImagenes();

            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        // Validar edad
        const edadNumero = Number(edad);

        if (!Number.isInteger(edadNumero) || edadNumero < 0) {
            await limpiarImagenes();

            return res.status(400).json({
                error: 'La edad debe ser un número entero válido'
            });
        }

        // Leer mascotas registradas
        const mascotas = await leerJSON(rutaMascotas);

        // Crear ID automático
        const id = Math.max(0, ...mascotas.map(m => m.id)) + 1;

        // Obtener rutas de las imágenes
        const img = (req.files || []).map(
            archivo => `/img/pets/${archivo.filename}`
        );

        // Crear mascota
        const nuevaMascota = {
            id,
            especie,
            color,
            edad: edadNumero,
            sexo,
            img
        };

        // Guardar en pets.json
        mascotas.push(nuevaMascota);
        await guardarJSON(rutaMascotas, mascotas);

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

        // Leer mascotas registradas
        const mascotas = await leerJSON(rutaMascotas);

        // Buscar mascota por ID
        const indice = mascotas.findIndex(m => m.id === id);

        if (indice === -1) {
            await limpiarImagenes();

            return res.status(404).json({
                error: 'Mascota no encontrada'
            });
        }

        const { especie, color, edad, sexo } = req.body;

        // Contar imágenes existentes y nuevas
        const imagenesActuales = mascotas[indice].img || [];
        const imagenesNuevas = req.files || [];

        const totalImagenes =
            imagenesActuales.length + imagenesNuevas.length;

        // Máximo cinco imágenes por mascota
        if (totalImagenes > 5) {
            await limpiarImagenes();

            return res.status(400).json({
                error: 'Una mascota no puede tener más de 5 imágenes'
            });
        }

        // Validar edad
        if (edad !== undefined) {
            const edadNumero = Number(edad);

            if (!Number.isInteger(edadNumero) || edadNumero < 0) {
                await limpiarImagenes();

                return res.status(400).json({
                    error: 'La edad debe ser un entero válido'
                });
            }

            mascotas[indice].edad = edadNumero;
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

        // Agregar las nuevas imágenes
        if (imagenesNuevas.length > 0) {
            const nuevasRutas = imagenesNuevas.map(
                archivo => `/img/pets/${archivo.filename}`
            );

            mascotas[indice].img = [
                ...imagenesActuales,
                ...nuevasRutas
            ];
        }

        // Guardar cambios
        await guardarJSON(rutaMascotas, mascotas);

        // Responder
        res.status(200).json(mascotas[indice]);

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

        const mascotas = await leerJSON(rutaMascotas);

        const indice = mascotas.findIndex(m => m.id === id);

        if (indice === -1) {
            return res.status(404).json({
                error: 'Mascota no encontrada'
            });
        }

       
        // Obtener la mascota antes de eliminarla
        const mascotaEliminada = mascotas[indice];

        // Eliminar mascota del arreglo
        mascotas.splice(indice, 1);

        // Guardar cambios en pets.json
        await guardarJSON(rutaMascotas, mascotas);

       
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
