
import {
    crearUsuario,
    obtenerUsuarios,
    actualizarUsuario,
    eliminarUsuario
} from "./almacenaje.js";

const formulario = document.getElementById("formUsuario");
const campoNombre = document.getElementById("nombreUsuario");
const campoEmail = document.getElementById("emailUsuario");
const campoPassword = document.getElementById("passwordUsuario");

const listaUsuarios = document.getElementById("listaUsuarios");
const mensajeUsuarios = document.getElementById("mensajeUsuarios");

const tituloFormulario = document.getElementById("tituloFormulario");
const botonGuardar = document.getElementById("btnGuardarUsuario");
const botonLimpiar = document.getElementById("btnLimpiarUsuario");

let usuarioEditandoId = null;


// Muestra mensajes de información, éxito o error.
function mostrarMensaje(texto, tipo = "success") {
    mensajeUsuarios.className = `alert alert-${tipo} mt-3 mb-0`;
    mensajeUsuarios.textContent = texto;
}


// Oculta el mensaje.
function ocultarMensaje() {
    mensajeUsuarios.classList.add("d-none");
    mensajeUsuarios.textContent = "";
}


// Configura el formulario para registrar un usuario.
function configurarModoCreacion() {
    usuarioEditandoId = null;

    tituloFormulario.textContent = "Registrar nuevo usuario";
    botonGuardar.textContent = "Crear usuario";
    botonLimpiar.textContent = "Limpiar";

    campoPassword.required = true;
    campoPassword.minLength = 4;
    campoPassword.placeholder = "Mínimo 4 caracteres";
    campoPassword.value = "";
}


// Prepara el formulario para modificar un usuario.
function prepararEdicion(usuario) {
    usuarioEditandoId = usuario.id;

    campoNombre.value = usuario.nombre;
    campoEmail.value = usuario.email;
    campoPassword.value = "";

    campoPassword.required = false;
    campoPassword.placeholder = "Dejar vacío para conservar la contraseña";

    tituloFormulario.textContent = "Editar usuario";
    botonGuardar.textContent = "Guardar cambios";
    botonLimpiar.textContent = "Cancelar";

    mostrarMensaje(
        `Estás modificando los datos de ${usuario.nombre}.`,
        "info"
    );

    campoNombre.focus();
}


// Crea los elementos de la tabla de usuarios.
function mostrarUsuarios(usuarios) {
    listaUsuarios.replaceChildren();

    if (usuarios.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 3;
        celda.className = "text-center text-secondary py-4";
        celda.textContent = "Todavía no hay usuarios registrados.";

        fila.appendChild(celda);
        listaUsuarios.appendChild(fila);

        return;
    }

    usuarios.forEach((usuario) => {
        const fila = document.createElement("tr");

        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = usuario.nombre;

        const celdaEmail = document.createElement("td");
        celdaEmail.textContent = usuario.email;

        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-center";

        const contenedorBotones = document.createElement("div");
        contenedorBotones.className =
            "d-flex justify-content-center gap-2";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className = "btn btn-sm btn-outline-primary";
        botonEditar.textContent = "Editar";

        botonEditar.addEventListener("click", () => {
            prepararEdicion(usuario);
        });

        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className = "btn btn-sm btn-outline-danger";
        botonEliminar.textContent = "Eliminar";

        botonEliminar.addEventListener("click", () => {
            gestionarEliminacion(usuario);
        });

        contenedorBotones.append(
            botonEditar,
            botonEliminar
        );

        celdaAcciones.appendChild(contenedorBotones);

        fila.append(
            celdaNombre,
            celdaEmail,
            celdaAcciones
        );

        listaUsuarios.appendChild(fila);
    });
}


// Recupera los usuarios y actualiza la tabla.
async function cargarUsuarios() {
    const usuarios = await obtenerUsuarios();
    mostrarUsuarios(usuarios);
}


// Gestiona el envío del formulario.
async function gestionarFormulario(evento) {
    evento.preventDefault();

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const datosUsuario = {
        nombre: campoNombre.value,
        email: campoEmail.value,
        password: campoPassword.value
    };

    try {
        if (usuarioEditandoId === null) {
            await crearUsuario(datosUsuario);

            await cargarUsuarios();

            formulario.reset();

            mostrarMensaje(
                "El usuario se ha registrado correctamente.",
                "success"
            );

        } else {
            await actualizarUsuario(
                usuarioEditandoId,
                datosUsuario
            );

            await cargarUsuarios();

            formulario.reset();

            mostrarMensaje(
                "Los datos del usuario se han actualizado correctamente.",
                "success"
            );
        }

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}


// Gestiona la eliminación de un usuario.
async function gestionarEliminacion(usuario) {
    const confirmar = window.confirm(
        `¿Estás seguro de que deseas eliminar al usuario ${usuario.nombre}?`
    );

    if (!confirmar) {
        return;
    }

    try {
        await eliminarUsuario(usuario.id);

        if (usuarioEditandoId === usuario.id) {
            formulario.reset();
        }

        await cargarUsuarios();

        mostrarMensaje(
            "El usuario se ha eliminado correctamente.",
            "danger"
        );

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}


// Inicializa los eventos y carga los usuarios.
async function inicializarUsuarios() {

    formulario.addEventListener(
        "submit",
        gestionarFormulario
    );

    formulario.addEventListener("reset", () => {
        configurarModoCreacion();
        ocultarMensaje();
    });

    configurarModoCreacion();

    try {
        await cargarUsuarios();
    } catch (error) {
        mostrarMensaje(
            `No se pudieron cargar los usuarios: ${error.message}`,
            "danger"
        );
    }
}


if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarUsuarios
    );
} else {
    inicializarUsuarios();
}
