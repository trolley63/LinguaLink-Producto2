
const NOMBRE_BASE_DATOS = "LinguaLinkDB";
const VERSION_BASE_DATOS = 1;

let promesaBaseDatos = null;


// =====================================================
// 1. APERTURA E INICIALIZACIÓN DE INDEXEDDB
// =====================================================

export function abrirBaseDatos() {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(
            new Error("Este navegador no permite utilizar IndexedDB.")
        );
    }

    // Evita abrir varias conexiones simultáneas.
    if (promesaBaseDatos) {
        return promesaBaseDatos;
    }

    promesaBaseDatos = new Promise((resolve, reject) => {
        const solicitud = indexedDB.open(
            NOMBRE_BASE_DATOS,
            VERSION_BASE_DATOS
        );

        solicitud.onupgradeneeded = (evento) => {
            const bd = evento.target.result;

            // Almacén de usuarios.
            if (!bd.objectStoreNames.contains("usuarios")) {
                const usuarios = bd.createObjectStore("usuarios", {
                    keyPath: "id",
                    autoIncrement: true
                });

                usuarios.createIndex("email", "email", {
                    unique: true
                });
            }

            // Almacén de intercambios.
            if (!bd.objectStoreNames.contains("intercambios")) {
                const intercambios = bd.createObjectStore("intercambios", {
                    keyPath: "id",
                    autoIncrement: true
                });

                intercambios.createIndex("idUsuario", "idUsuario", {
                    unique: false
                });

                intercambios.createIndex("tipo", "tipo", {
                    unique: false
                });
            }

            // Almacén de intercambios seleccionados.
            if (!bd.objectStoreNames.contains("seleccionados")) {
                const seleccionados = bd.createObjectStore("seleccionados", {
                    keyPath: ["idUsuario", "idIntercambio"]
                });

                seleccionados.createIndex("idUsuario", "idUsuario", {
                    unique: false
                });
            }
        };

        // Apertura correcta.
        solicitud.onsuccess = () => {
            const bd = solicitud.result;

            bd.onversionchange = () => {
                bd.close();
                promesaBaseDatos = null;
            };

            resolve(bd);
        };

        // Error durante la apertura.
        solicitud.onerror = () => {
            promesaBaseDatos = null;

            const detalle = solicitud.error
                ? solicitud.error.message
                : "Error desconocido";

            reject(new Error(`No se pudo abrir IndexedDB: ${detalle}`));
        };

        solicitud.onblocked = () => {
            console.warn(
                "La apertura de IndexedDB está bloqueada por otra conexión."
            );
        };
    });

    return promesaBaseDatos;
}


// =====================================================
// 2. FUNCIÓN AUXILIAR PARA OPERACIONES CON INDEXEDDB
// =====================================================

function ejecutarSolicitud(nombreAlmacen, modo, crearSolicitud) {
    return abrirBaseDatos().then((bd) => {
        return new Promise((resolve, reject) => {
            const transaccion = bd.transaction(nombreAlmacen, modo);
            const almacen = transaccion.objectStore(nombreAlmacen);

            let resultado;
            let errorSolicitud;

            let solicitud;

            try {
                solicitud = crearSolicitud(almacen);
            } catch (error) {
                reject(error);
                return;
            }

            solicitud.onsuccess = () => {
                resultado = solicitud.result;
            };

            solicitud.onerror = () => {
                errorSolicitud = solicitud.error;
            };

            transaccion.oncomplete = () => {
                resolve(resultado);
            };

            transaccion.onerror = () => {
                reject(
                    errorSolicitud ||
                    transaccion.error ||
                    new Error("Error en la operación de IndexedDB.")
                );
            };

            transaccion.onabort = () => {
                reject(
                    errorSolicitud ||
                    transaccion.error ||
                    new Error("La operación de IndexedDB ha sido cancelada.")
                );
            };
        });
    });
}


// =====================================================
// 3. GENERACIÓN DE CREDENCIALES
// =====================================================

// Genera un hash de la contraseña mediante PBKDF2.
async function generarCredenciales(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const clave = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const resultado = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        clave,
        256
    );

    return {
        passwordHash: convertirBase64(new Uint8Array(resultado)),
        passwordSalt: convertirBase64(salt)
    };
}


// Convierte bytes a Base64 para almacenarlos en IndexedDB.
function convertirBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
}


// =====================================================
// 4. CONSULTA DE DATOS PÚBLICOS DE USUARIOS
// =====================================================

// Devuelve los datos públicos de un usuario,
// sin exponer su contraseña ni su hash.
function obtenerDatosPublicos(usuario) {
    if (!usuario) {
        return null;
    }

    return {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
    };
}


// =====================================================
// 5. CREACIÓN Y CONSULTA DE USUARIOS
// =====================================================

// Crea un usuario nuevo.
export async function crearUsuario(datosUsuario) {
    const nombre = String(datosUsuario?.nombre ?? "").trim();
    const email = String(datosUsuario?.email ?? "").trim().toLowerCase();
    const password = String(datosUsuario?.password ?? "");

    // Validaciones básicas.
    if (!nombre || !email || !password) {
        throw new Error("Todos los campos son obligatorios.");
    }

    const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!patronEmail.test(email)) {
        throw new Error("El correo electrónico no tiene un formato válido.");
    }

    // Permitimos contraseñas de cuatro caracteres,
    // para admitir también la contraseña 1234 del ejemplo del profesor.
    if (password.length < 4) {
        throw new Error("La contraseña debe tener al menos 4 caracteres.");
    }

    // Genera el hash y la sal antes de guardar el usuario.
    const credenciales = await generarCredenciales(password);

    const usuario = {
        nombre,
        email,
        ...credenciales
    };

    try {
        const id = await ejecutarSolicitud(
            "usuarios",
            "readwrite",
            (almacen) => almacen.add(usuario)
        );

        return obtenerDatosPublicos({
            id,
            nombre,
            email
        });

    } catch (error) {
        if (error.name === "ConstraintError") {
            throw new Error("Ya existe un usuario con ese correo electrónico.");
        }

        throw error;
    }
}


// Obtiene todos los usuarios registrados.
export async function obtenerUsuarios() {
    const usuarios = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.getAll()
    );

    return usuarios.map(obtenerDatosPublicos);
}


// Busca un usuario mediante su correo electrónico.
export async function obtenerUsuarioPorEmail(email) {
    const correo = String(email ?? "").trim().toLowerCase();

    if (!correo) {
        throw new Error("Debes indicar un correo electrónico.");
    }

    const usuario = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.index("email").get(correo)
    );

    return obtenerDatosPublicos(usuario);
}


// =====================================================
// 6. MODIFICACIÓN Y ELIMINACIÓN DE USUARIOS
// =====================================================

// Modifica los datos de un usuario existente.
export async function actualizarUsuario(id, datosUsuario) {
    const identificador = Number(id);

    if (!Number.isInteger(identificador) || identificador <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    const nombre = String(datosUsuario?.nombre ?? "").trim();
    const email = String(datosUsuario?.email ?? "").trim().toLowerCase();
    const password = String(datosUsuario?.password ?? "");

    if (!nombre || !email) {
        throw new Error("El nombre y el correo electrónico son obligatorios.");
    }

    const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!patronEmail.test(email)) {
        throw new Error("El correo electrónico no tiene un formato válido.");
    }

    if (password.length > 0 && password.length < 4) {
        throw new Error("La contraseña debe tener al menos 4 caracteres.");
    }

    // Recupera el usuario original para conservar sus credenciales.
    const existente = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.get(identificador)
    );

    if (!existente) {
        throw new Error("No se ha encontrado el usuario que deseas modificar.");
    }

    const usuarioActualizado = {
        ...existente,
        nombre,
        email
    };

    // Solo cambia la contraseña si se ha introducido una nueva.
    if (password.length > 0) {
        const credenciales = await generarCredenciales(password);
        Object.assign(usuarioActualizado, credenciales);
    }

    try {
        await ejecutarSolicitud(
            "usuarios",
            "readwrite",
            (almacen) => almacen.put(usuarioActualizado)
        );

        return obtenerDatosPublicos(usuarioActualizado);

    } catch (error) {
        if (error.name === "ConstraintError") {
            throw new Error(
                "Ya existe otro usuario con ese correo electrónico."
            );
        }

        throw error;
    }
}


// Elimina un usuario mediante su identificador.
export async function eliminarUsuario(id) {
    const identificador = Number(id);

    if (!Number.isInteger(identificador) || identificador <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    const existente = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.get(identificador)
    );

    if (!existente) {
        throw new Error("No se ha encontrado el usuario que deseas eliminar.");
    }

    await ejecutarSolicitud(
        "usuarios",
        "readwrite",
        (almacen) => almacen.delete(identificador)
    );

    return true;
}
