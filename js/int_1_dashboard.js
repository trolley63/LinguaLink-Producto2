
import {
    obtenerIntercambios,
    obtenerUsuarioActivo,
    obtenerSeleccionados
} from "./almacenaje.js";

const zonaDisponibles = document.getElementById(
    "intercambiosDisponibles"
);

const zonaSeleccionados = document.getElementById(
    "intercambiosSeleccionados"
);

let usuarioActivo = null;


// Formatea la fecha para mostrarla en las tarjetas.
function formatearFecha(fecha) {
    const fechaLocal = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(fechaLocal.getTime())) {
        return fecha;
    }

    return fechaLocal.toLocaleDateString("es-ES");
}


// Crea una tarjeta con la información de un intercambio.
function crearTarjeta(intercambio) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "card shadow-sm";

    const cuerpo = document.createElement("div");
    cuerpo.className = "card-body";

    const cabecera = document.createElement("div");
    cabecera.className = "d-flex justify-content-between align-items-start gap-2 mb-3";

    const titulo = document.createElement("h3");
    titulo.className = "h6 mb-0";
    titulo.textContent = intercambio.titulo;

    const tipo = document.createElement("span");

    if (intercambio.tipo === "Ofrezco idioma") {
        tipo.className = "badge text-bg-primary";
    } else {
        tipo.className = "badge text-bg-success";
    }

    tipo.textContent = intercambio.tipo;

    cabecera.append(titulo, tipo);

    const descripcion = document.createElement("p");
    descripcion.className = "card-text mb-3";
    descripcion.textContent = intercambio.descripcion;

    const informacion = document.createElement("div");
    informacion.className = "border-top pt-2";

    const correo = document.createElement("p");
    correo.className = "small text-secondary mb-1";
    correo.textContent = `Publicado por: ${intercambio.email}`;

    const fecha = document.createElement("p");
    fecha.className = "small text-secondary mb-0";
    fecha.textContent = `Fecha: ${formatearFecha(intercambio.fecha)}`;

    informacion.append(correo, fecha);

    cuerpo.append(cabecera, descripcion, informacion);
    tarjeta.appendChild(cuerpo);

    return tarjeta;
}


// Muestra un mensaje cuando una zona no tiene intercambios.
function mostrarMensajeVacio(zona, texto) {
    const mensaje = document.createElement("div");

    mensaje.className = "text-center text-secondary py-4";
    mensaje.textContent = texto;

    zona.replaceChildren(mensaje);
}


// Muestra las tarjetas de los intercambios disponibles.
function mostrarDisponibles(intercambios) {
    zonaDisponibles.replaceChildren();

    if (intercambios.length === 0) {
        mostrarMensajeVacio(
            zonaDisponibles,
            "No hay intercambios disponibles."
        );
        return;
    }

    intercambios.forEach((intercambio) => {
        zonaDisponibles.appendChild(
            crearTarjeta(intercambio)
        );
    });
}


// Muestra las tarjetas de los intercambios seleccionados.
function mostrarSeleccionados(intercambios) {
    zonaSeleccionados.replaceChildren();

    if (!usuarioActivo) {
        mostrarMensajeVacio(
            zonaSeleccionados,
            "Inicia sesión para guardar tus intercambios seleccionados."
        );
        return;
    }

    if (intercambios.length === 0) {
        mostrarMensajeVacio(
            zonaSeleccionados,
            "Todavía no has seleccionado ningún intercambio."
        );
        return;
    }

    intercambios.forEach((intercambio) => {
        zonaSeleccionados.appendChild(
            crearTarjeta(intercambio)
        );
    });
}


// Recupera los datos y actualiza las dos columnas.
async function cargarDashboard() {
    try {
        usuarioActivo = await obtenerUsuarioActivo();

        const intercambios = await obtenerIntercambios();

        let seleccionados = [];

        if (usuarioActivo) {
            seleccionados = await obtenerSeleccionados(
                usuarioActivo.id
            );
        }

        const idsSeleccionados = new Set(
            seleccionados.map(intercambio => Number(intercambio.id))
        );

        const intercambiosDisponibles = intercambios.filter(
            intercambio => !idsSeleccionados.has(Number(intercambio.id))
        );

        intercambiosDisponibles.sort((a, b) => {
            return new Date(a.fecha) - new Date(b.fecha);
        });

        seleccionados.sort((a, b) => {
            return new Date(a.fecha) - new Date(b.fecha);
        });

        mostrarDisponibles(intercambiosDisponibles);
        mostrarSeleccionados(seleccionados);

    } catch (error) {
        console.error("Error al cargar el Dashboard:", error);

        mostrarMensajeVacio(
            zonaDisponibles,
            "No se han podido cargar los intercambios."
        );

        mostrarMensajeVacio(
            zonaSeleccionados,
            "No se han podido recuperar tus selecciones."
        );
    }
}


// Inicializa el Dashboard.
function inicializarDashboard() {
    cargarDashboard();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarDashboard
    );
} else {
    inicializarDashboard();
}
