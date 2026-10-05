import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { ConsultaNueva } from "@/lib/dominio/tipos";
import type { ConsultasRepositorio } from "../repositorios";
import { obtenerFirestore } from "./app";

/** Crea `consultas/{id}`. Las reglas validan campos y largos; solo el personal las lee. */
export class ConsultasFirestore implements ConsultasRepositorio {
  async crear(consulta: ConsultaNueva): Promise<void> {
    // Firestore rechaza `undefined`: los campos opcionales vacíos no se envían.
    const campos = Object.fromEntries(
      Object.entries(consulta).filter(([, valor]) => typeof valor === "string" && valor.length > 0),
    );
    await addDoc(collection(obtenerFirestore(), "consultas"), {
      ...campos,
      estado: "nueva",
      creada: serverTimestamp(),
    });
  }
}
