import { readFile, writeFile, unlink } from 'node:fs/promises';

// Leer información de un archivo JSON
export async function leerJSON(ruta) {
    const contenido = await readFile(ruta, 'utf-8');
    return JSON.parse(contenido);
}

// Guardar información en un archivo JSON
export async function guardarJSON(ruta, datos) {
    const contenido = JSON.stringify(datos, null, 2);
    await writeFile(ruta, contenido, 'utf-8');
}

// Eliminar un archivo del almacenamiento
export async function eliminarArchivo(ruta) {
    try {
        await unlink(ruta);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
