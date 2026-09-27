export function ExerciseCatalogAttribution() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Exercise data by{" "}
      <a
        href="https://repdb.co"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        RepDB (repdb.co)
      </a>
      . Imported exercise demonstrations and metadata may include third-party catalog content;
      where required by the content provider, attribution is shown alongside those exercises in
      member workout views.
    </p>
  );
}
