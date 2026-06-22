"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ProductOption {
  id:        string;
  name:      string;
  sku?:      string | null;
  brandName?: string | null;
}

interface ProductComboboxProps {
  products:     ProductOption[];
  value:        string;
  onChange:     (id: string) => void;
  placeholder?: string;
  disabled?:    boolean;
  className?:   string;
  /** Pass "sm" to get a compact h-8 trigger (used inside PO line item rows) */
  size?:        "default" | "sm";
}

export function ProductCombobox({
  products,
  value,
  onChange,
  placeholder = "Select product…",
  disabled,
  className,
  size = "default",
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            size === "sm" ? "h-8 text-sm px-2" : "h-9",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        side="bottom"
      >
        <Command
          filter={(itemValue, search) => {
            const product = products.find((p) => p.id === itemValue);
            if (!product) return 0;
            const haystack = [product.name, product.sku, product.brandName]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name, SKU, or brand…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={(id) => {
                    onChange(id === value ? "" : id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4 shrink-0",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{p.name}</div>
                    {(p.sku || p.brandName) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {[p.brandName, p.sku].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
