export function Placeholder({
  title,
  description = "This section is part of a later phase. No data yet.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>
    </div>
  );
}
