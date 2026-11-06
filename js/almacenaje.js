
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

            if (!bd.objectStoreNames.contains("usuarios")) {
                const usuarios = bd.createObjectStore("usuarios", {
                    keyPath: "id",
                    autoIncrement: true
                });

                usuarios.createIndex("email", "email", {
                    unique: true
                });
            }

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

            if (!bd.objectStoreNames.contains("seleccionados")) {
                const seleccionados = bd.createObjectStore("seleccionados", {
                    keyPath: ["idUsuario", "idIntercambio"]
                });

                seleccionados.createIndex("idUsuario", "idUsuario", {
                    unique: false
                });
            }
        };

        solicitud.onsuccess = () => {
            const bd = solicitud.result;

            bd.onversionchange = () => {
                bd.close();
                promesaBaseDatos = null;
            };

            resolve(bd);
        };

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
// 2. OPERACIONES AUXILIARES DE INDEXEDDB
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


function convertirBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
}


// =====================================================
// 4. GESTIÓN DE USUARIOS
// =====================================================

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


export async function crearUsuario(datosUsuario) {
    const nombre = String(datosUsuario?.nombre ?? "").trim();
    const email = String(datosUsuario?.email ?? "").trim().toLowerCase();
    const password = String(datosUsuario?.password ?? "");

    if (!nombre || !email || !password) {
        throw new Error("Todos los campos son obligatorios.");
    }

    const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!patronEmail.test(email)) {
        throw new Error("El correo electrónico no tiene un formato válido.");
    }

    if (password.length < 4) {
        throw new Error("La contraseña debe tener al menos 4 caracteres.");
    }

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


export async function obtenerUsuarios() {
    const usuarios = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.getAll()
    );

    return usuarios.map(obtenerDatosPublicos);
}


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


// =====================================================
// 5. GESTIÓN DE INTERCAMBIOS
// =====================================================

export async function crearIntercambio(datosIntercambio) {
    const titulo = String(datosIntercambio?.titulo ?? "").trim();
    const descripcion = String(datosIntercambio?.descripcion ?? "").trim();
    const fecha = String(datosIntercambio?.fecha ?? "").trim();
    const tipo = String(datosIntercambio?.tipo ?? "").trim();
    const idUsuario = Number(datosIntercambio?.idUsuario);

    if (!titulo || !descripcion || !fecha || !tipo) {
        throw new Error("Todos los campos del intercambio son obligatorios.");
    }

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    if (Number.isNaN(Date.parse(fecha))) {
        throw new Error("La fecha del intercambio no es válida.");
    }

    const tiposPermitidos = ["Ofrezco idioma", "Busco idioma"];

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error("El tipo de intercambio no es válido.");
    }

    const usuario = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.get(idUsuario)
    );

    if (!usuario) {
        throw new Error("No existe el usuario asociado al intercambio.");
    }

    const intercambio = {
        titulo,
        descripcion,
        fecha,
        tipo,
        idUsuario,
        email: usuario.email
    };

    const id = await ejecutarSolicitud(
        "intercambios",
        "readwrite",
        (almacen) => almacen.add(intercambio)
    );

    return {
        id,
        ...intercambio
    };
}


export async function obtenerIntercambios() {
    return await ejecutarSolicitud(
        "intercambios",
        "readonly",
        (almacen) => almacen.getAll()
    );
}


export async function obtenerIntercambiosPorUsuario(idUsuario) {
    const identificador = Number(idUsuario);

    if (!Number.isInteger(identificador) || identificador <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    return await ejecutarSolicitud(
        "intercambios",
        "readonly",
        (almacen) => almacen.index("idUsuario").getAll(identificador)
    );
}


export async function obtenerIntercambioPorId(id) {
    const identificador = Number(id);

    if (!Number.isInteger(identificador) || identificador <= 0) {
        throw new Error("El identificador del intercambio no es válido.");
    }

    return await ejecutarSolicitud(
        "intercambios",
        "readonly",
        (almacen) => almacen.get(identificador)
    );
}


export async function actualizarIntercambio(id, datosIntercambio) {
    const identificador = Number(id);

    if (!Number.isInteger(identificador) || identificador <= 0) {
        throw new Error("El identificador del intercambio no es válido.");
    }

    const titulo = String(datosIntercambio?.titulo ?? "").trim();
    const descripcion = String(datosIntercambio?.descripcion ?? "").trim();
    const fecha = String(datosIntercambio?.fecha ?? "").trim();
    const tipo = String(datosIntercambio?.tipo ?? "").trim();
    const idUsuario = Number(datosIntercambio?.idUsuario);

    if (!titulo || !descripcion || !fecha || !tipo) {
        throw new Error("Todos los campos del intercambio son obligatorios.");
    }

    if (Number.isNaN(Date.parse(fecha))) {
        throw new Error("La fecha del intercambio no es válida.");
    }

    const tiposPermitidos = ["Ofrezco idioma", "Busco idioma"];

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error("El tipo de intercambio no es válido.");
    }

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    const existente = await ejecutarSolicitud(
        "intercambios",
        "readonly",
        (almacen) => almacen.get(identificador)
    );

    if (!existente) {
        throw new Error("No se ha encontrado el intercambio que deseas modificar.");
    }

    const usuario = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.get(idUsuario)
    );

    if (!usuario) {
        throw new Error("No existe el usuario asociado al intercambio.");
    }

    const intercambioActualizado = {
        ...existente,
        titulo,
        descripcion,
        fecha,
        tipo,
        idUsuario,
        email: usuario.email
    };

    await ejecutarSolicitud(
        "intercambios",
        "readwrite",
        (almacen) => almacen.put(intercambioActualizado)
    );

    return intercambioActualizado;
}


export async function eliminarIntercambio(id) {
    const identificador = Number(id);

    if (!Number.isInteger(identificador) || identificador <= 0) {
        throw new Error("El identificador del intercambio no es válido.");
    }

    const existente = await ejecutarSolicitud(
        "intercambios",
        "readonly",
        (almacen) => almacen.get(identificador)
    );

    if (!existente) {
        throw new Error("No se ha encontrado el intercambio que deseas eliminar.");
    }

    await ejecutarSolicitud(
        "intercambios",
        "readwrite",
        (almacen) => almacen.delete(identificador)
    );

    return true;
}


// =====================================================
// 6. GESTIÓN DE SELECCIONES DEL DASHBOARD
// =====================================================

export async function guardarSeleccion(idUsuario, idIntercambio) {
    const identificadorUsuario = Number(idUsuario);
    const identificadorIntercambio = Number(idIntercambio);

    if (!Number.isInteger(identificadorUsuario) || identificadorUsuario <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    if (!Number.isInteger(identificadorIntercambio) || identificadorIntercambio <= 0) {
        throw new Error("El identificador del intercambio no es válido.");
    }

    const usuario = await ejecutarSolicitud(
        "usuarios",
        "readonly",
        (almacen) => almacen.get(identificadorUsuario)
    );

    if (!usuario) {
        throw new Error("No existe el usuario seleccionado.");
    }

    const intercambio = await ejecutarSolicitud(
        "intercambios",
        "readonly",
        (almacen) => almacen.get(identificadorIntercambio)
    );

    if (!intercambio) {
        throw new Error("No existe el intercambio que deseas seleccionar.");
    }

    const seleccion = {
        idUsuario: identificadorUsuario,
        idIntercambio: identificadorIntercambio,
        fechaSeleccion: new Date().toISOString()
    };

    await ejecutarSolicitud(
        "seleccionados",
        "readwrite",
        (almacen) => almacen.put(seleccion)
    );

    return seleccion;
}


export async function obtenerSeleccionados(idUsuario) {
    const identificadorUsuario = Number(idUsuario);

    if (!Number.isInteger(identificadorUsuario) || identificadorUsuario <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    const selecciones = await ejecutarSolicitud(
        "seleccionados",
        "readonly",
        (almacen) => almacen.index("idUsuario").getAll(identificadorUsuario)
    );

    const intercambios = await Promise.all(
        selecciones.map(async (seleccion) => {
            const intercambio = await obtenerIntercambioPorId(
                seleccion.idIntercambio
            );

            if (!intercambio) {
                return null;
            }

            return {
                ...intercambio,
                fechaSeleccion: seleccion.fechaSeleccion
            };
        })
    );

    return intercambios.filter(Boolean);
}


export async function eliminarSeleccion(idUsuario, idIntercambio) {
    const identificadorUsuario = Number(idUsuario);
    const identificadorIntercambio = Number(idIntercambio);

    if (!Number.isInteger(identificadorUsuario) || identificadorUsuario <= 0) {
        throw new Error("El identificador del usuario no es válido.");
    }

    if (!Number.isInteger(identificadorIntercambio) || identificadorIntercambio <= 0) {
        throw new Error("El identificador del intercambio no es válido.");
    }

    const seleccion = await ejecutarSolicitud(
        "seleccionados",
        "readonly",
        (almacen) => almacen.get([
            identificadorUsuario,
            identificadorIntercambio
        ])
    );

    if (!seleccion) {
        throw new Error("Este intercambio no está en la selección del usuario.");
    }

    await ejecutarSolicitud(
        "seleccionados",
        "readwrite",
        (almacen) => almacen.delete([
            identificadorUsuario,
            identificadorIntercambio
        ])
    );

    return true;
}
