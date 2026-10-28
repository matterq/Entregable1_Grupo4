import { scryptSync, randomBytes } from 'node:crypto';

// Crear un hash seguro de la contraseña
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    return `${salt}:${hash}`;
}
