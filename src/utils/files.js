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

// Una cola de tareas por archivo: evita que dos peticiones
// lean, modifiquen y escriban el mismo JSON al mismo tiempo
const colas = new Map();

export function conBloqueo(ruta, tarea) {
    const clave = String(ruta);

    // Tarea anterior de este archivo (o una promesa ya resuelta si no hay)
    const anterior = colas.get(clave) ?? Promise.resolve();

    // Ejecutar esta tarea solo cuando la anterior haya terminado
    const actual = anterior.then(tarea);

    // Guardar el final de la cola; el catch evita que un error
    // de una tarea bloquee a las siguientes
    colas.set(clave, actual.catch(() => {}));

    return actual;
}
