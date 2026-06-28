import { useSession } from "../App";
import { IdentityGate } from "../components/IdentityGate";
import { NeedForm } from "../components/NeedForm";
import { t } from "../i18n";

/** Publicar una necesidad: exige identidad ligera y luego muestra el formulario (US1). */
export function PublishPage({ onPublished }: { onPublished?: () => void }) {
  const { identityId, loading } = useSession();

  return (
    <div className="container">
      {loading ? (
        <p className="muted">{t.common.loading}</p>
      ) : identityId ? (
        <NeedForm onPublished={onPublished} />
      ) : (
        <IdentityGate />
      )}
    </div>
  );
}
