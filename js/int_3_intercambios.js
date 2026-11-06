
import {
    crearIntercambio,
    obtenerIntercambios,
    actualizarIntercambio,
    eliminarIntercambio,
    obtenerUsuarioActivo
} from "./almacenaje.js";

const formulario = document.getElementById("formIntercambio");
const campoTitulo = document.getElementById("tituloIntercambio");
const campoEmail = document.getElementById("emailIntercambio");
const campoFecha = document.getElementById("fechaIntercambio");
const campoDescripcion = document.getElementById("descripcionIntercambio");
const campoTipo = document.getElementById("tipoIntercambio");

const listaIntercambios = document.getElementById("listaIntercambios");
const mensajeIntercambios = document.getElementById("mensajeIntercambios");

const tituloFormulario = document.getElementById("tituloFormularioIntercambio");
const botonGuardar = document.getElementById("btnGuardarIntercambio");
const botonLimpiar = document.getElementById("btnLimpiarIntercambio");

let usuarioActivo = null;
let intercambioEditandoId = null;


// Muestra mensajes de información, éxito o error.
function mostrarMensaje(texto, tipo = "success") {
    mensajeIntercambios.className = `alert alert-${tipo} mt-3 mb-0`;
    mensajeIntercambios.textContent = texto;
}

function ocultarMensaje() {
    mensajeIntercambios.classList.add("d-none");
    mensajeIntercambios.textContent = "";
}


// Configura el formulario para crear un intercambio.
function configurarModoCreacion() {
    intercambioEditandoId = null;

    tituloFormulario.textContent = "Crear intercambio";
    botonGuardar.textContent = "Crear intercambio";
    campoEmail.value = usuarioActivo?.email || "";
}


// Prepara el formulario para modificar un intercambio.
function prepararEdicion(intercambio) {
    if (!usuarioActivo || intercambio.idUsuario !== usuarioActivo.id) {
        mostrarMensaje(
            "No puedes modificar intercambios publicados por otros usuarios.",
            "danger"
        );
        return;
    }

    intercambioEditandoId = intercambio.id;

    campoTitulo.value = intercambio.titulo;
    campoEmail.value = usuarioActivo.email;
    campoFecha.value = intercambio.fecha;
    campoDescripcion.value = intercambio.descripcion;
    campoTipo.value = intercambio.tipo;

    tituloFormulario.textContent = "Editar intercambio";
    botonGuardar.textContent = "Guardar cambios";

    mostrarMensaje(
        `Estás modificando el intercambio: ${intercambio.titulo}.`,
        "info"
    );

    campoTitulo.focus();
}


// Formatea las fechas para mostrarlas en la tabla.
function formatearFecha(fecha) {
    const fechaLocal = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(fechaLocal.getTime())) {
        return fecha;
    }

    return fechaLocal.toLocaleDateString("es-ES");
}


// Construye y actualiza la tabla de intercambios.
function mostrarIntercambios(intercambios) {
    listaIntercambios.replaceChildren();

    if (intercambios.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "text-center text-secondary py-4";
        celda.textContent = "Todavía no hay intercambios registrados.";

        fila.appendChild(celda);
        listaIntercambios.appendChild(fila);

        return;
    }

    intercambios.forEach((intercambio) => {
        const fila = document.createElement("tr");

        const celdaTitulo = document.createElement("td");
        celdaTitulo.textContent = intercambio.titulo;

        const celdaEmail = document.createElement("td");
        celdaEmail.textContent = intercambio.email;

        const celdaFecha = document.createElement("td");
        celdaFecha.textContent = formatearFecha(intercambio.fecha);

        const celdaDescripcion = document.createElement("td");
        celdaDescripcion.textContent = intercambio.descripcion;

        const celdaTipo = document.createElement("td");
        celdaTipo.textContent = intercambio.tipo;

        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-center";

        if (
            usuarioActivo &&
            Number(intercambio.idUsuario) === Number(usuarioActivo.id)
        ) {
            const contenedorBotones = document.createElement("div");

            contenedorBotones.className =
                "d-flex justify-content-center gap-2";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn btn-sm btn-outline-primary";
            botonEditar.textContent = "Editar";

            botonEditar.addEventListener("click", () => {
                prepararEdicion(intercambio);
            });

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.textContent = "Eliminar";

            botonEliminar.addEventListener("click", () => {
                gestionarEliminacion(intercambio);
            });

            contenedorBotones.append(botonEditar, botonEliminar);
            celdaAcciones.appendChild(contenedorBotones);
        } else {
            celdaAcciones.textContent = "—";
        }

        fila.append(
            celdaTitulo,
            celdaEmail,
            celdaFecha,
            celdaDescripcion,
            celdaTipo,
            celdaAcciones
        );

        listaIntercambios.appendChild(fila);
    });
}


// Recupera los intercambios y actualiza la tabla.
async function cargarIntercambios() {
    const intercambios = await obtenerIntercambios();

    intercambios.sort((a, b) => {
        return new Date(a.fecha) - new Date(b.fecha);
    });

    mostrarIntercambios(intercambios);
}


// Comprueba la sesión y habilita o deshabilita el formulario.
async function comprobarAcceso() {
    usuarioActivo = await obtenerUsuarioActivo();

    const controles = formulario.querySelectorAll(
        "input, select, textarea, button"
    );

    controles.forEach((control) => {
        control.disabled = !usuarioActivo;
    });

    if (usuarioActivo) {
        campoEmail.value = usuarioActivo.email;
        ocultarMensaje();
    } else {
        campoEmail.value = "";

        mostrarMensaje(
            "Inicia sesión para publicar o gestionar tus intercambios. Puedes consultar las publicaciones disponibles.",
            "warning"
        );
    }
}


// Gestiona el envío del formulario.
async function gestionarFormulario(evento) {
    evento.preventDefault();

    if (!usuarioActivo) {
        mostrarMensaje(
            "Debes iniciar sesión para publicar o modificar intercambios.",
            "danger"
        );
        return;
    }

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const datosIntercambio = {
        titulo: campoTitulo.value,
        fecha: campoFecha.value,
        descripcion: campoDescripcion.value,
        tipo: campoTipo.value,
        idUsuario: usuarioActivo.id
    };

    botonGuardar.disabled = true;

    try {
        if (intercambioEditandoId === null) {
            await crearIntercambio(datosIntercambio);

            mostrarMensaje(
                "El intercambio se ha creado correctamente.",
                "success"
            );

        } else {
            await actualizarIntercambio(
                intercambioEditandoId,
                datosIntercambio
            );

            mostrarMensaje(
                "El intercambio se ha actualizado correctamente.",
                "success"
            );
        }

        formulario.reset();
        configurarModoCreacion();

        await cargarIntercambios();

    } catch (error) {
        mostrarMensaje(error.message, "danger");

    } finally {
        botonGuardar.disabled = false;
    }
}


// Gestiona la eliminación de un intercambio.
async function gestionarEliminacion(intercambio) {
    if (
        !usuarioActivo ||
        Number(intercambio.idUsuario) !== Number(usuarioActivo.id)
    ) {
        mostrarMensaje(
            "No puedes eliminar intercambios publicados por otros usuarios.",
            "danger"
        );
        return;
    }

    const confirmar = window.confirm(
        `¿Deseas eliminar el intercambio "${intercambio.titulo}"?`
    );

    if (!confirmar) {
        return;
    }

    try {
        await eliminarIntercambio(intercambio.id);

        if (intercambioEditandoId === intercambio.id) {
            formulario.reset();
            configurarModoCreacion();
        }

        await cargarIntercambios();

        mostrarMensaje(
            "El intercambio se ha eliminado correctamente.",
            "danger"
        );

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}


// Inicializa los eventos y carga los datos.
async function inicializarIntercambios() {
    formulario.addEventListener("submit", gestionarFormulario);

    formulario.addEventListener("reset", () => {
        intercambioEditandoId = null;

        tituloFormulario.textContent = "Crear intercambio";
        botonGuardar.textContent = "Crear intercambio";

        setTimeout(() => {
            campoEmail.value = usuarioActivo?.email || "";
            ocultarMensaje();
        }, 0);
    });

    try {
        await comprobarAcceso();
        await cargarIntercambios();

    } catch (error) {
        mostrarMensaje(
            `No se pudieron cargar los intercambios: ${error.message}`,
            "danger"
        );
    }
}


if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarIntercambios
    );
} else {
    inicializarIntercambios();
}
