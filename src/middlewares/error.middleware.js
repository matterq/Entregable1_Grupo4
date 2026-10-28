import multer from 'multer';

// Manejar errores de subida de archivos
export function manejarErrores(error, req, res, next) {

    // Errores propios de Multer
    if (error instanceof multer.MulterError) {

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'La imagen no puede superar los 5 MB'
            });
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Campo de archivo no permitido o demasiadas imágenes'
            });
        }

        return res.status(400).json({
            error: error.message
        });
    }

    // Errores de validación de imágenes
    if (
        error.message === 'Solo se permiten imágenes JPG, PNG o WEBP' ||
        error.message === 'Campo de archivo no permitido'
    ) {
        return res.status(400).json({
            error: error.message
        });
    }

    // Otros errores del servidor
    console.error(error);

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
}
