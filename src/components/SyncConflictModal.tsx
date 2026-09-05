import Modal, { BotonPrimario, BotonSecundario } from "./portfolio/Modal";
import { ConflictoSync } from "../hooks/useAuth";
import { PortfolioBackup } from "../lib/portfolio";

const resumen = (b: PortfolioBackup) =>
  `${b.transacciones.length} movimientos · ${b.plazosFijos.length} plazos fijos · ${b.fondosComunes.length} FCI`;

/**
 * Se muestra cuando la cuenta y este dispositivo tienen portfolios distintos y
 * el dispositivo todavía no adoptó el de la cuenta (primera sync o primer
 * login acá). El usuario elige cuál conservar; la otra copia se pisa.
 */
export default function SyncConflictModal({
  conflicto,
  onResolver,
}: {
  conflicto: ConflictoSync;
  onResolver: (eleccion: "cuenta" | "local") => void;
}) {
  return (
    <Modal
      titulo="¿Qué portfolio conservamos?"
      subtitulo="Tu cuenta y este dispositivo tienen portfolios distintos. La copia que no elijas se reemplaza."
      onClose={() => onResolver("cuenta")}
    >
      <div className="space-y-3 text-sm">
        <div className="border border-finanzar-border rounded-md p-4 bg-finanzar-bg">
          <p className="font-semibold text-finanzar-primary">El de tu cuenta</p>
          <p className="text-xs text-finanzar-textSecondary mt-1">{resumen(conflicto.cuenta)}</p>
          <p className="text-[11px] text-finanzar-textMuted mt-1">Es lo que ven tus otros dispositivos. Se baja acá y reemplaza lo local.</p>
        </div>
        <div className="border border-finanzar-border rounded-md p-4 bg-finanzar-bg">
          <p className="font-semibold text-finanzar-primary">El de este dispositivo</p>
          <p className="text-xs text-finanzar-textSecondary mt-1">{resumen(conflicto.local)}</p>
          <p className="text-[11px] text-finanzar-textMuted mt-1">Se sube a la cuenta y reemplaza lo que había en ella.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <BotonPrimario onClick={() => onResolver("cuenta")}>Usar el de la cuenta</BotonPrimario>
          <BotonSecundario onClick={() => onResolver("local")}>Reemplazar con el de este dispositivo</BotonSecundario>
        </div>
      </div>
    </Modal>
  );
}
