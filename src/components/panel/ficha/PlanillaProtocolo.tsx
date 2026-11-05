"use client";

import Image from "next/image";
import { createContext, useContext, type KeyboardEvent, type ReactNode } from "react";
import { mostrarCalculo, type Calculo, type Celda, type CeldaCalculada, type ValoresProtocolo } from "@/lib/dominio/protocolo";

/** Los anchos de las columnas B a J del Excel. */
const COLUMNAS = [14.6, 10.35, 10.35, 10.35, 10.35, 13.9, 8.9, 11.25, 9.95];

function Columnas() {
  return (
    <colgroup>
      {COLUMNAS.map((ancho, i) => (
        <col key={i} style={{ width: `${ancho}%` }} />
      ))}
    </colgroup>
  );
}

/** Enter pasa a la celda que sigue, como en una planilla, en vez de enviar el formulario y cambiar de paso. */
function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
  if (evento.key !== "Enter" || !(evento.target instanceof HTMLInputElement)) return;
  evento.preventDefault();
  const celdas = [...evento.currentTarget.querySelectorAll<HTMLInputElement>("input:not(:disabled)")];
  const destino = celdas[celdas.indexOf(evento.target) + (evento.shiftKey ? -1 : 1)];
  destino?.focus();
  destino?.select();
}

interface PropsPlanilla {
  valores: ValoresProtocolo;
  calculo: Calculo;
  invalidas: ReadonlySet<Celda>;
  onCambio: (celda: Celda, texto: string) => void;
}

const ContextoPlanilla = createContext<PropsPlanilla | null>(null);

function Rotulo({ children, col, fil, fuerte }: { children: ReactNode; col?: number; fil?: number; fuerte?: boolean }) {
  return (
    <th colSpan={col} rowSpan={fil} className={fuerte ? "font-bold" : undefined}>
      {children}
    </th>
  );
}

/** La banda con el título de una sección. */
function Banda({ children, col = 9 }: { children: ReactNode; col?: number }) {
  return (
    <th colSpan={col} className="planilla-banda">
      {children}
    </th>
  );
}

/** Una celda para completar. `nombre` la identifica para lectores de pantalla. */
function Carga({ c, nombre, col, fil, texto }: { c: Celda; nombre: string; col?: number; fil?: number; texto?: boolean }) {
  const { valores, invalidas, onCambio } = useContext(ContextoPlanilla)!;
  return (
    <td colSpan={col} rowSpan={fil}>
      <input
        value={valores[c]}
        onChange={(e) => onCambio(c, e.target.value)}
        aria-label={nombre}
        aria-invalid={invalidas.has(c) ? true : undefined}
        inputMode={texto ? undefined : "decimal"}
        enterKeyHint="next"
        autoComplete="off"
        spellCheck={false}
        maxLength={texto ? 120 : 14}
        className={texto && (col ?? 1) <= 2 ? "planilla-angosta" : undefined}
        data-celda={c}
      />
    </td>
  );
}

/** Una celda que se calcula sola. */
function Cuenta({ c, col, resultado }: { c: CeldaCalculada; col?: number; resultado?: boolean }) {
  const { calculo } = useContext(ContextoPlanilla)!;
  return (
    <td colSpan={col} className={resultado ? "planilla-resultado" : "planilla-calculo"} data-celda={c}>
      {mostrarCalculo(calculo, c)}
    </td>
  );
}

/** Una celda sin nada, como en el Excel. */
function Vacia({ col, fil }: { col?: number; fil?: number }) {
  return <td colSpan={col} rowSpan={fil} />;
}

/**
 * La grilla del Excel del protocolo de ensayo, fila por fila y con las mismas celdas combinadas y los mismos rótulos.
 * Se completa lo mismo que en el Excel y lo demás se calcula mientras se escribe. En una pantalla angosta se desliza
 * de costado, sin desarmarla.
 */
export function PlanillaProtocolo(props: PropsPlanilla) {
  const { valores, onCambio } = props;

  return (
    <ContextoPlanilla value={props}>
      <div role="region" aria-label="Planilla del protocolo de ensayo" tabIndex={0} onKeyDown={alTeclear} className="overflow-x-auto">
        <table className="planilla">
          <Columnas />
          <tbody>
            <tr>
              <Rotulo fuerte>MARCA</Rotulo>
              <Carga c="C2" nombre="Marca" col={4} texto />
              <Rotulo fuerte>POT. kVA</Rotulo>
              <Carga c="H2" nombre="Potencia en kVA" />
              <Rotulo fuerte>N. FABRICA</Rotulo>
              <Carga c="J2" nombre="Número de fábrica" texto />
            </tr>
            <tr>
              <Rotulo fuerte>CLIENTE</Rotulo>
              <Carga c="C3" nombre="Cliente" col={4} texto />
              <Rotulo fuerte>GRUPO</Rotulo>
              <Carga c="H3" nombre="Grupo de conexión" texto />
              <Rotulo fuerte>TIPO</Rotulo>
              <Carga c="J3" nombre="Tipo" texto />
            </tr>
            <tr>
              <Rotulo fuerte>U primario (V)</Rotulo>
              <Carga c="C4" nombre="Tensiones" col={2} texto />
              <Rotulo fuerte>FECHA</Rotulo>
              <td>
                <input
                  type="date"
                  value={valores.F4}
                  onChange={(e) => onCambio("F4", e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  aria-label="Fecha"
                  enterKeyHint="next"
                  className="planilla-angosta"
                />
              </td>
              <Rotulo fuerte>Ucc %</Rotulo>
              <Carga c="H4" nombre="Ucc en porcentaje, de la chapa" />
              <Rotulo fuerte>ACEITE (lts)</Rotulo>
              <Carga c="J4" nombre="Aceite en litros" />
            </tr>
            <tr>
              <Rotulo fuerte>Orden N°</Rotulo>
              <Carga c="C5" nombre="Orden número" col={2} texto />
              <Rotulo fuerte>ID N°</Rotulo>
              <Carga c="F5" nombre="ID número" texto />
              <Rotulo fuerte>I primario (A)</Rotulo>
              <Carga c="H5" nombre="Intensidad del primario en amperes" />
              <Rotulo fuerte>I sec. (A)</Rotulo>
              <Carga c="J5" nombre="Intensidad del secundario en amperes" />
            </tr>

            <tr>
              <Banda>Valores nominales</Banda>
            </tr>
            <tr>
              <Rotulo fuerte>A.T. (V)</Rotulo>
              <Carga c="C7" nombre="Tensión de A.T. del punto 1" />
              <Carga c="D7" nombre="Tensión de A.T. del punto 2" />
              <Carga c="E7" nombre="Tensión de A.T. del punto 3" />
              <Carga c="F7" nombre="Tensión de A.T. del punto 4" />
              <Carga c="G7" nombre="Tensión de A.T. del punto 5" />
              <Rotulo>( V)</Rotulo>
              <Rotulo fuerte>B.T ( V )</Rotulo>
              <Carga c="J7" nombre="Tensión de B.T." />
            </tr>
            <tr>
              <Rotulo fuerte>A.T. (A)</Rotulo>
              <Cuenta c="C8" />
              <Cuenta c="D8" />
              <Cuenta c="E8" />
              <Cuenta c="F8" />
              <Cuenta c="G8" />
              <Rotulo>(A)</Rotulo>
              <Rotulo fuerte>B.T ( A )</Rotulo>
              <Cuenta c="J8" />
            </tr>

            <tr>
              <Banda col={6}>Relación de transformación</Banda>
              <td colSpan={3} rowSpan={9}>
                <Image src="/marca/tecvol-logo-protocolo.png" alt="Tecvol, ingeniería electromecánica" width={322} height={264} unoptimized className="mx-auto h-auto w-[85%] max-w-[11rem]" />
              </td>
            </tr>
            <tr>
              <Rotulo fuerte>POSICION</Rotulo>
              {[1, 2, 3, 4, 5].map((punto) => (
                <th key={punto} scope="col" className="font-bold">
                  {punto}
                </th>
              ))}
            </tr>
            <tr>
              <Rotulo>TEORICA</Rotulo>
              <Cuenta c="C12" />
              <Cuenta c="D12" />
              <Carga c="E12" nombre="Relación teórica del punto 3" />
              <Cuenta c="F12" />
              <Cuenta c="G12" />
            </tr>
            {(
              [
                ["U", 13, 16],
                ["V", 14, 17],
                ["W", 15, 18],
              ] as const
            ).map(([fase, fila]) => (
              <tr key={fase}>
                <Rotulo>Error Fase {fase}(%)</Rotulo>
                {(["C", "D", "E", "F", "G"] as const).map((columna) => (
                  <Cuenta key={columna} c={`${columna}${fila}`} />
                ))}
              </tr>
            ))}
            {(
              [
                ["U", 16],
                ["V", 17],
                ["W", 18],
              ] as const
            ).map(([fase, fila]) => (
              <tr key={fase}>
                <Rotulo fuerte>Rel. Fase {fase}</Rotulo>
                {(["C", "D", "E", "F", "G"] as const).map((columna, i) => (
                  <Carga key={columna} c={`${columna}${fila}`} nombre={`Relación medida, fase ${fase}, punto ${i + 1}`} />
                ))}
              </tr>
            ))}

            <tr>
              <Banda col={4}>Aplicada</Banda>
              <Vacia fil={3} />
              <Banda col={4}>Inducida</Banda>
            </tr>
            <tr>
              <Rotulo>AT/Masa [kV]</Rotulo>
              <Carga c="C20" nombre="Aplicada, AT contra masa en kV" />
              <Rotulo>Frec. [Hz]</Rotulo>
              <Carga c="E20" nombre="Aplicada, frecuencia en Hz" />
              <Rotulo>Tensión [V]</Rotulo>
              <Carga c="H20" nombre="Inducida, tensión en V" />
              <Rotulo>t [seg]</Rotulo>
              <Carga c="J20" nombre="Inducida, tiempo en segundos" />
            </tr>
            <tr>
              <Rotulo>t [seg]</Rotulo>
              <Carga c="C21" nombre="Aplicada, tiempo en segundos" />
              <Rotulo>I ens. [mA]</Rotulo>
              <Carga c="E21" nombre="Aplicada, corriente de ensayo en mA" />
              <Rotulo>Iens. [mA]</Rotulo>
              <Carga c="H21" nombre="Inducida, corriente de ensayo en mA, fase U" />
              <Carga c="I21" nombre="Inducida, corriente de ensayo en mA, fase V" />
              <Carga c="J21" nombre="Inducida, corriente de ensayo en mA, fase W" />
            </tr>

            <tr>
              <Banda>Ensayo en vacío</Banda>
            </tr>
            <tr>
              <Rotulo col={4} fuerte>
                Tensiones [V]
              </Rotulo>
              <Rotulo fil={2} fuerte>
                Temp. Amb. (ºC)
              </Rotulo>
              <Rotulo col={4} fuerte>
                Intensidades [A]
              </Rotulo>
            </tr>
            <tr>
              <Rotulo fuerte>Medido</Rotulo>
              <Rotulo fuerte>U-0</Rotulo>
              <Rotulo fuerte>V-0</Rotulo>
              <Rotulo fuerte>W-0</Rotulo>
              <Rotulo fuerte>Medido</Rotulo>
              <Rotulo fuerte>U</Rotulo>
              <Rotulo fuerte>V</Rotulo>
              <Rotulo fuerte>W</Rotulo>
            </tr>
            <tr>
              <Rotulo>Referido x K</Rotulo>
              <Carga c="C25" nombre="Vacío, lectura de tensión U-0" />
              <Carga c="D25" nombre="Vacío, lectura de tensión V-0" />
              <Carga c="E25" nombre="Vacío, lectura de tensión W-0" />
              <Carga c="F25" nombre="Vacío, temperatura ambiente" />
              <Rotulo>Referido x K</Rotulo>
              <Carga c="H25" nombre="Vacío, lectura de intensidad U" />
              <Carga c="I25" nombre="Vacío, lectura de intensidad V" />
              <Carga c="J25" nombre="Vacío, lectura de intensidad W" />
            </tr>
            <tr>
              <Carga c="B26" nombre="Vacío, K de las tensiones" />
              <Cuenta c="C26" />
              <Cuenta c="D26" />
              <Cuenta c="E26" />
              <Vacia />
              <Carga c="G26" nombre="Vacío, K de las intensidades" />
              <Cuenta c="H26" />
              <Cuenta c="I26" />
              <Cuenta c="J26" />
            </tr>
            <tr>
              <Rotulo>U med</Rotulo>
              <Cuenta c="C27" />
              <Vacia col={2} />
              <Vacia />
              <Rotulo>I prom.</Rotulo>
              <Cuenta c="H27" />
              <Vacia col={2} />
            </tr>
            <tr>
              <Rotulo col={4} fuerte>
                Potencia [W]
              </Rotulo>
              <Vacia />
              <Rotulo>Io (%)</Rotulo>
              <Cuenta c="H28" />
              <Vacia col={2} />
            </tr>
            <tr>
              <Rotulo fuerte>Medido</Rotulo>
              <Rotulo fuerte>W1</Rotulo>
              <Rotulo fuerte>W2</Rotulo>
              <Rotulo fuerte>W3</Rotulo>
              <Rotulo fuerte>P. VACIO</Rotulo>
              <Rotulo>Fact. Pot.</Rotulo>
              <Vacia col={3} />
            </tr>
            <tr>
              <Rotulo>Referido x K</Rotulo>
              <Carga c="C30" nombre="Vacío, lectura de potencia W1" />
              <Carga c="D30" nombre="Vacío, lectura de potencia W2" />
              <Carga c="E30" nombre="Vacío, lectura de potencia W3" />
              <Rotulo fuerte>(W)</Rotulo>
              <Carga c="G30" nombre="Vacío, factor de potencia" col={4} fil={2} texto />
            </tr>
            <tr>
              <Carga c="B31" nombre="Vacío, K de las potencias" />
              <Cuenta c="C31" />
              <Cuenta c="D31" />
              <Cuenta c="E31" />
              <Cuenta c="F31" resultado />
            </tr>

            <tr>
              <Banda>Ensayo en corto circuito</Banda>
            </tr>
            <tr>
              <Rotulo col={4} fuerte>
                Tensiones [V]
              </Rotulo>
              <Rotulo fil={2} fuerte>
                Temp. Amb. (ºC)
              </Rotulo>
              <Rotulo col={4} fuerte>
                Intensidades [A]
              </Rotulo>
            </tr>
            <tr>
              <Rotulo fuerte>Medido</Rotulo>
              <Rotulo fuerte>U-V</Rotulo>
              <Rotulo fuerte>V-W</Rotulo>
              <Rotulo fuerte>W-U</Rotulo>
              <Rotulo fuerte>Medido</Rotulo>
              <Rotulo fuerte>U</Rotulo>
              <Rotulo fuerte>V</Rotulo>
              <Rotulo fuerte>W</Rotulo>
            </tr>
            <tr>
              <Rotulo>Referido x K</Rotulo>
              <Carga c="C35" nombre="Cortocircuito, lectura de tensión U-V" />
              <Carga c="D35" nombre="Cortocircuito, lectura de tensión V-W" />
              <Carga c="E35" nombre="Cortocircuito, lectura de tensión W-U" />
              <Carga c="F35" nombre="Cortocircuito, temperatura ambiente" />
              <Rotulo>Referido x K</Rotulo>
              <Carga c="H35" nombre="Cortocircuito, lectura de intensidad U" />
              <Carga c="I35" nombre="Cortocircuito, lectura de intensidad V" />
              <Carga c="J35" nombre="Cortocircuito, lectura de intensidad W" />
            </tr>
            <tr>
              <Carga c="B36" nombre="Cortocircuito, K de las tensiones" />
              <Cuenta c="C36" />
              <Cuenta c="D36" />
              <Cuenta c="E36" />
              <Vacia />
              <Carga c="G36" nombre="Cortocircuito, K de las intensidades" />
              <Cuenta c="H36" />
              <Cuenta c="I36" />
              <Cuenta c="J36" />
            </tr>
            <tr>
              <Rotulo>U med</Rotulo>
              <Cuenta c="C37" />
              <Rotulo fuerte>Ucc %</Rotulo>
              <Cuenta c="E37" />
              <Rotulo fuerte>K</Rotulo>
              <Rotulo>I med (prom)</Rotulo>
              <Cuenta c="H37" resultado />
              <Vacia col={2} />
            </tr>
            <tr>
              <Rotulo>Ucc a In</Rotulo>
              <Cuenta c="C38" />
              <Rotulo fuerte>Ucc % [75º]</Rotulo>
              <Cuenta c="E38" />
              <Cuenta c="F38" />
              <Rotulo>I nominal</Rotulo>
              <Cuenta c="H38" />
              <Rotulo fuerte>In/Im</Rotulo>
              <Cuenta c="J38" />
            </tr>
            <tr>
              <Rotulo col={4} fuerte>
                Potencia [W]
              </Rotulo>
              <Vacia col={5} />
            </tr>
            <tr>
              <Rotulo fuerte>Medido</Rotulo>
              <Rotulo fuerte>W1</Rotulo>
              <Rotulo fuerte>W2</Rotulo>
              <Rotulo fuerte>W3</Rotulo>
              <Rotulo fuerte>Total(W)</Rotulo>
              <Rotulo col={4} fuerte>
                Perdidas Referidas a 75ºC [W]
              </Rotulo>
            </tr>
            <tr>
              <Rotulo>Referido x K</Rotulo>
              <Carga c="C41" nombre="Cortocircuito, lectura de potencia W1" />
              <Carga c="D41" nombre="Cortocircuito, lectura de potencia W2" />
              <Carga c="E41" nombre="Cortocircuito, lectura de potencia W3" />
              <Vacia />
              <Vacia col={4} />
            </tr>
            <tr>
              <Carga c="B42" nombre="Cortocircuito, K de las potencias" />
              <Cuenta c="C42" />
              <Cuenta c="D42" />
              <Cuenta c="E42" />
              <Cuenta c="F42" />
              <Cuenta c="G42" col={4} resultado />
            </tr>
            <tr>
              <Rotulo fuerte>Pcc Total (W)</Rotulo>
              <Cuenta c="C43" />
              <Rotulo col={2} fuerte>
                Pcc (amb.) a In (W)
              </Rotulo>
              <Cuenta c="F43" />
              <Vacia col={4} />
            </tr>
            <tr>
              <Rotulo fuerte>Fact. Pot.</Rotulo>
              <Vacia col={3} />
              <Rotulo col={5} fuerte>
                Perdidas Totales (Po + Pcu) [W]
              </Rotulo>
            </tr>
            <tr>
              <Carga c="B45" nombre="Cortocircuito, factor de potencia" col={4} texto />
              <Cuenta c="F45" col={5} resultado />
            </tr>

            <tr>
              <Carga c="B46" nombre="Nombre del laboratorista" col={4} texto />
              <Carga c="F46" nombre="Nombre de quien firma por Tecvol" col={5} texto />
            </tr>
            <tr>
              <Rotulo col={4} fuerte>
                FIRMA LABORATORISTA
              </Rotulo>
              <Rotulo col={5} fuerte>
                FIRMA TECVOL S.R.L.
              </Rotulo>
            </tr>
            <tr>
              <Carga c="B50" nombre="Nombre del inspector" col={9} texto />
            </tr>
            <tr>
              <Rotulo col={9} fuerte>
                FIRMA INSPECTOR
              </Rotulo>
            </tr>
          </tbody>
        </table>

        <table className="planilla mt-5">
          <Columnas />
          <tbody>
            <tr>
              <Rotulo col={2} fuerte>
                AISLACION (60s)
              </Rotulo>
              <Rotulo fuerte>VALOR</Rotulo>
              <Rotulo fuerte>UNIDAD</Rotulo>
            </tr>
            {(
              [
                ["D56", "AT / Tierra (5000V)"],
                ["D57", "BT / Tierra (2500V)"],
                ["D58", "AT / BT (5000V)"],
              ] as const
            ).map(([celda, nombre]) => (
              <tr key={celda}>
                <Rotulo col={2}>{nombre}</Rotulo>
                <Carga c={celda} nombre={`Aislación ${nombre}, en GΩ`} />
                {/* Barlow no tiene la Ω: va con Arial, como en el resto del panel. */}
                <td className="[font-family:Arial,sans-serif]">GΩ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContextoPlanilla>
  );
}
