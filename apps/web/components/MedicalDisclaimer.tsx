export function MedicalDisclaimer({
  className = "text-gray-500",
}: {
  className?: string;
}) {
  return (
    <p className={`text-sm ${className}`}>
      VitaScan is for education only and does not provide a diagnosis. For
      emergencies, call local emergency services.
    </p>
  );
}
