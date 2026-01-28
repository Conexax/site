import React, { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DatePicker = React.forwardRef(({ value, onChange, disabled, placeholder = "Selecione uma data" }, ref) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [inputValue, setInputValue] = useState(value ? formatDateForInput(value) : "");
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [error, setError] = useState("");

  function formatDateForInput(date) {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function parseInputDate(input) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = input.match(regex);
    if (!match) return null;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day) return null; // Valida dias inválidos (ex: 31/02)

    return date.toISOString().split("T")[0];
  }

  const handleInputChange = (e) => {
    const input = e.target.value;
    setInputValue(input);
    setError("");

    if (input.length === 10) {
      const parsed = parseInputDate(input);
      if (parsed) {
        onChange(parsed);
        setCurrentMonth(new Date(parsed));
      } else {
        setError("Data inválida. Use DD/MM/AAAA");
      }
    }
  };

  const handleDateClick = (date) => {
    const isoDate = date.toISOString().split("T")[0];
    onChange(isoDate);
    setInputValue(formatDateForInput(isoDate));
    setShowCalendar(false);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysArray = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const monthName = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength="10"
          className={cn(
            "pr-10",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          onFocus={() => !disabled && setShowCalendar(true)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          onClick={() => setShowCalendar(!showCalendar)}
          disabled={disabled}
        >
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {showCalendar && !disabled && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-4 w-64">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm capitalize">{monthName}</h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((date, idx) => (
              <button
                key={idx}
                onClick={() => date && handleDateClick(date)}
                disabled={!date}
                className={cn(
                  "h-8 text-sm rounded transition-colors",
                  !date && "invisible",
                  date && value === date.toISOString().split("T")[0] 
                    ? "bg-[#355340] text-white font-semibold" 
                    : date 
                    ? "hover:bg-slate-100 text-slate-800 cursor-pointer"
                    : ""
                )}
              >
                {date?.getDate()}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="w-full mt-3 text-xs"
            onClick={() => setShowCalendar(false)}
          >
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
});

DatePicker.displayName = "DatePicker";
export default DatePicker;