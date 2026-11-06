
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


function generarGraficoCanvas(intercambios) {
    const canvas = document.getElementById("graficoIntercambios");

    if (!canvas) {
        return;
    }

    const contexto = canvas.getContext("2d");

    if (!contexto) {
        return;
    }

    const ancho = canvas.width;
    const alto = canvas.height;

    contexto.clearRect(0, 0, ancho, alto);

    const usuarios = new Map();

    intercambios.forEach((intercambio) => {
        const email = intercambio.email || `Usuario ${intercambio.idUsuario}`;

        if (!usuarios.has(email)) {
            usuarios.set(email, {
                email,
                ofrece: 0,
                busca: 0
            });
        }

        const usuario = usuarios.get(email);

        if (intercambio.tipo === "Ofrezco idioma") {
            usuario.ofrece++;
        } else if (intercambio.tipo === "Busco idioma") {
            usuario.busca++;
        }
    });

    const datos = Array.from(usuarios.values());

    if (datos.length === 0) {
        contexto.fillStyle = "#6c757d";
        contexto.font = "16px Arial";
        contexto.textAlign = "center";
        contexto.fillText(
            "No hay datos disponibles para representar.",
            ancho / 2,
            alto / 2
        );
        return;
    }

    const margen = {
        superior: 55,
        inferior: 70,
        izquierdo: 65,
        derecho: 30
    };

    const anchoGrafico = ancho - margen.izquierdo - margen.derecho;
    const altoGrafico = alto - margen.superior - margen.inferior;

    const maximoValor = Math.max(
        1,
        ...datos.map(usuario => Math.max(usuario.ofrece, usuario.busca))
    );

    const escalaMaxima = Math.max(5, Math.ceil(maximoValor / 5) * 5);

    // Dibujar leyenda.
    contexto.font = "13px Arial";
    contexto.textAlign = "left";

    contexto.fillStyle = "#0d6efd";
    contexto.fillRect(270, 15, 16, 16);
    contexto.fillStyle = "#212529";
    contexto.fillText("Ofrezco idioma", 293, 28);

    contexto.fillStyle = "#198754";
    contexto.fillRect(460, 15, 16, 16);
    contexto.fillStyle = "#212529";
    contexto.fillText("Busco idioma", 483, 28);

    // Dibujar líneas horizontales y valores del eje vertical.
    contexto.strokeStyle = "#dee2e6";
    contexto.lineWidth = 1;
    contexto.font = "12px Arial";
    contexto.textAlign = "right";
    contexto.textBaseline = "middle";

    for (let i = 0; i <= 5; i++) {
        const valor = (escalaMaxima / 5) * i;
        const posicionY = margen.superior + altoGrafico -
            (valor / escalaMaxima) * altoGrafico;

        contexto.beginPath();
        contexto.moveTo(margen.izquierdo, posicionY);
        contexto.lineTo(ancho - margen.derecho, posicionY);
        contexto.stroke();

        contexto.fillStyle = "#6c757d";
        contexto.fillText(
            valor.toString(),
            margen.izquierdo - 12,
            posicionY
        );
    }

    // Dibujar las barras de cada usuario.
    const anchoGrupo = anchoGrafico / datos.length;

    datos.forEach((usuario, indice) => {
        const centroGrupo =
            margen.izquierdo + anchoGrupo * indice + anchoGrupo / 2;

        const anchoBarras = Math.min(60, anchoGrupo * 0.75);
        const anchoBarra = anchoBarras * 0.42;
        const separacion = anchoBarras * 0.16;

        const posicionOfrece =
            centroGrupo - separacion / 2 - anchoBarra;

        const posicionBusca = centroGrupo + separacion / 2;

        const alturaOfrece =
            (usuario.ofrece / escalaMaxima) * altoGrafico;

        const alturaBusca =
            (usuario.busca / escalaMaxima) * altoGrafico;

        const baseY = margen.superior + altoGrafico;

        contexto.fillStyle = "#0d6efd";
        contexto.fillRect(
            posicionOfrece,
            baseY - alturaOfrece,
            anchoBarra,
            alturaOfrece
        );

        contexto.fillStyle = "#198754";
        contexto.fillRect(
            posicionBusca,
            baseY - alturaBusca,
            anchoBarra,
            alturaBusca
        );

        // Mostrar los valores encima de las barras.
        contexto.fillStyle = "#212529";
        contexto.font = "12px Arial";
        contexto.textAlign = "center";
        contexto.textBaseline = "bottom";

        if (usuario.ofrece > 0) {
            contexto.fillText(
                usuario.ofrece.toString(),
                posicionOfrece + anchoBarra / 2,
                baseY - alturaOfrece - 5
            );
        }

        if (usuario.busca > 0) {
            contexto.fillText(
                usuario.busca.toString(),
                posicionBusca + anchoBarra / 2,
                baseY - alturaBusca - 5
            );
        }

        // Mostrar el correo debajo de cada grupo.
        const etiqueta = usuario.email.length > 18
            ? usuario.email.substring(0, 16) + "…"
            : usuario.email;

        contexto.fillStyle = "#495057";
        contexto.font = "12px Arial";
        contexto.textAlign = "center";
        contexto.textBaseline = "top";

        contexto.fillText(
            etiqueta,
            centroGrupo,
            baseY + 14,
            anchoGrupo - 6
        );
    });
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
    generarGraficoCanvas(intercambios);
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
