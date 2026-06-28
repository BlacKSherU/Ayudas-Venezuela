import { useSession } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { NeedForm } from "../components/NeedForm";
import { t } from "../i18n";

/** Publicar una necesidad: exige identidad ligera y luego muestra el formulario (US1). */
export function PublishPage({ onPublished }: { onPublished?: () => void }) {
  const { identityId, loading } = useSession();

  if (loading) return <div className="container"><p className="muted">{t.common.loading}</p></div>;
  if (!identityId) return <LoginPrompt action="publicar una necesidad" />;
  return (
    <div className="container">
      <NeedForm onPublished={onPublished} />
    </div>
  );
}
