import { describe, expect, it } from "vitest";
import {
  activarInvitado,
  esInvitadoLocal,
  estadoCuenta,
  nombreVisibleDeCorreo,
  traducirErrorLector,
} from "./cuenta";

function memoria() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe("cuenta de lector y modo invitado", () => {
  it("traduce errores técnicos de acceso a lenguaje claro", () => {
    expect(traducirErrorLector("Invalid login credentials")).toContain("no coinciden");
    expect(traducirErrorLector("User already registered")).toContain("Ya existe");
    expect(traducirErrorLector("Password should be at least 6 characters")).toContain(
      "8 caracteres",
    );
    expect(traducirErrorLector("Rate limit exceeded")).toContain("Demasiados intentos");
  });

  it("deriva un nombre legible del correo si no hay perfil previo", () => {
    expect(nombreVisibleDeCorreo("sofia.morales@ejemplo.mx")).toBe("Sofia.morales");
    expect(nombreVisibleDeCorreo("")).toBe("Lector");
  });

  it("activa el modo invitado en el almacenamiento proporcionado y actualiza el estado", () => {
    const store = memoria();
    expect(esInvitadoLocal(store)).toBe(false);
    activarInvitado(store);
    expect(esInvitadoLocal(store)).toBe(true);
    expect(estadoCuenta().modo).toBe("invitado");
    expect(estadoCuenta().lector).toBeNull();
  });
});
