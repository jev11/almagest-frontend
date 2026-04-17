import { BirthDataForm } from "@/components/forms/birth-data-form";

export function ChartNewPage() {
  return (
    <div className="flex items-center justify-center min-h-full py-16 px-gap">
      <div className="w-full max-w-[480px]">
        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-foreground mb-gap">New Chart</h1>
          <BirthDataForm />
        </div>
      </div>
    </div>
  );
}
