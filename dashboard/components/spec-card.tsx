import type { SpecData } from "@/lib/types";

export function SpecCard({ data }: { data: SpecData | null }) {
  if (!data) return null;

  return (
    <div className="pb-3 mb-1 border-b border-[#313244]/60">
      <h2 className="text-lg font-bold text-[#cba6f7] leading-tight">
        {data.name}
      </h2>
      <p className="text-sm text-[#9399b2] mt-0.5 leading-snug">
        {data.description}
      </p>
    </div>
  );
}
