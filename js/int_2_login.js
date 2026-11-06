
import { loguearUsuario } from "./almacenaje.js";

const formulario = document.getElementById("formLogin");
const campoEmail = document.getElementById("emailLogin");
const campoPassword = document.getElementById("passwordLogin");
const mensajeLogin = document.getElementById("mensajeLogin");
const botonLogin = document.getElementById("btnLogin");

function mostrarMensaje(texto, tipo) {
    mensajeLogin.className = `alert alert-${tipo} mt-3 mb-0`;
    mensajeLogin.textContent = texto;
}

function ocultarMensaje() {
    mensajeLogin.classList.add("d-none");
    mensajeLogin.textContent = "";
}

async function gestionarInicioSesion(evento) {
    evento.preventDefault();

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const email = campoEmail.value.trim();
    const password = campoPassword.value;

    botonLogin.disabled = true;
    botonLogin.textContent = "Comprobando credenciales...";

    try {
        const usuario = await loguearUsuario(email, password);

        if (!usuario) {
            mostrarMensaje(
                "El correo electrónico o la contraseña son incorrectos.",
                "danger"
            );

            campoPassword.value = "";
            campoPassword.focus();
            return;
        }

        mostrarMensaje(
            `Bienvenido a LinguaLink, ${usuario.nombre}. Redirigiendo...`,
            "success"
        );

        botonLogin.textContent = "Acceso correcto";

        setTimeout(() => {
            window.location.href = "index.html";
        }, 800);

    } catch (error) {
        mostrarMensaje(
            `No se ha podido iniciar sesión: ${error.message}`,
            "danger"
        );
    } finally {
        botonLogin.disabled = false;

        if (botonLogin.textContent !== "Acceso correcto") {
            botonLogin.textContent = "Iniciar sesión";
        }
    }
}

function inicializarLogin() {
    formulario.addEventListener("submit", gestionarInicioSesion);

    formulario.addEventListener("input", ocultarMensaje);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarLogin);
} else {
    inicializarLogin();
}
