
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento de imágenes
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.fieldname === 'avatar') {
            cb(null, path.join(__dirname, '../../public/img/users'));
        } else if (file.fieldname === 'img') {
            cb(null, path.join(__dirname, '../../public/img/pets'));
        } else {
            cb(new Error('Campo de archivo no permitido'));
        }

    },

    filename: (req, file, cb) => {
        const nombre = Date.now() + '-' +
            Math.round(Math.random() * 1E9);

        const extension = path.extname(file.originalname).toLowerCase();

        cb(null, nombre + extension);
    }
});

// Aceptar solamente imágenes
const fileFilter = (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
