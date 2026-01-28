import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    if (!isActive) {
      onSort({ key: sortKey, direction: "asc" });
    } else if (direction === "asc") {
      onSort({ key: sortKey, direction: "desc" });
    } else {
      onSort({ key: null, direction: null });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="h-8 px-2 font-medium hover:bg-slate-100"
    >
      {label}
      {!isActive && <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-slate-400" />}
      {isActive && direction === "asc" && <ArrowUp className="ml-2 h-3.5 w-3.5 text-[#355340]" />}
      {isActive && direction === "desc" && <ArrowDown className="ml-2 h-3.5 w-3.5 text-[#355340]" />}
    </Button>
  );
}