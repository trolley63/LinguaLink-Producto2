
const NOMBRE_BASE_DATOS = "LinguaLinkDB";
const VERSION_BASE_DATOS = 1;

let promesaBaseDatos = null;

// Abre la base de datos o la crea si todavía no existe.
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

        // Se ejecuta cuando la base de datos se crea
        // o cuando necesita actualizar su estructura.
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

            // Almacén de intercambios seleccionados en el Dashboard.
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

            // Permite cerrar la conexión si cambia la versión.
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
