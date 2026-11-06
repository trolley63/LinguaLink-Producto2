
import {
    obtenerUsuarioActivo,
    cerrarSesion
} from "./almacenaje.js";

async function actualizarNavegacion() {
    const enlaceLogin = document.querySelector(
        '.navbar-nav a[href="login.html"]'
    );

    if (!enlaceLogin) {
        return;
    }

    const usuario = await obtenerUsuarioActivo();

    if (!usuario) {
        return;
    }

    const elementoMenu = enlaceLogin.closest(".nav-item");

    if (!elementoMenu) {
        return;
    }

    const nombreUsuario = document.createElement("span");
    nombreUsuario.className = "navbar-text text-light px-2";
    nombreUsuario.textContent = usuario.nombre;

    const enlaceSalir = document.createElement("a");
    enlaceSalir.className = "nav-link";
    enlaceSalir.href = "login.html";
    enlaceSalir.textContent = "Salir";

    enlaceSalir.addEventListener("click", (evento) => {
        evento.preventDefault();
        cerrarSesion();
        window.location.href = "login.html";
    });

    elementoMenu.replaceChildren(nombreUsuario, enlaceSalir);
    elementoMenu.classList.add(
        "d-flex",
        "align-items-center",
        "gap-2"
    );
}

async function inicializarNavegacion() {
    try {
        await actualizarNavegacion();
    } catch (error) {
        console.error("Error al actualizar la navegación:", error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarNavegacion
    );
} else {
    inicializarNavegacion();
}

