import { BirthDataForm } from "@/components/forms/birth-data-form";

export function ChartNewPage() {
  return (
    <div className="flex items-center justify-center min-h-full py-phi-7 px-phi-4">
      <div className="w-full max-w-[480px]">
        <div className="bg-card border border-border rounded-lg p-phi-5">
          <h1 className="text-2xl font-semibold text-foreground mb-phi-4">New Chart</h1>
          <BirthDataForm />
        </div>
      </div>
    </div>
  );
}
