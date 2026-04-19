import { BirthDataForm } from "@/components/forms/birth-data-form";

export function ChartNewPage() {
  return (
    <div className="flex items-start tablet:items-center justify-center min-h-full px-pad py-pad tablet:px-pad-lg tablet:py-pad-lg">
      <div className="w-full max-w-full tablet:max-w-[480px] desktop:max-w-[560px]">
        <div className="bg-card border border-border rounded-lg p-card-pad tablet:p-pad-lg">
          <h1 className="text-2xl font-semibold text-foreground mb-gap">New Chart</h1>
          <BirthDataForm />
        </div>
      </div>
    </div>
  );
}
